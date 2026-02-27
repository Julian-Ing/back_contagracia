import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { TenantContextService, getNextConsecutive } from '@contagracia/shared-modules';
import { CreateCostCenterDto, UpdateCostCenterDto } from './dto';

export interface CostCentersQueryParams {
  search?: string;
  page?: number;
  limit?: number;
  includeInactive?: boolean;
  tree?: boolean;
}

@Injectable()
export class CostCentersService {
  constructor(private readonly tenantContext: TenantContextService) {}

  private async getTenantDb(companyId: string) {
    const tenantDb = await this.tenantContext.getTenantClient(companyId);
    if (!tenantDb) {
      throw new NotFoundException('Empresa no encontrada o inactiva');
    }
    return tenantDb;
  }

  async findAll(companyId: string, params: CostCentersQueryParams = {}) {
    const tenantDb = await this.getTenantDb(companyId);
    const { search, page = 1, limit = 50, includeInactive = false, tree = false } = params;

    if (tree) {
      return this.findTree(tenantDb, search, includeInactive);
    }

    const where: any = {};
    if (!includeInactive) {
      where.is_active = true;
    }

    if (search) {
      const pattern = `%${search}%`;
      const fuzzyMatches = await tenantDb.$queryRaw<Array<{ id: string }>>`
        SELECT cc."id" FROM "cost_centers" cc
        WHERE (${includeInactive} OR cc."is_active" = true)
        AND (
          cc."name" ILIKE ${pattern}
          OR cc."consecutive" ILIKE ${pattern}
          OR COALESCE(cc."description", '') ILIKE ${pattern}
          OR word_similarity(${search}, cc."name") > 0.3
          OR word_similarity(${search}, COALESCE(cc."consecutive", '')) > 0.3
          OR word_similarity(${search}, COALESCE(cc."description", '')) > 0.3
        )
      `;
      const matchIds = fuzzyMatches.map((r: any) => r.id);
      if (matchIds.length === 0) {
        return { data: [], total: 0, page, limit, totalPages: 0, hasMore: false };
      }
      where.id = { in: matchIds };
    }

    const [data, total] = await Promise.all([
      tenantDb.costCenter.findMany({
        where,
        include: {
          parent: { select: { id: true, name: true, consecutive: true } },
          _count: { select: { children: true, movements: true, projections: true, journal_entry_items: true } },
        },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      tenantDb.costCenter.count({ where }),
    ]);

    return {
      data: data.map((c: any) => ({
        id: c.id,
        consecutive: c.consecutive,
        name: c.name,
        description: c.description,
        is_active: c.is_active,
        parent: c.parent,
        children_count: c._count.children,
        movements_count: c._count.movements,
        projections_count: c._count.projections,
        journal_items_count: c._count.journal_entry_items,
        created_at: c.created_at,
        updated_at: c.updated_at,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    };
  }

  private async findTree(tenantDb: any, search?: string, includeInactive = false) {
    const where: any = {};
    if (!includeInactive) {
      where.is_active = true;
    }

    let filterIds: string[] | null = null;
    if (search) {
      const pattern = `%${search}%`;
      const fuzzyMatches = await tenantDb.$queryRaw<Array<{ id: string }>>`
        SELECT cc."id" FROM "cost_centers" cc
        WHERE (${includeInactive} OR cc."is_active" = true)
        AND (
          cc."name" ILIKE ${pattern}
          OR cc."consecutive" ILIKE ${pattern}
          OR COALESCE(cc."description", '') ILIKE ${pattern}
          OR word_similarity(${search}, cc."name") > 0.3
          OR word_similarity(${search}, COALESCE(cc."consecutive", '')) > 0.3
          OR word_similarity(${search}, COALESCE(cc."description", '')) > 0.3
        )
      `;
      filterIds = fuzzyMatches.map((r: any) => r.id);
      if (filterIds.length === 0) {
        return { data: [] };
      }
    }

    const allCenters = await tenantDb.costCenter.findMany({
      where,
      include: {
        _count: { select: { movements: true, projections: true, journal_entry_items: true } },
      },
      orderBy: { name: 'asc' },
    });

    // Build tree in memory
    const nodeMap = new Map<string, any>();
    for (const c of allCenters) {
      nodeMap.set(c.id, {
        id: c.id,
        consecutive: c.consecutive,
        name: c.name,
        description: c.description,
        is_active: c.is_active,
        parent_id: c.parent_id,
        movements_count: c._count.movements,
        projections_count: c._count.projections,
        journal_items_count: c._count.journal_entry_items,
        created_at: c.created_at,
        updated_at: c.updated_at,
        children: [],
      });
    }

    const roots: any[] = [];
    for (const node of nodeMap.values()) {
      if (node.parent_id && nodeMap.has(node.parent_id)) {
        nodeMap.get(node.parent_id).children.push(node);
      } else {
        roots.push(node);
      }
    }

    // Filter tree to matched nodes + ancestors when searching
    if (filterIds) {
      const matchSet = new Set(filterIds);
      const keepIds = new Set<string>();

      for (const id of matchSet) {
        let current = nodeMap.get(id);
        while (current) {
          keepIds.add(current.id);
          current = current.parent_id ? nodeMap.get(current.parent_id) : null;
        }
      }

      const filterTree = (nodes: any[]): any[] => {
        return nodes
          .filter((n: any) => keepIds.has(n.id))
          .map((n: any) => ({ ...n, children: filterTree(n.children) }));
      };

      return { data: filterTree(roots) };
    }

    return { data: roots };
  }

  async findOne(companyId: string, id: string) {
    const tenantDb = await this.getTenantDb(companyId);

    const costCenter = await tenantDb.costCenter.findUnique({
      where: { id },
      include: {
        parent: { select: { id: true, name: true, consecutive: true } },
        children: {
          where: { is_active: true },
          select: { id: true, name: true, consecutive: true, is_active: true },
          orderBy: { name: 'asc' },
        },
        _count: { select: { movements: true, projections: true, journal_entry_items: true } },
      },
    });

    if (!costCenter) {
      throw new NotFoundException('Centro de costos no encontrado');
    }

    return costCenter;
  }

  async create(companyId: string, dto: CreateCostCenterDto) {
    const tenantDb = await this.getTenantDb(companyId);

    return tenantDb.$transaction(async (tx: any) => {
      if (dto.parent_id) {
        const parent = await tx.costCenter.findUnique({ where: { id: dto.parent_id } });
        if (!parent) {
          throw new NotFoundException('Centro de costos padre no encontrado');
        }
        if (!parent.is_active) {
          throw new BadRequestException('El centro de costos padre está inactivo');
        }
      }

      const existing = await tx.costCenter.findFirst({
        where: { name: dto.name, parent_id: dto.parent_id || null, is_active: true },
      });
      if (existing) {
        throw new ConflictException('Ya existe un centro de costos con ese nombre en este nivel');
      }

      const consecutive = await getNextConsecutive(tx, 'cost_center');

      return tx.costCenter.create({
        data: {
          consecutive,
          name: dto.name,
          description: dto.description || null,
          parent_id: dto.parent_id || null,
        },
        include: {
          parent: { select: { id: true, name: true, consecutive: true } },
        },
      });
    });
  }

  async update(companyId: string, id: string, dto: UpdateCostCenterDto) {
    const tenantDb = await this.getTenantDb(companyId);

    const costCenter = await tenantDb.costCenter.findUnique({ where: { id } });
    if (!costCenter) {
      throw new NotFoundException('Centro de costos no encontrado');
    }

    if (dto.parent_id === id) {
      throw new BadRequestException('Un centro de costos no puede ser su propio padre');
    }

    if (dto.parent_id !== undefined && dto.parent_id !== null) {
      const isDescendant = await this.isDescendantOf(tenantDb, dto.parent_id, id);
      if (isDescendant) {
        throw new BadRequestException('No se puede mover a un sub-centro propio (generaría un ciclo)');
      }

      const parent = await tenantDb.costCenter.findUnique({ where: { id: dto.parent_id } });
      if (!parent) {
        throw new NotFoundException('Centro de costos padre no encontrado');
      }
      if (!parent.is_active) {
        throw new BadRequestException('El centro de costos padre está inactivo');
      }
    }

    const targetParentId = dto.parent_id !== undefined ? (dto.parent_id || null) : costCenter.parent_id;
    const targetName = dto.name || costCenter.name;

    if (dto.name !== undefined || dto.parent_id !== undefined) {
      const existing = await tenantDb.costCenter.findFirst({
        where: { name: targetName, parent_id: targetParentId, is_active: true, id: { not: id } },
      });
      if (existing) {
        throw new ConflictException('Ya existe un centro de costos con ese nombre en este nivel');
      }
    }

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description || null;
    if (dto.parent_id !== undefined) data.parent_id = dto.parent_id || null;

    return tenantDb.costCenter.update({
      where: { id },
      data,
      include: {
        parent: { select: { id: true, name: true, consecutive: true } },
      },
    });
  }

  async delete(companyId: string, id: string) {
    const tenantDb = await this.getTenantDb(companyId);

    const costCenter = await tenantDb.costCenter.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            children: { where: { is_active: true } },
            movements: true,
            projections: true,
            journal_entry_items: true,
          },
        },
      },
    });

    if (!costCenter) {
      throw new NotFoundException('Centro de costos no encontrado');
    }

    const counts = (costCenter as any)._count;
    const hasRelations = counts.children > 0 || counts.movements > 0
      || counts.projections > 0 || counts.journal_entry_items > 0;

    if (hasRelations) {
      await tenantDb.costCenter.update({
        where: { id },
        data: { is_active: false },
      });

      const parts: string[] = [];
      if (counts.children > 0) parts.push(`${counts.children} sub-centro(s)`);
      if (counts.movements > 0) parts.push(`${counts.movements} movimiento(s)`);
      if (counts.projections > 0) parts.push(`${counts.projections} proyección(es)`);
      if (counts.journal_entry_items > 0) parts.push(`${counts.journal_entry_items} línea(s) de asiento`);

      return {
        message: 'Centro de costos desactivado',
        type: 'soft_delete',
        reason: `Tiene ${parts.join(', ')}. Se desactivó en lugar de eliminar.`,
      };
    }

    await tenantDb.costCenter.delete({ where: { id } });
    return { message: 'Centro de costos eliminado', type: 'hard_delete' };
  }

