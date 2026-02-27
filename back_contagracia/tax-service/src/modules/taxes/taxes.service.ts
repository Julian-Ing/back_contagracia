import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { TenantContextService } from '@contagracia/shared-modules';
import { CreateTaxDto, UpdateTaxDto } from './dto';

export interface TaxesQueryParams {
  search?: string;
  is_tax?: boolean;
  tax_type_id?: number;
  page?: number;
  limit?: number;
}

@Injectable()
export class TaxesService {
  constructor(private readonly tenantContext: TenantContextService) {}

  private async getTenantDb(companyId: string) {
    const tenantDb = await this.tenantContext.getTenantClient(companyId);
    if (!tenantDb) {
      throw new NotFoundException('Empresa no encontrada o inactiva');
    }
    return tenantDb;
  }

  /**
   * Listar impuestos/retenciones con fuzzy search y paginación
   */
  async findAll(companyId: string, params: TaxesQueryParams = {}) {
    const tenantDb = await this.getTenantDb(companyId);
    const { search, is_tax, tax_type_id, page = 1, limit = 20 } = params;

    const where: any = {};

    // Filtro por tipo (impuesto o retención)
    if (is_tax !== undefined) {
      where.tax_type = { is_tax };
    }

    // Filtro por tax_type_id específico
    if (tax_type_id !== undefined) {
      where.tax_type_id = tax_type_id;
    }

    // Fuzzy search por nombre o código
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { tax_type: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [taxes, total] = await Promise.all([
      tenantDb.tax.findMany({
        where,
        include: {
          tax_type: { select: { id: true, code: true, name: true, is_tax: true } },
          tax_sales_account: { select: { code: true, name: true } },
          tax_purchases_account: { select: { code: true, name: true } },
          tax_cost_account: { select: { code: true, name: true } },
          withholding_sales_account: { select: { code: true, name: true } },
          withholding_purchases_account: { select: { code: true, name: true } },
        },
        orderBy: [{ tax_type: { name: 'asc' } }, { rate: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      tenantDb.tax.count({ where }),
    ]);

    return {
      data: taxes.map((t) => ({
        id: t.id,
        code: t.code,
        name: t.name,
        rate: Number(t.rate),
        per_unit_amount: t.per_unit_amount ? Number(t.per_unit_amount) : null,
        description: t.description,
        tax_type_id: t.tax_type_id,
        is_cost_tax: t.is_cost_tax,
        is_system: t.is_system,
        is_active: t.is_active,
        tax_type: t.tax_type
          ? {
              id: t.tax_type.id,
              code: t.tax_type.code,
              name: t.tax_type.name,
              is_tax: t.tax_type.is_tax,
            }
          : null,
        tax_sales_account: t.tax_sales_account,
        tax_purchases_account: t.tax_purchases_account,
        tax_cost_account: t.tax_cost_account,
        withholding_sales_account: t.withholding_sales_account,
        withholding_purchases_account: t.withholding_purchases_account,
        created_at: t.created_at,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    };
  }

  /**
   * Listar impuestos para select (ligero, sin joins pesados)
   */
  async findForSelect(companyId: string, params: {
    search?: string;
    is_tax?: boolean;
    includeTypeIds?: number[];
    excludeTypeIds?: number[];
    excludeCostTax?: boolean;
  } = {}) {
    const tenantDb = await this.getTenantDb(companyId);
    const { search, is_tax, includeTypeIds, excludeTypeIds, excludeCostTax } = params;

    const where: any = { is_active: true };

    if (excludeCostTax) {
      where.is_cost_tax = false;
    }

    if (is_tax !== undefined) {
      where.tax_type = { is_tax };
    }

    if (includeTypeIds && includeTypeIds.length > 0) {
      where.tax_type_id = { in: includeTypeIds };
    }

    if (excludeTypeIds && excludeTypeIds.length > 0) {
      where.tax_type_id = { ...(where.tax_type_id || {}), notIn: excludeTypeIds };
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    const taxes = await tenantDb.tax.findMany({
      where,
      select: { id: true, name: true, rate: true, per_unit_amount: true, tax_type_id: true },
      orderBy: [{ name: 'asc' }, { rate: 'asc' }],
    });

    return taxes.map(t => ({
      id: t.id,
      name: t.name,
      rate: Number(t.rate),
      per_unit_amount: t.per_unit_amount ? Number(t.per_unit_amount) : null,
      tax_type_id: t.tax_type_id,
    }));
  }

  /**
   * Listar tipos de impuestos para el select
   */
  async findAllTaxTypes(companyId: string, is_tax?: boolean) {
    const tenantDb = await this.getTenantDb(companyId);

    const where: any = { is_active: true };
    if (is_tax !== undefined) {
      where.is_tax = is_tax;
    }

    const taxTypes = await tenantDb.taxType.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    return taxTypes.map((tt) => ({
      id: tt.id,
      code: tt.code,
      name: tt.name,
      description: tt.description,
      is_tax: tt.is_tax,
    }));
  }

  /**
   * Obtener impuesto por ID
   */
  async findOne(companyId: string, id: string) {
    const tenantDb = await this.getTenantDb(companyId);

    const tax = await tenantDb.tax.findUnique({
      where: { id },
      include: {
        tax_type: { select: { id: true, code: true, name: true, is_tax: true } },
        tax_sales_account: { select: { code: true, name: true } },
        tax_purchases_account: { select: { code: true, name: true } },
        tax_cost_account: { select: { code: true, name: true } },
        withholding_sales_account: { select: { code: true, name: true } },
        withholding_purchases_account: { select: { code: true, name: true } },
      },
    });

    if (!tax) {
      throw new NotFoundException('Impuesto no encontrado');
    }

    return {
      id: tax.id,
      code: tax.code,
      name: tax.name,
      rate: Number(tax.rate),
      per_unit_amount: tax.per_unit_amount ? Number(tax.per_unit_amount) : null,
      description: tax.description,
      tax_type_id: tax.tax_type_id,
      is_cost_tax: tax.is_cost_tax,
      is_active: tax.is_active,
      tax_type: tax.tax_type,
      tax_sales_account: tax.tax_sales_account,
      tax_purchases_account: tax.tax_purchases_account,
      tax_cost_account: tax.tax_cost_account,
      withholding_sales_account: tax.withholding_sales_account,
      withholding_purchases_account: tax.withholding_purchases_account,
      created_at: tax.created_at,
    };
  }

  /**
   * Crear impuesto/retención
   */
  async create(companyId: string, dto: CreateTaxDto) {
    const tenantDb = await this.getTenantDb(companyId);

    const taxType = await tenantDb.taxType.findUnique({
      where: { id: dto.tax_type_id },
    });

    if (!taxType) {
      throw new NotFoundException('Tipo de impuesto no encontrado');
    }

    const isPerUnit = dto.tax_type_id === 10;
    let rate = dto.rate;
    let perUnitAmount: number | null = null;

    if (isPerUnit) {
      if (dto.per_unit_amount == null || dto.per_unit_amount < 0) {
        throw new BadRequestException('El monto por unidad es requerido para INC Bolsas');
      }
      perUnitAmount = dto.per_unit_amount;
      rate = 0;
    } else {
      if (rate < 0 || rate > 100) {
        throw new BadRequestException('La tasa debe estar entre 0 y 100');
      }
    }

    const tax = await tenantDb.tax.create({
      data: {
        code: String(dto.tax_type_id),
        name: dto.name,
        rate,
        per_unit_amount: perUnitAmount,
        tax_type_id: dto.tax_type_id,
        description: dto.description || null,
        is_cost_tax: dto.is_cost_tax || false,
        tax_sales_account_code: dto.tax_sales_account_code || null,
        tax_purchases_account_code: dto.tax_purchases_account_code || null,
        tax_cost_account_code: dto.tax_cost_account_code || null,
        withholding_sales_account_code: dto.withholding_sales_account_code || null,
        withholding_purchases_account_code: dto.withholding_purchases_account_code || null,
      },
      include: {
        tax_type: {
          select: { id: true, code: true, name: true, is_tax: true },
        },
      },
    });

    return {
      id: tax.id,
      code: tax.code,
      name: tax.name,
      rate: Number(tax.rate),
      per_unit_amount: tax.per_unit_amount ? Number(tax.per_unit_amount) : null,
      description: tax.description,
      tax_type_id: tax.tax_type_id,
      tax_type: tax.tax_type,
      tax_sales_account_code: tax.tax_sales_account_code,
      tax_purchases_account_code: tax.tax_purchases_account_code,
      tax_cost_account_code: tax.tax_cost_account_code,
      withholding_sales_account_code: tax.withholding_sales_account_code,
      withholding_purchases_account_code: tax.withholding_purchases_account_code,
      created_at: tax.created_at,
    };
  }

  /**
   * Actualizar impuesto/retención
   */
  async update(companyId: string, id: string, dto: UpdateTaxDto) {
    const tenantDb = await this.getTenantDb(companyId);

    const existing = await tenantDb.tax.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException('Impuesto no encontrado');
    }

    if (existing.is_system) {
      throw new ConflictException('Este impuesto es del sistema y no se puede editar');
    }

    const isPerUnit = existing.tax_type_id === 10;

    if (isPerUnit) {
      if (dto.per_unit_amount !== undefined && dto.per_unit_amount !== null && dto.per_unit_amount < 0) {
        throw new BadRequestException('El monto por unidad debe ser >= 0');
      }
    } else {
      if (dto.rate !== undefined && (dto.rate < 0 || dto.rate > 100)) {
        throw new BadRequestException('La tasa debe estar entre 0 y 100');
      }
    }

    const updated = await tenantDb.tax.update({
      where: { id },
      data: {
        name: dto.name,
        rate: isPerUnit ? 0 : dto.rate,
        per_unit_amount: isPerUnit ? dto.per_unit_amount : null,
        description: dto.description,
        is_cost_tax: dto.is_cost_tax,
        is_active: dto.is_active,
        tax_sales_account_code: dto.tax_sales_account_code,
        tax_purchases_account_code: dto.tax_purchases_account_code,
        tax_cost_account_code: dto.tax_cost_account_code,
        withholding_sales_account_code: dto.withholding_sales_account_code,
        withholding_purchases_account_code: dto.withholding_purchases_account_code,
      },
      include: {
        tax_type: {
          select: { id: true, code: true, name: true, is_tax: true },
        },
      },
    });

    return {
      id: updated.id,
      code: updated.code,
      name: updated.name,
      rate: Number(updated.rate),
      per_unit_amount: updated.per_unit_amount ? Number(updated.per_unit_amount) : null,
      description: updated.description,
      tax_type_id: updated.tax_type_id,
      is_cost_tax: updated.is_cost_tax,
      is_active: updated.is_active,
      tax_type: updated.tax_type,
      tax_sales_account_code: updated.tax_sales_account_code,
      tax_purchases_account_code: updated.tax_purchases_account_code,
      tax_cost_account_code: updated.tax_cost_account_code,
      withholding_sales_account_code: updated.withholding_sales_account_code,
      withholding_purchases_account_code: updated.withholding_purchases_account_code,
      created_at: updated.created_at,
    };
  }

  /**
   * Verificar si se puede eliminar un impuesto
   */
  async canDelete(companyId: string, id: string) {
    const tenantDb = await this.getTenantDb(companyId);

    const existing = await tenantDb.tax.findUnique({
      where: { id },
      include: {
        products: { take: 1 },
        document_item_taxes: { take: 1 },
        document_withholdings: { take: 1 },
      },
    });

    if (!existing) {
      throw new NotFoundException('Impuesto no encontrado');
    }

    if (existing.is_system) {
      return {
        canDelete: false,
        reason: 'Este impuesto es del sistema y no se puede eliminar',
        itemTaxesCount: 0,
        withholdingsCount: 0,
      };
    }

    const itemTaxesCount = await tenantDb.documentItemTax.count({ where: { tax_id: id } });
    const withholdingsCount = await tenantDb.documentWithholding.count({ where: { withholding_id: id } });
    const productsCount = await tenantDb.product.count({ where: { tax_id: id } });

    if (itemTaxesCount > 0) {
      return {
        canDelete: false,
        reason: `Tiene ${itemTaxesCount} documento(s) con este impuesto aplicado`,
        itemTaxesCount,
        withholdingsCount,
      };
    }

    if (withholdingsCount > 0) {
      return {
        canDelete: false,
        reason: `Tiene ${withholdingsCount} retención(es) de documentos asociadas`,
        itemTaxesCount,
        withholdingsCount,
      };
    }

    if (productsCount > 0) {
      return {
        canDelete: false,
        reason: `Tiene ${productsCount} producto(s) con este impuesto por defecto`,
        itemTaxesCount,
        withholdingsCount,
      };
    }

    return { canDelete: true, itemTaxesCount: 0, withholdingsCount: 0 };
  }

  /**
   * Eliminar impuesto (DELETE real)
   */
  async delete(companyId: string, id: string) {
    const tenantDb = await this.getTenantDb(companyId);

    const existing = await tenantDb.tax.findUnique({
      where: { id },
      include: {
        products: { take: 1 },
        document_item_taxes: { take: 1 },
        document_withholdings: { take: 1 },
      },
    });

    if (!existing) {
      throw new NotFoundException('Impuesto no encontrado');
    }

    if (existing.is_system) {
      throw new ConflictException('Este impuesto es del sistema y no se puede eliminar');
    }

    if (existing.products.length > 0) {
      throw new ConflictException('No se puede eliminar: tiene productos asociados');
    }

    if (existing.document_item_taxes.length > 0) {
      throw new ConflictException('No se puede eliminar: tiene impuestos de documentos asociados');
    }

    if (existing.document_withholdings.length > 0) {
      throw new ConflictException('No se puede eliminar: tiene retenciones de documentos asociadas');
    }

    await tenantDb.tax.delete({ where: { id } });

    return { message: 'Impuesto eliminado exitosamente' };
  }
}
