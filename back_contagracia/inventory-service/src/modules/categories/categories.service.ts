import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { TenantContextService, getNextConsecutive } from '@contagracia/shared-modules';
import { CreateCategoryDto, UpdateCategoryDto } from './dto';

export interface CategoriesQueryParams {
  search?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class CategoriesService {
  constructor(private readonly tenantContext: TenantContextService) {}

  private async getTenantDb(companyId: string) {
    const tenantDb = await this.tenantContext.getTenantClient(companyId);
    if (!tenantDb) {
      throw new NotFoundException('Empresa no encontrada o inactiva');
    }
    return tenantDb;
  }

  /**
   * Listar categorías para select (ligero, sin conteo de productos)
   */
  async findForSelect(companyId: string, search?: string) {
    const tenantDb = await this.getTenantDb(companyId);

    const where: any = { is_active: true };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { consecutive: { contains: search, mode: 'insensitive' } },
      ];
    }

    const categories = await tenantDb.productCategory.findMany({
      where,
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });

    return categories;
  }

  async findAll(companyId: string, params: CategoriesQueryParams = {}) {
    const tenantDb = await this.getTenantDb(companyId);
    const { search, page = 1, limit = 50 } = params;

    const where: any = { is_active: true };

    // Fuzzy search por nombre o consecutivo (pg_trgm)
    if (search) {
      const searchPattern = `%${search}%`;
      const fuzzyMatches = await tenantDb.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "product_categories"
        WHERE "is_active" = true
        AND (
          "name" ILIKE ${searchPattern}
          OR "consecutive" ILIKE ${searchPattern}
          OR word_similarity(${search}, COALESCE("name", '')) > 0.3
          OR word_similarity(${search}, COALESCE("consecutive", '')) > 0.3
        )
      `;
      const matchIds = fuzzyMatches.map(r => r.id);
      if (matchIds.length === 0) {
        return { data: [], total: 0, page, limit, totalPages: 0, hasMore: false };
      }
      where.id = { in: matchIds };
    }

    const [data, total] = await Promise.all([
      tenantDb.productCategory.findMany({
        where,
        include: { _count: { select: { products: true } } },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      tenantDb.productCategory.count({ where }),
    ]);

    return {
      data: data.map((c: any) => ({
        id: c.id,
        consecutive: c.consecutive,
        name: c.name,
        description: c.description,
        is_aiu: c.is_aiu,
        is_bag: c.is_bag,
        products_count: c._count.products,
        created_at: c.created_at,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    };
  }

  async create(companyId: string, dto: CreateCategoryDto) {
    const tenantDb = await this.getTenantDb(companyId);

    return tenantDb.$transaction(async (tx: any) => {
      // Verificar nombre duplicado
      const existing = await tx.productCategory.findFirst({
        where: { name: dto.name, is_active: true },
      });
      if (existing) {
        throw new ConflictException('Ya existe una categoría con ese nombre');
      }

      const consecutive = await getNextConsecutive(tx, 'product_category');

      return tx.productCategory.create({
        data: {
          consecutive,
          name: dto.name,
          description: dto.description || null,
        },
      });
    });
  }

  async update(companyId: string, id: string, dto: UpdateCategoryDto) {
    const tenantDb = await this.getTenantDb(companyId);

    const category = await tenantDb.productCategory.findUnique({ where: { id } });
    if (!category || !category.is_active) {
      throw new NotFoundException('Categoría no encontrada');
    }

    if (category.is_aiu || category.is_bag) {
      throw new BadRequestException('Esta categoría del sistema no puede ser modificada');
    }

    // Verificar nombre duplicado si cambió
    if (dto.name && dto.name !== category.name) {
      const existing = await tenantDb.productCategory.findFirst({
        where: { name: dto.name, is_active: true, id: { not: id } },
      });
      if (existing) {
        throw new ConflictException('Ya existe una categoría con ese nombre');
      }
    }

    return tenantDb.productCategory.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description || null }),
      },
    });
  }

  async delete(companyId: string, id: string) {
    const tenantDb = await this.getTenantDb(companyId);

    const category = await tenantDb.productCategory.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });

    if (!category || !category.is_active) {
      throw new NotFoundException('Categoría no encontrada');
    }

    if (category.is_aiu || category.is_bag) {
      throw new BadRequestException('Esta categoría del sistema no puede ser eliminada');
    }

    if ((category as any)._count.products > 0) {
      throw new ConflictException('No se puede eliminar una categoría con productos asociados');
    }

    await tenantDb.productCategory.update({
      where: { id },
      data: { is_active: false },
    });

    return { message: 'Categoría eliminada' };
  }
}