  async reactivate(companyId: string, id: string) {
    const tenantDb = await this.getTenantDb(companyId);

    const costCenter = await tenantDb.costCenter.findUnique({ where: { id } });
    if (!costCenter) {
      throw new NotFoundException('Centro de costos no encontrado');
    }
    if (costCenter.is_active) {
      throw new BadRequestException('El centro de costos ya está activo');
    }

    if (costCenter.parent_id) {
      const parent = await tenantDb.costCenter.findUnique({ where: { id: costCenter.parent_id } });
      if (parent && !parent.is_active) {
        throw new BadRequestException('No se puede reactivar: el centro padre está inactivo');
      }
    }

    return tenantDb.costCenter.update({
      where: { id },
      data: { is_active: true },
      include: {
        parent: { select: { id: true, name: true, consecutive: true } },
      },
    });
  }

  async getMovementTypes(companyId: string): Promise<{ key: string; name: string; nature: string }[]> {
    const tenantDb = await this.getTenantDb(companyId);
    const types = await tenantDb.costCenterMovementType.findMany({
      orderBy: { key: 'asc' },
    });
    return types.map((t: any) => ({ key: t.key, name: t.name, nature: t.nature }));
  }

  async getMovementReferenceTypes(companyId: string) {
    const tenantDb = await this.getTenantDb(companyId);
    return tenantDb.costCenterMovementReferenceType.findMany({
      orderBy: { key: 'asc' },
    });
  }

