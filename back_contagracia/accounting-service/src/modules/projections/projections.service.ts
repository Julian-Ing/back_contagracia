import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { TenantContextService, getNextConsecutive } from '@contagracia/shared-modules';
import { CreateProjectionDto, UpdateProjectionDto } from './dto';

export interface ProjectionsQueryParams {
  search?: string;
  page?: number;
  limit?: number;
  scope?: 'GLOBAL' | 'COST_CENTER';
  cost_center_id?: string;
}

@Injectable()
export class ProjectionsService {
  constructor(private readonly tenantContext: TenantContextService) {}

  private async getTenantDb(companyId: string) {
    const tenantDb = await this.tenantContext.getTenantClient(companyId);
    if (!tenantDb) {
      throw new NotFoundException('Empresa no encontrada o inactiva');
    }
    return tenantDb;
  }

  async getMovementTypes(companyId: string): Promise<{ key: string; name: string; nature: string }[]> {
    const tenantDb = await this.getTenantDb(companyId);
    const types = await tenantDb.costCenterMovementType.findMany({ orderBy: { key: 'asc' } });
    return types.map((t: any) => ({ key: t.key, name: t.name, nature: t.nature }));
  }

  async findAll(companyId: string, params: ProjectionsQueryParams = {}) {
    const tenantDb = await this.getTenantDb(companyId);
    const { search, page = 1, limit = 50, scope, cost_center_id } = params;

    const where: any = {};

    if (scope) {
      where.scope = scope;
    }
    if (cost_center_id) {
      where.cost_center_id = cost_center_id;
    }

    if (search) {
      const pattern = `%${search}%`;
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { consecutive: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      tenantDb.projection.findMany({
        where,
        include: {
          cost_center: { select: { id: true, name: true, consecutive: true } },
          parent: { select: { id: true, name: true, consecutive: true } },
          _count: { select: { items: true, children: true } },
        },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      tenantDb.projection.count({ where }),
    ]);

    return {
      data: data.map((p: any) => ({
        id: p.id,
        consecutive: p.consecutive,
        name: p.name,
        description: p.description,
        scope: p.scope,
        include_sub_centers: p.include_sub_centers,
        cost_center: p.cost_center,
        parent: p.parent,
        start_date: p.start_date,
        end_date: p.end_date,
        items_count: p._count.items,
        children_count: p._count.children,
        created_at: p.created_at,
        updated_at: p.updated_at,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    };
  }

  async findOne(companyId: string, id: string): Promise<any> {
    const tenantDb = await this.getTenantDb(companyId);

    const projection = await tenantDb.projection.findUnique({
      where: { id },
      include: {
        cost_center: { select: { id: true, name: true, consecutive: true } },
        parent: { select: { id: true, name: true, consecutive: true } },
        children: {
          select: { id: true, name: true, consecutive: true, start_date: true, end_date: true },
          orderBy: { start_date: 'asc' },
        },
        items: {
          include: { type: { select: { key: true, name: true } } },
          orderBy: { type_key: 'asc' },
        },
      },
    });

    if (!projection) {
      throw new NotFoundException('Proyección no encontrada');
    }

    return projection;
  }

  async create(companyId: string, dto: CreateProjectionDto) {
    const tenantDb = await this.getTenantDb(companyId);

    // Validaciones previas
    if (dto.scope === 'COST_CENTER' && !dto.cost_center_id) {
      throw new BadRequestException('cost_center_id es requerido cuando scope es COST_CENTER');
    }
    if (dto.scope === 'GLOBAL' && dto.cost_center_id) {
      throw new BadRequestException('cost_center_id no debe enviarse cuando scope es GLOBAL');
    }

    const startDate = new Date(dto.start_date);
    const endDate = new Date(dto.end_date);
    if (startDate >= endDate) {
      throw new BadRequestException('start_date debe ser anterior a end_date');
    }

    return tenantDb.$transaction(async (tx: any) => {
      // Validar centro de costos si aplica
      if (dto.cost_center_id) {
        const costCenter = await tx.costCenter.findUnique({ where: { id: dto.cost_center_id } });
        if (!costCenter) {
          throw new NotFoundException('Centro de costos no encontrado');
        }
      }

      // Validar padre si aplica
      if (dto.parent_id) {
        const parent = await tx.projection.findUnique({ where: { id: dto.parent_id } });
        if (!parent) {
          throw new NotFoundException('Proyección padre no encontrada');
        }
        // Fechas del hijo deben estar dentro del padre
        if (startDate < parent.start_date || endDate > parent.end_date) {
          throw new BadRequestException(
            'Las fechas de la sub-proyección deben estar dentro del rango del padre',
          );
        }
      }

      // Validar type_keys de items
      if (dto.items && dto.items.length > 0) {
        const typeKeys = dto.items.map((i) => i.type_key);
        const uniqueKeys = new Set(typeKeys);
        if (uniqueKeys.size !== typeKeys.length) {
          throw new BadRequestException('No se permiten type_key duplicados en los items');
        }
        const existingTypes = await tx.costCenterMovementType.findMany({
          where: { key: { in: typeKeys } },
        });
        if (existingTypes.length !== typeKeys.length) {
          const found = new Set(existingTypes.map((t: any) => t.key));
          const missing = typeKeys.filter((k) => !found.has(k));
          throw new BadRequestException(`Tipos de movimiento no encontrados: ${missing.join(', ')}`);
        }
      }

      const consecutive = await getNextConsecutive(tx, 'projection');

      const projection = await tx.projection.create({
        data: {
          consecutive,
          name: dto.name,
          description: dto.description || null,
          scope: dto.scope,
          cost_center_id: dto.scope === 'COST_CENTER' ? dto.cost_center_id! : null,
          include_sub_centers: dto.scope === 'COST_CENTER' ? (dto.include_sub_centers ?? false) : false,
          parent_id: dto.parent_id || null,
          start_date: startDate,
          end_date: endDate,
          ...(dto.items && dto.items.length > 0
            ? {
                items: {
                  createMany: {
                    data: dto.items.map((i) => ({
                      type_key: i.type_key,
                      amount: i.amount,
                    })),
                  },
                },
              }
            : {}),
        },
        include: {
          cost_center: { select: { id: true, name: true, consecutive: true } },
          parent: { select: { id: true, name: true, consecutive: true } },
          items: {
            include: { type: { select: { key: true, name: true } } },
          },
        },
      });

      return projection;
    });
  }

  async update(companyId: string, id: string, dto: UpdateProjectionDto) {
    const tenantDb = await this.getTenantDb(companyId);

    const projection = await tenantDb.projection.findUnique({ where: { id } });
    if (!projection) {
      throw new NotFoundException('Proyección no encontrada');
    }

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description || null;
    if (dto.include_sub_centers !== undefined) data.include_sub_centers = dto.include_sub_centers;

    if (dto.start_date !== undefined || dto.end_date !== undefined) {
      const startDate = dto.start_date ? new Date(dto.start_date) : projection.start_date;
      const endDate = dto.end_date ? new Date(dto.end_date) : projection.end_date;
      if (startDate >= endDate) {
        throw new BadRequestException('start_date debe ser anterior a end_date');
      }
      if (dto.start_date) data.start_date = startDate;
      if (dto.end_date) data.end_date = endDate;

      // Validar contra padre si existe
      if (projection.parent_id) {
        const parent = await tenantDb.projection.findUnique({ where: { id: projection.parent_id } });
        if (parent && (startDate < parent.start_date || endDate > parent.end_date)) {
          throw new BadRequestException(
            'Las fechas deben estar dentro del rango de la proyección padre',
          );
        }
      }
    }

    // Si vienen items, reemplazar todos
    if (dto.items !== undefined) {
      // Validar type_keys
      if (dto.items.length > 0) {
        const typeKeys = dto.items.map((i) => i.type_key);
        const uniqueKeys = new Set(typeKeys);
        if (uniqueKeys.size !== typeKeys.length) {
          throw new BadRequestException('No se permiten type_key duplicados en los items');
        }
        const existingTypes = await tenantDb.costCenterMovementType.findMany({
          where: { key: { in: typeKeys } },
        });
        if (existingTypes.length !== typeKeys.length) {
          const found = new Set(existingTypes.map((t: any) => t.key));
          const missing = typeKeys.filter((k) => !found.has(k));
          throw new BadRequestException(`Tipos de movimiento no encontrados: ${missing.join(', ')}`);
        }
      }

      return tenantDb.$transaction(async (tx: any) => {
        await tx.projectionItem.deleteMany({ where: { projection_id: id } });

        if (dto.items!.length > 0) {
          await tx.projectionItem.createMany({
            data: dto.items!.map((i) => ({
              projection_id: id,
              type_key: i.type_key,
              amount: i.amount,
            })),
          });
        }

        return tx.projection.update({
          where: { id },
          data,
          include: {
            cost_center: { select: { id: true, name: true, consecutive: true } },
            parent: { select: { id: true, name: true, consecutive: true } },
            items: {
              include: { type: { select: { key: true, name: true } } },
              orderBy: { type_key: 'asc' },
            },
          },
        });
      });
    }

    return tenantDb.projection.update({
      where: { id },
      data,
      include: {
        cost_center: { select: { id: true, name: true, consecutive: true } },
        parent: { select: { id: true, name: true, consecutive: true } },
        items: {
          include: { type: { select: { key: true, name: true } } },
          orderBy: { type_key: 'asc' },
        },
      },
    });
  }

  async delete(companyId: string, id: string) {
    const tenantDb = await this.getTenantDb(companyId);

    const projection = await tenantDb.projection.findUnique({
      where: { id },
      include: { _count: { select: { children: true } } },
    });

    if (!projection) {
      throw new NotFoundException('Proyección no encontrada');
    }

    if ((projection as any)._count.children > 0) {
      throw new BadRequestException(
        `No se puede eliminar: tiene ${(projection as any)._count.children} sub-proyección(es). Elimínelas primero.`,
      );
    }

    await tenantDb.projection.delete({ where: { id } });
    return { message: 'Proyección eliminada' };
  }
}
