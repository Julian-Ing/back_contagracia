import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { TenantContextService, getNextConsecutive } from '@contagracia/shared-modules';
import { CreateWarehouseDto, UpdateWarehouseDto, CreateStorageDto, UpdateStorageDto, AssignUsersDto } from './dto';

export interface WarehousesQueryParams {
  search?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class WarehousesService {
  private readonly logger = new Logger(WarehousesService.name);

  constructor(private readonly tenantContext: TenantContextService) {}

  private async getTenantDb(companyId: string) {
    const tenantDb = await this.tenantContext.getTenantClient(companyId);
    if (!tenantDb) throw new NotFoundException('Empresa no encontrada o inactiva');
    return tenantDb;
  }

  // ────── For select (ligero, fuzzy) ──────

  async findWarehousesForSelect(companyId: string, search?: string) {
    const tenantDb = await this.getTenantDb(companyId);

    if (search) {
      const searchPattern = `%${search}%`;
      return tenantDb.$queryRaw<Array<{ id: string; name: string }>>`
        SELECT "id", "name" FROM "warehouses"
        WHERE "is_active" = true
        AND (
          "name" ILIKE ${searchPattern}
          OR "consecutive" ILIKE ${searchPattern}
          OR word_similarity(${search}, COALESCE("name", '')) > 0.3
        )
        ORDER BY "name" ASC
      `;
    }

    return tenantDb.warehouse.findMany({
      where: { is_active: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  }

  async findStoragesForSelect(companyId: string, warehouseId?: string, search?: string) {
    const tenantDb = await this.getTenantDb(companyId);

    if (search) {
      const searchPattern = `%${search}%`;
      const warehouseFilter = warehouseId
        ? tenantDb.$queryRaw<Array<{ id: string; name: string; consecutive: string; warehouse_id: string; warehouse_name: string; warehouse_consecutive: string }>>`
          SELECT s."id", s."name", s."consecutive", w."id" AS "warehouse_id", w."name" AS "warehouse_name", w."consecutive" AS "warehouse_consecutive"
          FROM "storages" s
          JOIN "warehouses" w ON w."id" = s."warehouse_id"
          WHERE s."is_active" = true AND w."is_active" = true
          AND s."warehouse_id" = ${warehouseId}::uuid
          AND (
            s."name" ILIKE ${searchPattern}
            OR s."consecutive" ILIKE ${searchPattern}
            OR word_similarity(${search}, COALESCE(s."name", '')) > 0.3
          )
          ORDER BY s."name" ASC
        `
        : tenantDb.$queryRaw<Array<{ id: string; name: string; consecutive: string; warehouse_id: string; warehouse_name: string; warehouse_consecutive: string }>>`
          SELECT s."id", s."name", s."consecutive", w."id" AS "warehouse_id", w."name" AS "warehouse_name", w."consecutive" AS "warehouse_consecutive"
          FROM "storages" s
          JOIN "warehouses" w ON w."id" = s."warehouse_id"
          WHERE s."is_active" = true AND w."is_active" = true
          AND (
            s."name" ILIKE ${searchPattern}
            OR s."consecutive" ILIKE ${searchPattern}
            OR word_similarity(${search}, COALESCE(s."name", '')) > 0.3
          )
          ORDER BY w."name" ASC, s."name" ASC
        `;
      return warehouseFilter;
    }

    const where: any = { is_active: true, warehouse: { is_active: true } };
    if (warehouseId) where.warehouse_id = warehouseId;

    const storages = await tenantDb.storage.findMany({
      where,
      select: {
        id: true,
        name: true,
        consecutive: true,
        warehouse: { select: { id: true, name: true, consecutive: true } },
      },
      orderBy: [{ warehouse: { name: 'asc' } }, { name: 'asc' }],
    });

    return storages.map((s: any) => ({
      id: s.id,
      name: s.name,
      consecutive: s.consecutive,
      warehouse_id: s.warehouse.id,
      warehouse_name: s.warehouse.name,
      warehouse_consecutive: s.warehouse.consecutive,
    }));
  }

  // ────── Almacenes ──────

  async findAll(companyId: string, params: WarehousesQueryParams = {}) {
    const tenantDb = await this.getTenantDb(companyId);
    const { search, page = 1, limit = 50 } = params;

    const where: any = { is_active: true };

    if (search) {
      const searchPattern = `%${search}%`;
      const fuzzyMatches = await tenantDb.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "warehouses"
        WHERE "is_active" = true
        AND (
          "name" ILIKE ${searchPattern}
          OR "consecutive" ILIKE ${searchPattern}
          OR word_similarity(${search}, COALESCE("name", '')) > 0.3
        )
      `;
      const matchIds = fuzzyMatches.map((r: any) => r.id);
      if (matchIds.length === 0) {
        return { data: [], total: 0, page, limit, totalPages: 0, hasMore: false };
      }
      where.id = { in: matchIds };
    }

    const [data, total] = await Promise.all([
      tenantDb.warehouse.findMany({
        where,
        include: {
          _count: {
            select: {
              storages: { where: { is_active: true } },
              users: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      tenantDb.warehouse.count({ where }),
    ]);

    return {
      data: data.map((w: any) => ({
        id: w.id,
        consecutive: w.consecutive,
        name: w.name,
        is_principal: w.is_principal,
        storages_count: w._count.storages,
        users_count: w._count.users,
        is_active: w.is_active,
        created_at: w.created_at,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    };
  }

  async findOne(companyId: string, id: string) {
    const tenantDb = await this.getTenantDb(companyId);

    const warehouse = await tenantDb.warehouse.findUnique({
      where: { id },
      include: {
        storages: {
          where: { is_active: true },
          orderBy: { created_at: 'asc' },
          include: {
            _count: {
              select: { storage_stocks: true, movements: true },
            },
          },
        },
        users: {
          include: {
            tenant_user: {
              select: { id: true, full_name: true, email: true },
            },
          },
        },
      },
    });

    if (!warehouse || !warehouse.is_active) {
      throw new NotFoundException('Almacén no encontrado');
    }

    return {
      id: warehouse.id,
      consecutive: warehouse.consecutive,
      name: warehouse.name,
      is_principal: warehouse.is_principal,
      is_active: warehouse.is_active,
      created_at: warehouse.created_at,
      storages: (warehouse as any).storages.map((s: any) => ({
        id: s.id,
        consecutive: s.consecutive,
        name: s.name,
        is_principal: s.is_principal,
        products_count: s._count.storage_stocks,
        movements_count: s._count.movements,
        created_at: s.created_at,
      })),
      users: (warehouse as any).users.map((wu: any) => ({
        id: wu.id,
        tenant_user_id: wu.tenant_user_id,
        full_name: wu.tenant_user.full_name,
        email: wu.tenant_user.email,
        assigned_at: wu.created_at,
      })),
    };
  }

  async create(companyId: string, dto: CreateWarehouseDto) {
    const tenantDb = await this.getTenantDb(companyId);

    return tenantDb.$transaction(async (tx: any) => {
      const existing = await tx.warehouse.findFirst({
        where: { name: dto.name, is_active: true },
      });
      if (existing) throw new ConflictException('Ya existe un almacén con ese nombre');

      const consecutive = await getNextConsecutive(tx, 'warehouse');

      return tx.warehouse.create({
        data: { consecutive, name: dto.name },
      });
    });
  }

  async update(companyId: string, id: string, dto: UpdateWarehouseDto) {
    const tenantDb = await this.getTenantDb(companyId);

    const warehouse = await tenantDb.warehouse.findUnique({ where: { id } });
    if (!warehouse || !warehouse.is_active) throw new NotFoundException('Almacén no encontrado');

    if (dto.name && dto.name !== warehouse.name) {
      const existing = await tenantDb.warehouse.findFirst({
        where: { name: dto.name, is_active: true, id: { not: id } },
      });
      if (existing) throw new ConflictException('Ya existe un almacén con ese nombre');
    }

    return tenantDb.warehouse.update({
      where: { id },
      data: { ...(dto.name !== undefined && { name: dto.name }) },
    });
  }

  async delete(companyId: string, id: string) {
    const tenantDb = await this.getTenantDb(companyId);

    const warehouse = await tenantDb.warehouse.findUnique({
      where: { id },
      include: {
        storages: {
          where: { is_active: true },
          include: { _count: { select: { storage_stocks: true } } },
        },
      },
    });

    if (!warehouse || !warehouse.is_active) throw new NotFoundException('Almacén no encontrado');
    if (warehouse.is_principal) throw new ConflictException('No se puede eliminar el almacén principal');

    const storagesWithStock = (warehouse as any).storages.filter(
      (s: any) => s._count.storage_stocks > 0,
    );
    if (storagesWithStock.length > 0) {
      throw new ConflictException(
        `No se puede eliminar: ${storagesWithStock.length} bodega(s) tienen stock registrado`,
      );
    }

    await tenantDb.$transaction(async (tx: any) => {
      // Desactivar bodegas del almacén
      await tx.storage.updateMany({
        where: { warehouse_id: id, is_active: true },
        data: { is_active: false },
      });
      // Eliminar asignaciones de usuarios
      await tx.warehouseUser.deleteMany({ where: { warehouse_id: id } });
      // Desactivar almacén
      await tx.warehouse.update({ where: { id }, data: { is_active: false } });
    });

    return { message: 'Almacén eliminado' };
  }

  // ────── Bodegas ──────

  async findAllStorages(companyId: string, params: WarehousesQueryParams = {}) {
    const tenantDb = await this.getTenantDb(companyId);
    const { search, page = 1, limit = 50 } = params;

    const where: any = { is_active: true, warehouse: { is_active: true } };

    if (search) {
      const searchPattern = `%${search}%`;
      const fuzzyMatches = await tenantDb.$queryRaw<Array<{ id: string }>>`
        SELECT s."id" FROM "storages" s
        JOIN "warehouses" w ON w."id" = s."warehouse_id"
        WHERE s."is_active" = true AND w."is_active" = true
        AND (
          s."name" ILIKE ${searchPattern}
          OR s."consecutive" ILIKE ${searchPattern}
          OR w."name" ILIKE ${searchPattern}
          OR w."consecutive" ILIKE ${searchPattern}
          OR word_similarity(${search}, COALESCE(s."name", '') || ' ' || COALESCE(w."name", '')) > 0.3
        )
      `;
      const matchIds = fuzzyMatches.map((r: any) => r.id);
      if (matchIds.length === 0) {
        return { data: [], total: 0, page, limit, totalPages: 0, hasMore: false };
      }
      where.id = { in: matchIds };
    }

    const [data, total] = await Promise.all([
      tenantDb.storage.findMany({
        where,
        include: {
          warehouse: { select: { id: true, name: true, consecutive: true } },
          _count: { select: { storage_stocks: true } },
        },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      tenantDb.storage.count({ where }),
    ]);

    return {
      data: data.map((s: any) => ({
        id: s.id,
        consecutive: s.consecutive,
        name: s.name,
        is_principal: s.is_principal,
        warehouse_id: s.warehouse.id,
        warehouse_name: s.warehouse.name,
        warehouse_consecutive: s.warehouse.consecutive,
        products_count: s._count.storage_stocks,
        created_at: s.created_at,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    };
  }

  async createStorage(companyId: string, warehouseId: string, dto: CreateStorageDto) {
    const tenantDb = await this.getTenantDb(companyId);

    return tenantDb.$transaction(async (tx: any) => {
      const warehouse = await tx.warehouse.findUnique({ where: { id: warehouseId } });
      if (!warehouse || !warehouse.is_active) throw new NotFoundException('Almacén no encontrado');

      const existing = await tx.storage.findFirst({
        where: { warehouse_id: warehouseId, name: dto.name, is_active: true },
      });
      if (existing) throw new ConflictException('Ya existe una bodega con ese nombre en este almacén');

      const consecutive = await getNextConsecutive(tx, 'storage');

      return tx.storage.create({
        data: { consecutive, name: dto.name, warehouse_id: warehouseId },
      });
    });
  }

  async updateStorage(companyId: string, storageId: string, dto: UpdateStorageDto) {
    const tenantDb = await this.getTenantDb(companyId);

    const storage = await tenantDb.storage.findUnique({ where: { id: storageId } });
    if (!storage || !storage.is_active) throw new NotFoundException('Bodega no encontrada');

    if (dto.name && dto.name !== storage.name) {
      const existing = await tenantDb.storage.findFirst({
        where: { warehouse_id: storage.warehouse_id, name: dto.name, is_active: true, id: { not: storageId } },
      });
      if (existing) throw new ConflictException('Ya existe una bodega con ese nombre en este almacén');
    }

    return tenantDb.storage.update({
      where: { id: storageId },
      data: { ...(dto.name !== undefined && { name: dto.name }) },
    });
  }

  async deleteStorage(companyId: string, storageId: string) {
    const tenantDb = await this.getTenantDb(companyId);

    const storage = await tenantDb.storage.findUnique({
      where: { id: storageId },
      include: { _count: { select: { storage_stocks: true } } },
    });

    if (!storage || !storage.is_active) throw new NotFoundException('Bodega no encontrada');
    if (storage.is_principal) throw new ConflictException('No se puede eliminar la bodega principal');

    if ((storage as any)._count.storage_stocks > 0) {
      throw new ConflictException('No se puede eliminar: la bodega tiene stock registrado');
    }

    await tenantDb.storage.update({
      where: { id: storageId },
      data: { is_active: false },
    });

    return { message: 'Bodega eliminada' };
  }

  // ────── Usuarios de Almacén ──────

  async assignUsers(companyId: string, warehouseId: string, dto: AssignUsersDto) {
    const tenantDb = await this.getTenantDb(companyId);

    const warehouse = await tenantDb.warehouse.findUnique({ where: { id: warehouseId } });
    if (!warehouse || !warehouse.is_active) throw new NotFoundException('Almacén no encontrado');

    // Filtrar los que ya están asignados
    const existing = await tenantDb.warehouseUser.findMany({
      where: { warehouse_id: warehouseId, tenant_user_id: { in: dto.tenant_user_ids } },
    });
    const existingIds = new Set(existing.map((e: any) => e.tenant_user_id));
    const newIds = dto.tenant_user_ids.filter((id: string) => !existingIds.has(id));

    if (newIds.length === 0) {
      return { message: 'Todos los usuarios ya estaban asignados', assigned: 0 };
    }

    await tenantDb.warehouseUser.createMany({
      data: newIds.map((tenant_user_id: string) => ({
        warehouse_id: warehouseId,
        tenant_user_id,
      })),
    });

    return { message: `${newIds.length} usuario(s) asignado(s)`, assigned: newIds.length };
  }

  async removeUser(companyId: string, warehouseId: string, tenantUserId: string) {
    const tenantDb = await this.getTenantDb(companyId);

    const assignment = await tenantDb.warehouseUser.findFirst({
      where: { warehouse_id: warehouseId, tenant_user_id: tenantUserId },
    });
    if (!assignment) throw new NotFoundException('El usuario no está asignado a este almacén');

    await tenantDb.warehouseUser.delete({ where: { id: assignment.id } });

    return { message: 'Usuario desasignado del almacén' };
  }

  // ────── Ensure Principal (interno) ──────

  async ensurePrincipal(companyId: string) {
    const tenantDb = await this.getTenantDb(companyId);

    return tenantDb.$transaction(async (tx: any) => {
      // 1. Buscar o crear almacén principal
      let warehouse = await tx.warehouse.findFirst({
        where: { is_principal: true, is_active: true },
        include: { storages: { where: { is_principal: true, is_active: true }, take: 1 } },
      });

      let storage: any;
      let created = false;

      if (warehouse && warehouse.storages.length > 0) {
        storage = warehouse.storages[0];
        this.logger.log(`Almacén principal ya existe para empresa ${companyId}, sincronizando stock...`);
      } else {
        created = true;

        if (!warehouse) {
          const warehouseConsecutive = await getNextConsecutive(tx, 'warehouse');
          warehouse = await tx.warehouse.create({
            data: {
              consecutive: warehouseConsecutive,
              name: 'Principal',
              is_principal: true,
            },
          });
        }

        const storageConsecutive = await getNextConsecutive(tx, 'storage');
        storage = await tx.storage.create({
          data: {
            consecutive: storageConsecutive,
            name: 'Principal',
            is_principal: true,
            warehouse_id: warehouse.id,
          },
        });

        // Asignar todos los usuarios activos al almacén
        const activeUsers = await tx.tenantUser.findMany({
          where: { is_active: true },
          select: { id: true },
        });

        if (activeUsers.length > 0) {
          // Evitar duplicados si el warehouse ya existía
          const existingAssignments = await tx.warehouseUser.findMany({
            where: { warehouse_id: warehouse.id },
            select: { tenant_user_id: true },
          });
          const assignedSet = new Set(existingAssignments.map((a: any) => a.tenant_user_id));
          const newUsers = activeUsers.filter((u: any) => !assignedSet.has(u.id));

          if (newUsers.length > 0) {
            await tx.warehouseUser.createMany({
              data: newUsers.map((u: any) => ({
                warehouse_id: warehouse.id,
                tenant_user_id: u.id,
              })),
            });
          }
        }
      }

      // 2. Sincronizar stock: diferencia entre Product.stock y SUM(StorageStock)
      const productsWithStock = await tx.product.findMany({
        where: { is_service: false, stock: { gt: 0 } },
        select: { id: true, stock: true },
      });

      if (productsWithStock.length > 0) {
        // Sumar stock distribuido por producto en TODAS las bodegas
        const stockByProduct = await tx.storageStock.groupBy({
          by: ['product_id'],
          where: {
            product_id: { in: productsWithStock.map((p: any) => p.id) },
          },
          _sum: { stock: true },
        });

        const distributedMap = new Map<string, number>();
        for (const row of stockByProduct) {
          distributedMap.set(row.product_id, Number(row._sum.stock) || 0);
        }

        // Calcular diferencia por producto
        const toUpsert: Array<{ product_id: string; diff: number }> = [];
        for (const p of productsWithStock) {
          const distributed = distributedMap.get(p.id) || 0;
          const diff = Number(p.stock) - distributed;
          if (diff !== 0) {
            toUpsert.push({ product_id: p.id, diff });
          }
        }

        // Aplicar diferencias en la bodega principal (upsert)
        for (const item of toUpsert) {
          const existing = await tx.storageStock.findUnique({
            where: { product_id_storage_id: { product_id: item.product_id, storage_id: storage.id } },
          });

          if (existing) {
            const newStock = Number(existing.stock) + item.diff;
            if (newStock > 0) {
              await tx.storageStock.update({
                where: { id: existing.id },
                data: { stock: newStock },
              });
            } else if (newStock === 0) {
              await tx.storageStock.delete({ where: { id: existing.id } });
            }
            // Si newStock < 0 no hacemos nada (inconsistencia, no empeorar)
          } else if (item.diff > 0) {
            await tx.storageStock.create({
              data: { product_id: item.product_id, storage_id: storage.id, stock: item.diff },
            });
          }
        }

        this.logger.log(
          `Sync stock empresa ${companyId}: ${toUpsert.length} productos ajustados de ${productsWithStock.length} con stock`,
        );
      }

      return {
        message: created ? 'Almacén principal creado' : 'Stock sincronizado',
        warehouse_id: warehouse.id,
        storage_id: storage.id,
      };
    });
  }

  // ────── Storages del usuario actual ──────

  async getUserStorages(companyId: string, tenantUserId: string) {
    const tenantDb = await this.getTenantDb(companyId);

    const assignments = await tenantDb.warehouseUser.findMany({
      where: { tenant_user_id: tenantUserId },
      include: {
        warehouse: {
          include: {
            storages: {
              where: { is_active: true },
              orderBy: { created_at: 'asc' },
              select: { id: true, consecutive: true, name: true },
            },
          },
        },
      },
    });

    // Solo almacenes activos con sus bodegas
    return assignments
      .filter((a: any) => a.warehouse.is_active)
      .map((a: any) => ({
        warehouse_id: a.warehouse.id,
        warehouse_name: a.warehouse.name,
        warehouse_consecutive: a.warehouse.consecutive,
        storages: a.warehouse.storages,
      }));
  }
}