  async findMovements(
    companyId: string,
    costCenterId: string,
    params: {
      search?: string;
      type_key?: string;
      reference_type_key?: string;
      from_date?: string;
      to_date?: string;
      sign?: string;
      page?: number;
      limit?: number;
    } = {},
  ) {
    const tenantDb = await this.getTenantDb(companyId);
    const { search, type_key, reference_type_key, from_date, to_date, sign, page = 1, limit = 20 } = params;

    // Verify cost center exists
    const costCenter = await tenantDb.costCenter.findUnique({
      where: { id: costCenterId },
      select: { id: true, name: true, consecutive: true },
    });
    if (!costCenter) {
      throw new NotFoundException('Centro de costos no encontrado');
    }

    const where: any = { cost_center_id: costCenterId };

    if (type_key) where.type_key = type_key;
    if (reference_type_key) where.reference_type_key = reference_type_key;
    if (sign) where.sign = sign;

    if (from_date || to_date) {
      where.movement_date = {};
      if (from_date) where.movement_date.gte = new Date(from_date);
      if (to_date) where.movement_date.lte = new Date(to_date);
    }

    // Fuzzy search on description
    if (search) {
      const pattern = `%${search}%`;
      const fuzzyMatches = await tenantDb.$queryRaw<Array<{ id: string }>>`
        SELECT m."id" FROM "cost_center_movements" m
        WHERE m."cost_center_id" = ${costCenterId}
        AND (
          m."description" ILIKE ${pattern}
          OR word_similarity(${search}, COALESCE(m."description", '')) > 0.3
        )
      `;
      const matchIds = fuzzyMatches.map((r: any) => r.id);
      if (matchIds.length === 0) {
        return { data: [], total: 0, page, limit, totalPages: 0, hasMore: false, costCenter };
      }
      where.id = { in: matchIds };
    }

    const [data, total] = await Promise.all([
      tenantDb.costCenterMovement.findMany({
        where,
        include: {
          type: { select: { key: true, name: true } },
          reference_type: { select: { key: true, name: true } },
        },
        orderBy: [{ movement_date: 'desc' }, { created_at: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      tenantDb.costCenterMovement.count({ where }),
    ]);

    return {
      data: data.map((m: any) => ({
        id: m.id,
        cost_center_id: m.cost_center_id,
        movement_date: m.movement_date,
        type_key: m.type_key,
        reference_type_key: m.reference_type_key,
        sign: m.sign,
        amount: m.amount,
        description: m.description,
        reference_id: m.reference_id,
        created_at: m.created_at,
        type: m.type,
        reference_type: m.reference_type,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
      costCenter,
    };
  }

  private async isDescendantOf(tenantDb: any, targetId: string, ancestorId: string): Promise<boolean> {
    let currentId: string | null = targetId;
    const visited = new Set<string>();

    while (currentId) {
      if (currentId === ancestorId) return true;
      if (visited.has(currentId)) return false;
      visited.add(currentId);

      const node = await tenantDb.costCenter.findUnique({
        where: { id: currentId },
        select: { parent_id: true },
      });
      currentId = node?.parent_id || null;
    }

    return false;
  }
}
