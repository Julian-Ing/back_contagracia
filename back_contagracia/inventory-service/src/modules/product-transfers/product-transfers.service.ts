import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { TenantContextService, getNextConsecutive, moveStock, recalculateAverageCost } from '@contagracia/shared-modules';
import { CreateProductTransferDto } from './dto';

export interface ProductTransfersQueryParams {
  search?: string;
  page?: number;
  limit?: number;
  status?: string;
  product_id?: string;
}

@Injectable()
export class ProductTransfersService {
  constructor(private readonly tenantContext: TenantContextService) {}

  private async getTenantDb(companyId: string) {
    const tenantDb = await this.tenantContext.getTenantClient(companyId);
    if (!tenantDb) throw new NotFoundException('Empresa no encontrada o inactiva');
    return tenantDb;
  }

  /**
   * Listar transferencias que involucren un producto (o su grupo familiar)
   */
  async findAll(companyId: string, params: ProductTransfersQueryParams) {
    const tenantDb = await this.getTenantDb(companyId);
    const { search, page = 1, limit = 10, status, product_id } = params;

    // Si se filtra por producto, buscar su grupo familiar (padre + combinaciones)
    let familyProductIds: string[] | undefined;
    if (product_id) {
      const product = await tenantDb.product.findUnique({
        where: { id: product_id },
        select: { id: true, parent_product_id: true },
      });
      if (!product) throw new NotFoundException('Producto no encontrado');

      // El padre es él mismo si no tiene parent, o su parent
      const parentId = product.parent_product_id || product.id;
      const siblings = await tenantDb.product.findMany({
        where: { OR: [{ id: parentId }, { parent_product_id: parentId }] },
        select: { id: true },
      });
      familyProductIds = siblings.map((s: any) => s.id);
    }

    // Construir where
    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (familyProductIds) {
      where.items = { some: { product_id: { in: familyProductIds } } };
    }

    if (search) {
      const searchPattern = `%${search}%`;
      // Fuzzy search por consecutivo, razón, o nombre de producto en items
      const matchingIds = await tenantDb.$queryRaw<Array<{ id: string }>>`
        SELECT DISTINCT pt."id"
        FROM "product_transfers" pt
        LEFT JOIN "product_transfer_items" pti ON pti."transfer_id" = pt."id"
        LEFT JOIN "products" p ON p."id" = pti."product_id"
        WHERE (
          pt."consecutive" ILIKE ${searchPattern}
          OR COALESCE(pt."reason", '') ILIKE ${searchPattern}
          OR p."name" ILIKE ${searchPattern}
          OR p."consecutive" ILIKE ${searchPattern}
          OR word_similarity(${search}, pt."consecutive") > 0.3
          OR word_similarity(${search}, COALESCE(pt."reason", '')) > 0.3
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
      tenantDb.productTransfer.findMany({
        where,
        include: {
          items: {
            include: {
              product: { select: { id: true, name: true, consecutive: true, barcode: true } },
              storage: { select: { id: true, name: true, warehouse: { select: { name: true } } } },
            },
          },
          requested_by_user: { select: { id: true, full_name: true } },
          approved_by_user: { select: { id: true, full_name: true } },
          rejected_by_user: { select: { id: true, full_name: true } },
        },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      tenantDb.productTransfer.count({ where }),
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

    const transfer = await tenantDb.productTransfer.findUnique({
      where: { id: transferId },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, consecutive: true, barcode: true } },
            storage: { select: { id: true, name: true, warehouse: { select: { name: true } } } },
          },
        },
        requested_by_user: { select: { id: true, full_name: true } },
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
  async create(companyId: string, tenantUserId: string, dto: CreateProductTransferDto) {
    const tenantDb = await this.getTenantDb(companyId);
    const hasInventoryManagement = await this.tenantContext.hasModule(companyId, 'inventory_management');

    // Validar que hay al menos 1 IN y 1 OUT
    const outItems = dto.items.filter((i) => i.direction === 'OUT');
    const inItems = dto.items.filter((i) => i.direction === 'IN');
    if (outItems.length === 0) throw new BadRequestException('Debe haber al menos una línea de salida (OUT)');
    if (inItems.length === 0) throw new BadRequestException('Debe haber al menos una línea de entrada (IN)');

    // Obtener todos los productos referenciados
    const productIds = [...new Set(dto.items.map((i) => i.product_id))];
    const products = await tenantDb.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, is_active: true, is_service: true, parent_product_id: true, mode: true, stock: true },
    });

    if (products.length !== productIds.length) {
      throw new BadRequestException('Uno o más productos no encontrados');
    }

    // Validar que todos están activos
    const inactive = products.find((p: any) => !p.is_active);
    if (inactive) throw new BadRequestException(`El producto "${inactive.name}" está inactivo`);

    // Validar que ninguno es servicio
    const service = products.find((p: any) => p.is_service);
    if (service) throw new BadRequestException(`"${service.name}" es un servicio, no se puede transferir stock`);

    // Validar que total salidas = total entradas
    const totalOut = outItems.reduce((sum, i) => sum + i.quantity, 0);
    const totalIn = inItems.reduce((sum, i) => sum + i.quantity, 0);
    if (totalOut !== totalIn) {
      throw new BadRequestException(`El total de salidas (${totalOut}) debe ser igual al total de entradas (${totalIn})`);
    }

    // Validar que todos pertenecen al mismo grupo familiar
    const parentIds = new Set(
      products.map((p: any) => p.parent_product_id || p.id),
    );
    if (parentIds.size > 1) {
      throw new BadRequestException('Todos los productos deben pertenecer al mismo grupo (padre + combinaciones)');
    }

    // Validar que no se transfiere de un producto a sí mismo con misma bodega
    for (const outItem of outItems) {
      for (const inItem of inItems) {
        if (outItem.product_id === inItem.product_id && (outItem.storage_id || null) === (inItem.storage_id || null)) {
          const p = products.find((pr: any) => pr.id === outItem.product_id);
          throw new BadRequestException(`No se puede transferir de "${p?.name}" a sí mismo en la misma bodega`);
        }
      }
    }

    // Si tiene inventory_management, storage_id es obligatorio por línea
    if (hasInventoryManagement) {
      const missingStorage = dto.items.find((i) => !i.storage_id);
      if (missingStorage) {
        throw new BadRequestException('storage_id es requerido en cada línea cuando la empresa tiene manejo de inventario');
      }
    }

    // Validar stock disponible para líneas OUT
    if (hasInventoryManagement) {
      // Agrupar por producto+bodega
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
          const [productId] = key.split('::');
          const p = products.find((pr: any) => pr.id === productId);
          throw new BadRequestException(
            `Stock insuficiente para "${p?.name}": disponible ${available}, solicitado ${totalQty}`,
          );
        }
      }
    } else {
      // Sin inventory_management: validar por Product.stock
      const outByProduct = new Map<string, number>();
      for (const item of outItems) {
        outByProduct.set(item.product_id, (outByProduct.get(item.product_id) || 0) + item.quantity);
      }

      for (const [productId, totalQty] of outByProduct) {
        const p = products.find((pr: any) => pr.id === productId);
        const available = Number(p?.stock ?? 0);
        if (totalQty > available) {
          throw new BadRequestException(
            `Stock insuficiente para "${p?.name}": disponible ${available}, solicitado ${totalQty}`,
          );
        }
      }
    }

    // Crear transferencia dentro de transacción
    return tenantDb.$transaction(async (tx: any) => {
      const consecutive = await getNextConsecutive(tx, 'product_transfer');

      const transferDate = dto.date ? new Date(dto.date + 'T00:00:00') : new Date();

      const transfer = await tx.productTransfer.create({
        data: {
          consecutive,
          reason: dto.reason,
          date: transferDate,
          status: 'PENDING',
          requested_by: tenantUserId,
          items: {
            create: dto.items.map((item) => ({
              product_id: item.product_id,
              storage_id: item.storage_id || null,
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
          requested_by_user: { select: { id: true, full_name: true } },
        },
      });

      return this.mapTransfer(transfer);
    });
  }

  /**
   * Aprobar transferencia — mueve stock con moveStock para cada línea, todo en una transacción
   */
  async approve(companyId: string, tenantUserId: string, transferId: string) {
    const tenantDb = await this.getTenantDb(companyId);
    const hasInventoryManagement = await this.tenantContext.hasModule(companyId, 'inventory_management');

    return tenantDb.$transaction(async (tx: any) => {
      // Cargar transferencia con lock
      const transfer = await tx.productTransfer.findUnique({
        where: { id: transferId },
        include: { items: true },
      });

      if (!transfer) throw new NotFoundException('Transferencia no encontrada');
      if (transfer.status !== 'PENDING') {
        throw new BadRequestException(`La transferencia ya fue ${transfer.status === 'APPROVED' ? 'aprobada' : 'rechazada'}`);
      }

      // Cargar costo de los productos OUT para el recálculo de promedio
      const outItems = transfer.items.filter((i: any) => i.direction === 'OUT');
      const outProductIds = [...new Set(outItems.map((i: any) => i.product_id))];
      const outProducts = await tx.product.findMany({
        where: { id: { in: outProductIds } },
        select: { id: true, cost: true },
      });
      const outCostMap = new Map<string, number>(outProducts.map((p: any) => [p.id, Number(p.cost)]));

      // Cargar stock ANTES de mover para los productos IN (para recálculo de promedio)
      const inItems = transfer.items.filter((i: any) => i.direction === 'IN');
      const inProductIds = [...new Set(inItems.map((i: any) => i.product_id))];
      const inProducts = await tx.product.findMany({
        where: { id: { in: inProductIds } },
        select: { id: true, stock: true, cost: true, costing_type: true },
      });
      const inProductMap = new Map<string, { stock: number; cost: number; costing_type: string }>(
        inProducts.map((p: any) => [p.id, { stock: Number(p.stock), cost: Number(p.cost), costing_type: p.costing_type }]),
      );

      // Ejecutar moveStock para cada item
      for (const item of transfer.items) {
        await moveStock({
          tx,
          productId: item.product_id,
          direction: item.direction as 'IN' | 'OUT',
          quantity: Number(item.quantity),
          typeKey: 'product_transfer',
          storageId: item.storage_id,
          referenceId: transfer.id,
          referenceConsecutive: transfer.consecutive,
          notes: transfer.reason || `Transferencia ${transfer.consecutive}`,
          date: transfer.date,
          hasInventoryManagement,
          userId: null, // Operación de sistema al aprobar — la validación de acceso se hizo al crear
        });
      }

      // Recalcular costo promedio para productos IN con costing_type AVERAGE
      // El costo entrante es el promedio ponderado de todos los OUT
      const totalOutQuantity = outItems.reduce((sum: number, i: any) => sum + Number(i.quantity), 0);
      const totalOutValue = outItems.reduce((sum: number, i: any) => {
        const cost = outCostMap.get(i.product_id) ?? 0;
        return sum + Number(i.quantity) * cost;
      }, 0);
      const weightedOutCost = totalOutQuantity > 0 ? totalOutValue / totalOutQuantity : 0;

      for (const item of inItems) {
        const inProduct = inProductMap.get(item.product_id);
        if (!inProduct || inProduct.costing_type !== 'AVERAGE') continue;

        const newCost = recalculateAverageCost({
          currentStock: inProduct.stock,
          currentCost: inProduct.cost,
          incomingQuantity: Number(item.quantity),
          incomingCost: weightedOutCost,
        });

        await tx.product.update({
          where: { id: item.product_id },
          data: { cost: newCost },
        });
      }

      // Marcar como aprobada
      const updated = await tx.productTransfer.update({
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
          requested_by_user: { select: { id: true, full_name: true } },
          approved_by_user: { select: { id: true, full_name: true } },
        },
      });

      return this.mapTransfer(updated);
    });
  }

  /**
   * Rechazar transferencia
   */
  async reject(companyId: string, tenantUserId: string, transferId: string, rejectionReason?: string) {
    const tenantDb = await this.getTenantDb(companyId);

    const transfer = await tenantDb.productTransfer.findUnique({
      where: { id: transferId },
      select: { id: true, status: true },
    });

    if (!transfer) throw new NotFoundException('Transferencia no encontrada');
    if (transfer.status !== 'PENDING') {
      throw new BadRequestException(`La transferencia ya fue ${transfer.status === 'APPROVED' ? 'aprobada' : 'rechazada'}`);
    }

    const updated = await tenantDb.productTransfer.update({
      where: { id: transferId },
      data: {
        status: 'REJECTED',
        rejected_by: tenantUserId,
        rejected_at: new Date(),
        rejection_reason: rejectionReason || null,
      },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, consecutive: true } },
            storage: { select: { id: true, name: true, warehouse: { select: { name: true } } } },
          },
        },
        requested_by_user: { select: { id: true, full_name: true } },
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
      requested_by: t.requested_by_user
        ? { id: t.requested_by_user.id, name: t.requested_by_user.full_name }
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
