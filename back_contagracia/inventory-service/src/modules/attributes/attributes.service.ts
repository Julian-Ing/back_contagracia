import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { TenantContextService, getNextConsecutive } from '@contagracia/shared-modules';
import {
  CreateAttributeDto, UpdateAttributeDto, CreateAttributeOptionDto, UpdateAttributeOptionDto,
  BulkCreateAttributesDto, BulkCreateOptionsDto, BulkCreateWithOptionsDto,
} from './dto';

export interface AttributesQueryParams {
  search?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class AttributesService {
  constructor(private readonly tenantContext: TenantContextService) {}

  private async getTenantDb(companyId: string) {
    const tenantDb = await this.tenantContext.getTenantClient(companyId);
    if (!tenantDb) {
      throw new NotFoundException('Empresa no encontrada o inactiva');
    }
    return tenantDb;
  }

  // ────── Atributos ──────

  /**
   * Lightweight list for selects — returns ALL active attributes with their active options (no pagination).
   */
  async findForSelect(companyId: string) {
    const tenantDb = await this.getTenantDb(companyId);

    const attributes = await tenantDb.productAttribute.findMany({
      where: { is_active: true },
      select: {
        id: true,
        name: true,
        consecutive: true,
        options: {
          where: { is_active: true },
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Only return attributes that have at least one active option
    return attributes.filter((a: any) => a.options.length > 0);
  }

  async findAll(companyId: string, params: AttributesQueryParams = {}) {
    const tenantDb = await this.getTenantDb(companyId);
    const { search, page = 1, limit = 50 } = params;

    const where: any = {};

    if (search) {
      const searchPattern = `%${search}%`;
      const fuzzyMatches = await tenantDb.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "product_attributes"
        WHERE (
          "name" ILIKE ${searchPattern}
          OR "consecutive" ILIKE ${searchPattern}
          OR word_similarity(${search}, COALESCE("name", '')) > 0.3
        )
      `;
      const matchIds = fuzzyMatches.map((r: any) => r.id);
      if (matchIds.length === 0) {
        const optionMatches = await tenantDb.$queryRaw<Array<{ product_attribute_id: string }>>`
          SELECT DISTINCT "product_attribute_id" FROM "product_attribute_options"
          WHERE (
            "name" ILIKE ${searchPattern}
            OR word_similarity(${search}, COALESCE("name", '')) > 0.3
          )
        `;
        const parentIds = optionMatches.map((r: any) => r.product_attribute_id);
        if (parentIds.length === 0) {
          return { data: [], total: 0, page, limit, totalPages: 0, hasMore: false };
        }
        where.id = { in: parentIds };
      } else {
        const optionMatches = await tenantDb.$queryRaw<Array<{ product_attribute_id: string }>>`
          SELECT DISTINCT "product_attribute_id" FROM "product_attribute_options"
          WHERE (
            "name" ILIKE ${searchPattern}
            OR word_similarity(${search}, COALESCE("name", '')) > 0.3
          )
        `;
        const allIds = new Set([...matchIds, ...optionMatches.map((r: any) => r.product_attribute_id)]);
        where.id = { in: Array.from(allIds) };
      }
    }

    const [data, total] = await Promise.all([
      tenantDb.productAttribute.findMany({
        where,
        include: {
          options: {
            orderBy: { created_at: 'asc' },
          },
          _count: {
            select: {
              options: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      tenantDb.productAttribute.count({ where }),
    ]);

    return {
      data: data.map((attr: any) => ({
        id: attr.id,
        consecutive: attr.consecutive,
        name: attr.name,
        description: attr.description,
        is_active: attr.is_active,
        options_count: attr._count.options,
        options: attr.options.map((opt: any) => ({
          id: opt.id,
          consecutive: opt.consecutive,
          name: opt.name,
          is_active: opt.is_active,
          created_at: opt.created_at,
        })),
        created_at: attr.created_at,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    };
  }

  async create(companyId: string, dto: CreateAttributeDto) {
    const tenantDb = await this.getTenantDb(companyId);

    return tenantDb.$transaction(async (tx: any) => {
      const existing = await tx.productAttribute.findFirst({
        where: { name: dto.name, is_active: true },
      });
      if (existing) {
        throw new ConflictException('Ya existe un atributo con ese nombre');
      }

      const consecutive = await getNextConsecutive(tx, 'product_attribute');

      return tx.productAttribute.create({
        data: {
          consecutive,
          name: dto.name,
          description: dto.description || null,
        },
      });
    });
  }

  async update(companyId: string, id: string, dto: UpdateAttributeDto) {
    const tenantDb = await this.getTenantDb(companyId);

    const attribute = await tenantDb.productAttribute.findUnique({ where: { id } });
    if (!attribute || !attribute.is_active) {
      throw new NotFoundException('Atributo no encontrado');
    }

    if (dto.name && dto.name !== attribute.name) {
      const existing = await tenantDb.productAttribute.findFirst({
        where: { name: dto.name, is_active: true, id: { not: id } },
      });
      if (existing) {
        throw new ConflictException('Ya existe un atributo con ese nombre');
      }
    }

    return tenantDb.productAttribute.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description || null }),
      },
    });
  }

  async toggleActive(companyId: string, id: string) {
    const tenantDb = await this.getTenantDb(companyId);

    const attribute = await tenantDb.productAttribute.findUnique({ where: { id } });
    if (!attribute) {
      throw new NotFoundException('Atributo no encontrado');
    }

    const newState = !attribute.is_active;

    await tenantDb.$transaction(async (tx: any) => {
      await tx.productAttribute.update({
        where: { id },
        data: { is_active: newState },
      });
      // Si se desactiva, desactivar todas las opciones también
      if (!newState) {
        await tx.productAttributeOption.updateMany({
          where: { product_attribute_id: id, is_active: true },
          data: { is_active: false },
        });
      }
    });

    return { is_active: newState, message: newState ? 'Atributo activado' : 'Atributo desactivado' };
  }

  async delete(companyId: string, id: string) {
    const tenantDb = await this.getTenantDb(companyId);

    const attribute = await tenantDb.productAttribute.findUnique({
      where: { id },
      include: {
        options: {
          where: { is_active: true },
          include: {
            _count: { select: { combination_attributes: true } },
          },
        },
      },
    });

    if (!attribute || !attribute.is_active) {
      throw new NotFoundException('Atributo no encontrado');
    }

    // Verificar si alguna opción está en uso por combinaciones
    const usedOptions = (attribute as any).options.filter((opt: any) => opt._count.combination_attributes > 0);
    if (usedOptions.length > 0) {
      throw new ConflictException(
        `No se puede eliminar: ${usedOptions.length} opción(es) están en uso por combinaciones de productos`,
      );
    }

    // Soft delete del atributo y todas sus opciones
    await tenantDb.$transaction(async (tx: any) => {
      await tx.productAttributeOption.updateMany({
        where: { product_attribute_id: id, is_active: true },
        data: { is_active: false },
      });
      await tx.productAttribute.update({
        where: { id },
        data: { is_active: false },
      });
    });

    return { message: 'Atributo eliminado' };
  }

  // ────── Opciones de Atributo ──────

  async createOption(companyId: string, attributeId: string, dto: CreateAttributeOptionDto) {
    const tenantDb = await this.getTenantDb(companyId);

    return tenantDb.$transaction(async (tx: any) => {
      const attribute = await tx.productAttribute.findUnique({ where: { id: attributeId } });
      if (!attribute || !attribute.is_active) {
        throw new NotFoundException('Atributo no encontrado');
      }

      const existing = await tx.productAttributeOption.findFirst({
        where: { product_attribute_id: attributeId, name: dto.name, is_active: true },
      });
      if (existing) {
        throw new ConflictException('Ya existe una opción con ese nombre en este atributo');
      }

      const consecutive = await getNextConsecutive(tx, 'product_attribute_option');

      return tx.productAttributeOption.create({
        data: {
          consecutive,
          name: dto.name,
          product_attribute_id: attributeId,
        },
      });
    });
  }

  async updateOption(companyId: string, optionId: string, dto: UpdateAttributeOptionDto) {
    const tenantDb = await this.getTenantDb(companyId);

    const option = await tenantDb.productAttributeOption.findUnique({
      where: { id: optionId },
      include: { attribute: true },
    });
    if (!option || !option.is_active) {
      throw new NotFoundException('Opción no encontrada');
    }

    if (dto.name && dto.name !== option.name) {
      const existing = await tenantDb.productAttributeOption.findFirst({
        where: {
          product_attribute_id: option.product_attribute_id,
          name: dto.name,
          is_active: true,
          id: { not: optionId },
        },
      });
      if (existing) {
        throw new ConflictException('Ya existe una opción con ese nombre en este atributo');
      }
    }

    return tenantDb.productAttributeOption.update({
      where: { id: optionId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
      },
    });
  }

  async toggleOptionActive(companyId: string, optionId: string) {
    const tenantDb = await this.getTenantDb(companyId);

    const option = await tenantDb.productAttributeOption.findUnique({ where: { id: optionId } });
    if (!option) {
      throw new NotFoundException('Opción no encontrada');
    }

    const newState = !option.is_active;
    await tenantDb.productAttributeOption.update({
      where: { id: optionId },
      data: { is_active: newState },
    });

    return { is_active: newState, message: newState ? 'Opción activada' : 'Opción desactivada' };
  }

  async deleteOption(companyId: string, optionId: string) {
    const tenantDb = await this.getTenantDb(companyId);

    const option = await tenantDb.productAttributeOption.findUnique({
      where: { id: optionId },
      include: {
        _count: { select: { combination_attributes: true } },
      },
    });

    if (!option || !option.is_active) {
      throw new NotFoundException('Opción no encontrada');
    }

    if ((option as any)._count.combination_attributes > 0) {
      throw new ConflictException('No se puede eliminar: esta opción está en uso por combinaciones de productos');
    }

    await tenantDb.productAttributeOption.update({
      where: { id: optionId },
      data: { is_active: false },
    });

    return { message: 'Opción eliminada' };
  }

  // ────── Acciones Masivas ──────

  async bulkCreateAttributes(companyId: string, dto: BulkCreateAttributesDto) {
    const tenantDb = await this.getTenantDb(companyId);

    // Validar nombres únicos dentro del request
    const names = dto.attributes.map(a => a.name.trim());
    const uniqueNames = new Set(names);
    if (uniqueNames.size !== names.length) {
      throw new ConflictException('Hay nombres de atributos duplicados en la solicitud');
    }

    return tenantDb.$transaction(async (tx: any) => {
      // Validar que no existan activos con esos nombres
      const existing = await tx.productAttribute.findMany({
        where: { name: { in: names }, is_active: true },
        select: { name: true },
      });
      if (existing.length > 0) {
        const dupes = existing.map((e: any) => e.name).join(', ');
        throw new ConflictException(`Ya existen atributos activos con estos nombres: ${dupes}`);
      }

      const created: any[] = [];
      for (const item of dto.attributes) {
        const consecutive = await getNextConsecutive(tx, 'product_attribute');
        const attr = await tx.productAttribute.create({
          data: {
            consecutive,
            name: item.name.trim(),
            description: item.description?.trim() || null,
          },
        });
        created.push(attr);
      }

      return { message: `${created.length} atributo(s) creado(s)`, count: created.length, data: created };
    });
  }

  async bulkCreateOptions(companyId: string, attributeId: string, dto: BulkCreateOptionsDto) {
    const tenantDb = await this.getTenantDb(companyId);

    const names = dto.names.map(n => n.trim());

    // Validar nombres únicos dentro del request
    const uniqueNames = new Set(names);
    if (uniqueNames.size !== names.length) {
      throw new ConflictException('Hay nombres de opciones duplicados en la solicitud');
    }

    return tenantDb.$transaction(async (tx: any) => {
      const attribute = await tx.productAttribute.findUnique({ where: { id: attributeId } });
      if (!attribute || !attribute.is_active) {
        throw new NotFoundException('Atributo no encontrado');
      }

      // Validar que no existan opciones activas con esos nombres
      const existing = await tx.productAttributeOption.findMany({
        where: { product_attribute_id: attributeId, name: { in: names }, is_active: true },
        select: { name: true },
      });
      if (existing.length > 0) {
        const dupes = existing.map((e: any) => e.name).join(', ');
        throw new ConflictException(`Ya existen opciones activas con estos nombres: ${dupes}`);
      }

      const created: any[] = [];
      for (const name of names) {
        const consecutive = await getNextConsecutive(tx, 'product_attribute_option');
        const opt = await tx.productAttributeOption.create({
          data: { consecutive, name, product_attribute_id: attributeId },
        });
        created.push(opt);
      }

      return { message: `${created.length} opción(es) creada(s)`, count: created.length, data: created };
    });
  }

  async bulkCreateWithOptions(companyId: string, dto: BulkCreateWithOptionsDto) {
    const tenantDb = await this.getTenantDb(companyId);

    // Validar nombres de atributos únicos dentro del request
    const attrNames = dto.attributes.map(a => a.name.trim());
    const uniqueAttrNames = new Set(attrNames);
    if (uniqueAttrNames.size !== attrNames.length) {
      throw new ConflictException('Hay nombres de atributos duplicados en la solicitud');
    }

    // Validar opciones únicas dentro de cada atributo
    for (const item of dto.attributes) {
      const optNames = item.options.map(o => o.trim());
      const uniqueOpts = new Set(optNames);
      if (uniqueOpts.size !== optNames.length) {
        throw new ConflictException(`Hay opciones duplicadas en el atributo "${item.name}"`);
      }
    }

    return tenantDb.$transaction(async (tx: any) => {
      // Validar que no existan atributos activos con esos nombres
      const existingAttrs = await tx.productAttribute.findMany({
        where: { name: { in: attrNames }, is_active: true },
        select: { name: true },
      });
      if (existingAttrs.length > 0) {
        const dupes = existingAttrs.map((e: any) => e.name).join(', ');
        throw new ConflictException(`Ya existen atributos activos con estos nombres: ${dupes}`);
      }

      const results: any[] = [];
      for (const item of dto.attributes) {
        const attrConsecutive = await getNextConsecutive(tx, 'product_attribute');
        const attr = await tx.productAttribute.create({
          data: {
            consecutive: attrConsecutive,
            name: item.name.trim(),
            description: item.description?.trim() || null,
          },
        });

        const options: any[] = [];
        for (const optName of item.options) {
          const trimmed = optName.trim();
          if (!trimmed) continue;
          const optConsecutive = await getNextConsecutive(tx, 'product_attribute_option');
          const opt = await tx.productAttributeOption.create({
            data: { consecutive: optConsecutive, name: trimmed, product_attribute_id: attr.id },
          });
          options.push(opt);
        }

        results.push({ ...attr, options });
      }

      const totalOpts = results.reduce((sum, r) => sum + r.options.length, 0);
      return {
        message: `${results.length} atributo(s) y ${totalOpts} opción(es) creado(s)`,
        attributesCount: results.length,
        optionsCount: totalOpts,
        data: results,
      };
    });
  }
}
