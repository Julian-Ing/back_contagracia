import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { TenantContextService, getNextConsecutive, moveStock } from '@contagracia/shared-modules';
import { CreateStorageTransferDto } from './dto';

export interface StorageTransfersQueryParams {
  search?: string;
  page?: number;
  limit?: number;
  status?: string;
}

@Injectable()
export class StorageTransfersService {
  constructor(private readonly tenantContext: TenantContextService) {}

  private async getTenantDb(companyId: string) {
    const tenantDb = await this.tenantContext.getTenantClient(companyId);
    if (!tenantDb) throw new NotFoundException('Empresa no encontrada o inactiva');
    return tenantDb;
  }

  /**
   * Listar transferencias entre bodegas
   */
  async findAll(companyId: string, params: StorageTransfersQueryParams) {
    const tenantDb = await this.getTenantDb(companyId);
    const { search, page = 1, limit = 10, status } = params;

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (search) {
      const searchPattern = `%${search}%`;
      const matchingIds = await tenantDb.$queryRaw<Array<{ id: string }>>`
        SELECT DISTINCT st."id"
        FROM "storage_transfers" st
        LEFT JOIN "storage_transfer_items" sti ON sti."transfer_id" = st."id"
        LEFT JOIN "products" p ON p."id" = sti."product_id"
        LEFT JOIN "storages" s ON s."id" = sti."storage_id"
        LEFT JOIN "warehouses" w ON w."id" = s."warehouse_id"
        WHERE (
          st."consecutive" ILIKE ${searchPattern}
          OR COALESCE(st."reason", '') ILIKE ${searchPattern}
          OR p."name" ILIKE ${searchPattern}
          OR p."consecutive" ILIKE ${searchPattern}
          OR s."name" ILIKE ${searchPattern}
          OR w."name" ILIKE ${searchPattern}
          OR word_similarity(${search}, st."consecutive") > 0.3
          OR word_similarity(${search}, COALESCE(st."reason", '')) > 0.3
          OR word_similarity(${search}, COALESCE(p."name", '')) > 0.3
        )
      `;
      const ids = matchingIds.map((r) => r.id);
      if (ids.length === 0) {
        return { data: [], total: 0, page, limit };
      }
      where.id = { in: ids };
    }

    const [data, total] = await Promise.all([
      tenantDb.storageTransfer.findMany({
        where,
        include: {
          items: {
            include: {
              product: { select: { id: true, name: true, consecutive: true, barcode: true } },
              storage: { select: { id: true, name: true, warehouse: { select: { name: true } } } },
            },
          },
          transferred_by_user: { select: { id: true, full_name: true } },
          approved_by_user: { select: { id: true, full_name: true } },
          rejected_by_user: { select: { id: true, full_name: true } },
        },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      tenantDb.storageTransfer.count({ where }),
    ]);

    return {
      data: data.map((t: any) => this.mapTransfer(t)),
      total,
      page,
      limit,
    };
  }

  /**
   * Detalle de una transferencia
   */
  async findOne(companyId: string, transferId: string) {
    const tenantDb = await this.getTenantDb(companyId);

    const transfer = await tenantDb.storageTransfer.findUnique({
      where: { id: transferId },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, consecutive: true, barcode: true } },
            storage: { select: { id: true, name: true, warehouse: { select: { name: true } } } },
          },
        },
        transferred_by_user: { select: { id: true, full_name: true } },
        approved_by_user: { select: { id: true, full_name: true } },
        rejected_by_user: { select: { id: true, full_name: true } },
      },
    });

    if (!transfer) throw new NotFoundException('Transferencia no encontrada');

    return this.mapTransfer(transfer);
  }

  /**
   * Crear solicitud de transferencia (status PENDING, no mueve stock)
   */
  async create(companyId: string, tenantUserId: string, dto: CreateStorageTransferDto) {
    const tenantDb = await this.getTenantDb(companyId);

    // Validar al menos 1 IN y 1 OUT
    const outItems = dto.items.filter((i) => i.direction === 'OUT');
    const inItems = dto.items.filter((i) => i.direction === 'IN');
    if (outItems.length === 0) throw new BadRequestException('Debe haber al menos una línea de salida (OUT)');
    if (inItems.length === 0) throw new BadRequestException('Debe haber al menos una línea de entrada (IN)');

    // Obtener productos referenciados
    const productIds = [...new Set(dto.items.map((i) => i.product_id))];
    const products = await tenantDb.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, is_active: true, is_service: true },
    });

    if (products.length !== productIds.length) {
      throw new BadRequestException('Uno o más productos no encontrados');
    }

    const inactive = products.find((p: any) => !p.is_active);
    if (inactive) throw new BadRequestException(`El producto "${inactive.name}" está inactivo`);

    const service = products.find((p: any) => p.is_service);
    if (service) throw new BadRequestException(`"${service.name}" es un servicio, no se puede transferir stock`);

    // Validar bodegas existen
    const storageIds = [...new Set(dto.items.map((i) => i.storage_id))];
    const storages = await tenantDb.storage.findMany({
      where: { id: { in: storageIds }, is_active: true },
      select: { id: true, name: true },
    });
    if (storages.length !== storageIds.length) {
      throw new BadRequestException('Una o más bodegas no encontradas o inactivas');
    }

    // Validar que total salidas = total entradas
    const totalOut = outItems.reduce((sum, i) => sum + i.quantity, 0);
    const totalIn = inItems.reduce((sum, i) => sum + i.quantity, 0);
    if (totalOut !== totalIn) {
      throw new BadRequestException(`El total de salidas (${totalOut}) debe ser igual al total de entradas (${totalIn})`);
    }

    // Validar que no se transfiere mismo producto de y a la misma bodega
    for (const outItem of outItems) {
      for (const inItem of inItems) {
        if (outItem.product_id === inItem.product_id && outItem.storage_id === inItem.storage_id) {
          const p = products.find((pr: any) => pr.id === outItem.product_id);
          throw new BadRequestException(`No se puede transferir "${p?.name}" a la misma bodega de origen`);
        }
      }
    }

    // Validar stock disponible para líneas OUT (agrupar por producto+bodega)
    const outByKey = new Map<string, number>();
    for (const item of outItems) {
      const key = `${item.product_id}::${item.storage_id}`;
      outByKey.set(key, (outByKey.get(key) || 0) + item.quantity);
    }

    const storageStocks = await tenantDb.storageStock.findMany({
      where: {
        OR: [...outByKey.keys()].map((key) => {
          const [product_id, storage_id] = key.split('::');
          return { product_id, storage_id };
        }),
      },
      select: { product_id: true, storage_id: true, stock: true },
    });

    const stockMap = new Map<string, number>();
    for (const ss of storageStocks) {
      stockMap.set(`${ss.product_id}::${ss.storage_id}`, Number(ss.stock));
    }

    for (const [key, totalQty] of outByKey) {
      const available = stockMap.get(key) || 0;
      if (totalQty > available) {
        const [productId, storageId] = key.split('::');
        const p = products.find((pr: any) => pr.id === productId);
        const s = storages.find((st: any) => st.id === storageId);
        throw new BadRequestException(
          `Stock insuficiente para "${p?.name}" en bodega "${s?.name}": disponible ${available}, solicitado ${totalQty}`,
        );
      }
    }

    return tenantDb.$transaction(async (tx: any) => {
      const consecutive = await getNextConsecutive(tx, 'storage_transfer');
      const transferDate = dto.date ? new Date(dto.date + 'T00:00:00') : new Date();

      const transfer = await tx.storageTransfer.create({
        data: {
          consecutive,
          reason: dto.reason,
          date: transferDate,
          status: 'PENDING',
          transferred_by: tenantUserId,
          items: {
            create: dto.items.map((item) => ({
              product_id: item.product_id,
              storage_id: item.storage_id,
              direction: item.direction,
              quantity: item.quantity,
            })),
          },
        },
        include: {
          items: {
            include: {
              product: { select: { id: true, name: true, consecutive: true } },
              storage: { select: { id: true, name: true, warehouse: { select: { name: true } } } },
            },
          },
          transferred_by_user: { select: { id: true, full_name: true } },
        },
      });

      return this.mapTransfer(transfer);
    });
  }

  /**
   * Aprobar transferencia — mueve stock por cada línea en una transacción
   */
  async approve(companyId: string, tenantUserId: string, transferId: string) {
    const tenantDb = await this.getTenantDb(companyId);

    return tenantDb.$transaction(async (tx: any) => {
      const transfer = await tx.storageTransfer.findUnique({
        where: { id: transferId },
        include: { items: true },
      });

      if (!transfer) throw new NotFoundException('Transferencia no encontrada');
      if (transfer.status !== 'PENDING') {
        throw new BadRequestException(`La transferencia ya fue ${transfer.status === 'APPROVED' ? 'aprobada' : 'rechazada'}`);
      }

      // Ejecutar moveStock para cada item
      for (const item of transfer.items) {
        await moveStock({
          tx,
          productId: item.product_id,
          direction: item.direction as 'IN' | 'OUT',
          quantity: Number(item.quantity),
          typeKey: 'storage_transfer',
          storageId: item.storage_id,
          referenceId: transfer.id,
          referenceConsecutive: transfer.consecutive,
          notes: transfer.reason || `Transferencia ${transfer.consecutive}`,
          date: transfer.date,
          hasInventoryManagement: true,
          userId: null,
        });
      }

      const updated = await tx.storageTransfer.update({
        where: { id: transferId },
        data: {
          status: 'APPROVED',
          approved_by: tenantUserId,
          approved_at: new Date(),
        },
        include: {
          items: {
            include: {
              product: { select: { id: true, name: true, consecutive: true } },
              storage: { select: { id: true, name: true, warehouse: { select: { name: true } } } },
            },
          },
          transferred_by_user: { select: { id: true, full_name: true } },
          approved_by_user: { select: { id: true, full_name: true } },
        },
      });

      return this.mapTransfer(updated);
    });
  }

  /**
   * Rechazar transferencia
   */
  async reject(companyId: string, tenantUserId: string, transferId: string, rejectionReason: string) {
    const tenantDb = await this.getTenantDb(companyId);

    const transfer = await tenantDb.storageTransfer.findUnique({
      where: { id: transferId },
      select: { id: true, status: true },
    });

    if (!transfer) throw new NotFoundException('Transferencia no encontrada');
    if (transfer.status !== 'PENDING') {
      throw new BadRequestException(`La transferencia ya fue ${transfer.status === 'APPROVED' ? 'aprobada' : 'rechazada'}`);
    }

    const updated = await tenantDb.storageTransfer.update({
      where: { id: transferId },
      data: {
        status: 'REJECTED',
        rejected_by: tenantUserId,
        rejected_at: new Date(),
        rejection_reason: rejectionReason,
      },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, consecutive: true } },
            storage: { select: { id: true, name: true, warehouse: { select: { name: true } } } },
          },
        },
        transferred_by_user: { select: { id: true, full_name: true } },
        rejected_by_user: { select: { id: true, full_name: true } },
      },
    });

    return this.mapTransfer(updated);
  }

  private mapTransfer(t: any) {
    return {
      id: t.id,
      consecutive: t.consecutive,
      reason: t.reason,
      date: t.date,
      status: t.status,
      transferred_by: t.transferred_by_user
        ? { id: t.transferred_by_user.id, name: t.transferred_by_user.full_name }
        : null,
      approved_by: t.approved_by_user
        ? { id: t.approved_by_user.id, name: t.approved_by_user.full_name }
        : null,
      approved_at: t.approved_at,
      rejected_by: t.rejected_by_user
        ? { id: t.rejected_by_user.id, name: t.rejected_by_user.full_name }
        : null,
      rejected_at: t.rejected_at,
      rejection_reason: t.rejection_reason,
      created_at: t.created_at,
      items: (t.items || []).map((item: any) => ({
        id: item.id,
        direction: item.direction,
        quantity: Number(item.quantity),
        product: item.product
          ? { id: item.product.id, name: item.product.name, consecutive: item.product.consecutive, barcode: item.product?.barcode }
          : null,
        storage: item.storage
          ? { id: item.storage.id, name: item.storage.name, warehouse_name: item.storage.warehouse?.name }
          : null,
      })),
    };
  }
}
