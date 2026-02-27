import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { TenantContextService, getNextConsecutive, moveStock, createJournalEntry, createCostCenterMovement } from '@contagracia/shared-modules';
import { CreateProductDto, UpdateProductDto, CreateCombinationsDto, SetProductAttributesDto, AdjustStockDto } from './dto';

export interface ProductsQueryParams {
  search?: string;
  page?: number;
  limit?: number;
  category_id?: string;
  view_mode?: 'all' | 'products' | 'combinations';
  is_service?: boolean;
  parent_product_id?: string;
}

@Injectable()
export class ProductsService {
  constructor(private readonly tenantContext: TenantContextService) {}

  private async getTenantDb(companyId: string) {
    const tenantDb = await this.tenantContext.getTenantClient(companyId);
    if (!tenantDb) {
      throw new NotFoundException('Empresa no encontrada o inactiva');
    }
    return tenantDb;
  }

  // Fuzzy search — devuelve IDs que coinciden
  private async fuzzySearchIds(tenantDb: any, search: string, parentProductId?: string): Promise<string[]> {
    const searchPattern = `%${search}%`;
    const parentFilter = parentProductId
      ? tenantDb.$queryRaw<Array<{ id: string }>>`
          SELECT DISTINCT p."id" FROM "products" p
          LEFT JOIN "product_combination_attributes" pca ON pca."product_id" = p."id"
          LEFT JOIN "product_attribute_options" pao ON pao."id" = pca."product_attribute_option_id"
          WHERE p."is_active" = true
          AND p."parent_product_id" = ${parentProductId}::uuid
          AND (
            p."name" ILIKE ${searchPattern}
            OR p."consecutive" ILIKE ${searchPattern}
            OR p."barcode" ILIKE ${searchPattern}
            OR COALESCE(p."description", '') ILIKE ${searchPattern}
            OR pao."name" ILIKE ${searchPattern}
            OR word_similarity(${search}, COALESCE(p."name", '')) > 0.3
            OR word_similarity(${search}, COALESCE(p."barcode", '')) > 0.3
          )
        `
      : tenantDb.$queryRaw<Array<{ id: string }>>`
          SELECT "id" FROM "products"
          WHERE "is_active" = true
          AND (
            "name" ILIKE ${searchPattern}
            OR "consecutive" ILIKE ${searchPattern}
            OR "barcode" ILIKE ${searchPattern}
            OR COALESCE("description", '') ILIKE ${searchPattern}
            OR word_similarity(${search}, COALESCE("name", '')) > 0.3
            OR word_similarity(${search}, COALESCE("consecutive", '')) > 0.3
            OR word_similarity(${search}, COALESCE("barcode", '')) > 0.3
          )
        `;
    const matches = await parentFilter;
    return matches.map(r => r.id);
  }

  // Mapear producto a respuesta de lista
  private mapProductItem(p: any) {
    return {
      id: p.id,
      consecutive: p.consecutive,
      barcode: p.barcode,
      name: p.name,
      description: p.description,
      category: p.category,
      unit: p.unit,
      tax: p.tax,
      price: p.price,
      cost: p.cost,
      tax_included: p.tax_included,
      costing_type: p.costing_type,
      stock: p.stock,
      is_service: p.is_service,
      is_aiu: p.is_aiu,
      is_bag: p.is_bag,
      mode: p.mode,
      image_path: p.image_path || null,
      combinations_count: p._count?.combinations ?? 0,
      created_at: p.created_at,
    };
  }

  // Mapear combinación a respuesta de lista
  private mapCombinationItem(c: any) {
    return {
      id: c.id,
      consecutive: c.consecutive,
      barcode: c.barcode,
      name: c.name,
      price: c.price,
      cost: c.cost,
      stock: c.stock,
      mode: c.mode,
      image_path: c.image_path || null,
      parent_product_id: c.parent_product_id,
      attributes: (c.combination_attributes || []).map((ca: any) => ({
        attribute: ca.attribute_option?.attribute?.name,
        option: ca.attribute_option?.name,
        attribute_id: ca.attribute_option?.attribute?.id,
        option_id: ca.attribute_option?.id,
      })),
    };
  }

  /**
   * Lightweight paginated list for selects — returns parent/standalone products only.
   * Each parent includes its combinations with attribute labels.
   * Search matches against products AND their combinations (name, consecutive, barcode).
   * When a combination matches, its parent is returned in the results.
   */
  async findForSelect(companyId: string, options?: {
    is_service?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const tenantDb = await this.getTenantDb(companyId);
    const { search, page = 1, limit = 20 } = options || {};

    // Base filter: only active parent/standalone products (NOT combinations, NOT AIU)
    const where: any = { is_active: true, mode: 'PRODUCT', is_aiu: false, is_bag: false };
    if (options?.is_service !== undefined) {
      where.is_service = options.is_service;
    }

    if (search) {
      // Fuzzy search across ALL products (parents + combinations)
      const matchIds = await this.fuzzySearchIds(tenantDb, search);
      if (matchIds.length === 0) {
        return { data: [], total: 0, page, limit, hasMore: false };
      }

      // Resolve: if a COMBINATION matched, include its parent
      const matchedProducts = await tenantDb.product.findMany({
        where: { id: { in: matchIds }, is_active: true },
        select: { id: true, mode: true, parent_product_id: true },
      });

      const parentIds = new Set<string>();
      for (const m of matchedProducts) {
        if (m.mode === 'PRODUCT') {
          parentIds.add(m.id);
        } else if (m.parent_product_id) {
          parentIds.add(m.parent_product_id);
        }
      }

      if (parentIds.size === 0) {
        return { data: [], total: 0, page, limit, hasMore: false };
      }

      where.id = { in: [...parentIds] };
    }

    const selectFields = {
      id: true,
      name: true,
      consecutive: true,
      barcode: true,
      mode: true,
      is_service: true,
      parent_product_id: true,
      price: true,
      tax_included: true,
      tax_id: true,
      tax: {
        select: { id: true, name: true, rate: true, per_unit_amount: true },
      },
      unit: {
        select: { name: true },
      },
      combinations: {
        where: { is_active: true },
        select: {
          id: true,
          name: true,
          consecutive: true,
          barcode: true,
          mode: true,
          is_service: true,
          parent_product_id: true,
          price: true,
          tax_included: true,
          tax_id: true,
          tax: {
            select: { id: true, name: true, rate: true, per_unit_amount: true },
          },
          unit: {
            select: { name: true },
          },
          combination_attributes: {
            include: {
              attribute_option: {
                select: { name: true },
              },
            },
          },
        },
        orderBy: { name: 'asc' as const },
      },
    };

    const [products, total] = await Promise.all([
      tenantDb.product.findMany({
        where,
        select: selectFields,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      tenantDb.product.count({ where }),
    ]);

    const mapItem = (p: any) => ({
      value: p.id,
      label: p.name,
      description: p.consecutive,
      barcode: p.barcode ?? '',
      mode: p.mode,
      is_service: p.is_service,
      parent_product_id: p.parent_product_id ?? null,
      price: p.price?.toString() ?? '0',
      tax_included: p.tax_included ?? false,
      tax_id: p.tax?.id ?? null,
      tax_name: p.tax
        ? (p.tax.per_unit_amount ? `${p.tax.name} ($${Number(p.tax.per_unit_amount)}/ud)` : `${p.tax.name} (${p.tax.rate}%)`)
        : null,
      tax_rate: p.tax?.rate?.toString() ?? null,
      tax_per_unit_amount: p.tax?.per_unit_amount ? Number(p.tax.per_unit_amount) : null,
      unit_name: p.unit?.name ?? null,
    });

    const data = products.map((p: any) => ({
      ...mapItem(p),
      combinations: (p.combinations || []).map((c: any) => {
        const attrs = (c.combination_attributes || [])
          .map((ca: any) => ca.attribute_option?.name)
          .filter(Boolean);
        return {
          ...mapItem(c),
          label: attrs.length > 0 ? `${c.name} — ${attrs.join(' / ')}` : c.name,
        };
      }),
    }));

    return { data, total, page, limit, hasMore: page * limit < total };
  }

  async findAll(companyId: string, params: ProductsQueryParams = {}) {
    const { view_mode = 'all', search, page = 1, limit = 50, category_id, is_service } = params;

    if (view_mode === 'products') {
      return this.findAllFlat(companyId, params, 'PRODUCT');
    }
    if (view_mode === 'combinations') {
      return this.findAllFlat(companyId, params, 'COMBINATION');
    }
    return this.findAllHierarchical(companyId, params);
  }

  // view_mode=products | view_mode=combinations — lista plana
  private async findAllFlat(companyId: string, params: ProductsQueryParams, mode: string) {
    const tenantDb = await this.getTenantDb(companyId);
    const { search, page = 1, limit = 50, category_id, is_service, parent_product_id } = params;

    const where: any = { is_active: true, mode };
    if (category_id) where.category_id = category_id;
    if (is_service !== undefined) where.is_service = is_service;
    if (parent_product_id) where.parent_product_id = parent_product_id;

    if (search) {
      const matchIds = await this.fuzzySearchIds(tenantDb, search, parent_product_id);
      if (matchIds.length === 0) {
        return { data: [], total: 0, page, limit, totalPages: 0, hasMore: false };
      }
      where.id = { in: matchIds };
    }

    const include: any = {
      category: { select: { id: true, name: true } },
      unit: { select: { id: true, name: true } },
      tax: { select: { id: true, name: true, rate: true } },
      _count: { select: { combinations: true } },
    };

    // Combinaciones: incluir atributos y nombre del padre
    if (mode === 'COMBINATION') {
      include.combination_attributes = {
        include: {
          attribute_option: {
            include: { attribute: { select: { id: true, name: true } } },
          },
        },
      };
      include.parent_product = { select: { id: true, name: true, consecutive: true } };
    }

    const [data, total] = await Promise.all([
      tenantDb.product.findMany({
        where,
        include,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      tenantDb.product.count({ where }),
    ]);

    const mapped = data.map((p: any) => {
      const item: any = this.mapProductItem(p);
      if (mode === 'COMBINATION') {
        item.parent_product = p.parent_product || null;
        item.attributes = (p.combination_attributes || []).map((ca: any) => ({
          attribute: ca.attribute_option?.attribute?.name,
          option: ca.attribute_option?.name,
        }));
      }
      return item;
    });

    return {
      data: mapped,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    };
  }

  // view_mode=all — jerárquico: padres con combinaciones anidadas
  // Si la búsqueda coincide con una combinación, trae a su padre y todas sus combinaciones
  // Si coincide con un padre, trae todas sus combinaciones
  private async findAllHierarchical(companyId: string, params: ProductsQueryParams) {
    const tenantDb = await this.getTenantDb(companyId);
    const { search, page = 1, limit = 50, category_id, is_service } = params;

    const parentWhere: any = { is_active: true, mode: 'PRODUCT' };
    if (category_id) parentWhere.category_id = category_id;
    if (is_service !== undefined) parentWhere.is_service = is_service;

    if (search) {
      const matchIds = await this.fuzzySearchIds(tenantDb, search);
      if (matchIds.length === 0) {
        return { data: [], total: 0, page, limit, totalPages: 0, hasMore: false };
      }

      // Resolver IDs de padres: directos + padres de combinaciones que coincidieron
      const matchedProducts = await tenantDb.product.findMany({
        where: { id: { in: matchIds }, is_active: true },
        select: { id: true, mode: true, parent_product_id: true },
      });

      const parentIds = new Set<string>();
      for (const m of matchedProducts) {
        if (m.mode === 'PRODUCT') {
          parentIds.add(m.id);
        } else if (m.parent_product_id) {
          parentIds.add(m.parent_product_id);
        }
      }

      if (parentIds.size === 0) {
        return { data: [], total: 0, page, limit, totalPages: 0, hasMore: false };
      }

      parentWhere.id = { in: [...parentIds] };
    }

    const [parents, total] = await Promise.all([
      tenantDb.product.findMany({
        where: parentWhere,
        include: {
          category: { select: { id: true, name: true } },
          unit: { select: { id: true, name: true } },
          tax: { select: { id: true, name: true, rate: true } },
          _count: { select: { combinations: true } },
          combinations: {
            where: { is_active: true },
            include: {
              combination_attributes: {
                include: {
                  attribute_option: {
                    include: { attribute: { select: { id: true, name: true } } },
                  },
                },
              },
            },
            orderBy: { name: 'asc' },
          },
        },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      tenantDb.product.count({ where: parentWhere }),
    ]);

    const data = parents.map((p: any) => ({
      ...this.mapProductItem(p),
      combinations: (p.combinations || []).map((c: any) => this.mapCombinationItem(c)),
    }));

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    };
  }

  async findOne(companyId: string, id: string): Promise<any> {
    const tenantDb = await this.getTenantDb(companyId);

    const product = await tenantDb.product.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true } },
        unit: { select: { id: true, name: true } },
        tax: { select: { id: true, name: true, rate: true, per_unit_amount: true } },
        asset_account: { select: { code: true, name: true } },
        cogs_account: { select: { code: true, name: true } },
        revenue_account: { select: { code: true, name: true } },
        _count: { select: { movements: true } },
        combinations: {
          where: { is_active: true },
          include: {
            combination_attributes: {
              include: {
                attribute_option: {
                  include: { attribute: { select: { id: true, name: true } } },
                },
              },
            },
          },
          orderBy: { name: 'asc' },
        },
        combination_attributes: {
          include: {
            attribute_option: {
              include: { attribute: { select: { id: true, name: true } } },
            },
          },
        },
        attribute_assignments: {
          include: {
            attribute: {
              include: {
                options: { where: { is_active: true }, orderBy: { name: 'asc' } },
              },
            },
          },
          orderBy: { created_at: 'asc' },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    // Verificar si tiene stock en bodegas
    const stockRecords = await tenantDb.storageStock.findMany({
      where: { product_id: id },
      select: { stock: true },
    });
    const hasStock = stockRecords.some((ss: any) => Number(ss.stock) !== 0);

    // Verificar combinaciones
    const hasCombinations = product.mode === 'PRODUCT'
      ? (product.combinations?.length ?? 0) > 0
      : false;

    return {
      ...product,
      has_movements: product._count.movements > 0,
      has_stock: hasStock,
      has_combinations: hasCombinations,
    };
  }

  // ============================================
  // STOCK SUMMARY — GET /products/:id/stock-summary
  // ============================================

  async getStockSummary(companyId: string, productId: string, params: { search?: string; page?: number; limit?: number }) {
    const tenantDb = await this.getTenantDb(companyId);
    const hasInventoryManagement = await this.tenantContext.hasModule(companyId, 'inventory_management');

    const { search, page = 1, limit = 10 } = params;

    // Obtener el producto principal
    const product = await tenantDb.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true, barcode: true, description: true, stock: true, mode: true, is_active: true, is_service: true },
    });
    if (!product || !product.is_active) {
      throw new NotFoundException('Producto no encontrado');
    }

    // Determinar qué productos buscar: si es PRODUCT → él + combinaciones, si es COMBINATION → solo él
    const productIds: string[] = [productId];
    let combinationIds: string[] = [];

    if (product.mode === 'PRODUCT') {
      const combinations = await tenantDb.product.findMany({
        where: { parent_product_id: productId, is_active: true },
        select: { id: true },
      });
      combinationIds = combinations.map((c: any) => c.id);
      productIds.push(...combinationIds);
    }

    // Construir filtro de búsqueda fuzzy relacional
    const searchFilter = search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { barcode: { contains: search, mode: 'insensitive' as const } },
        { description: { contains: search, mode: 'insensitive' as const } },
        // Búsqueda por nombre de opción de atributo
        {
          combination_attributes: {
            some: {
              attribute_option: {
                name: { contains: search, mode: 'insensitive' as const },
              },
            },
          },
        },
        // Búsqueda por nombre de atributo
        {
          combination_attributes: {
            some: {
              attribute_option: {
                attribute: {
                  name: { contains: search, mode: 'insensitive' as const },
                },
              },
            },
          },
        },
      ],
    } : {};

    // Contar total
    const total = await tenantDb.product.count({
      where: {
        id: { in: productIds },
        is_active: true,
        ...searchFilter,
      },
    });

    // Obtener items paginados
    const items = await tenantDb.product.findMany({
      where: {
        id: { in: productIds },
        is_active: true,
        ...searchFilter,
      },
      select: {
        id: true,
        name: true,
        barcode: true,
        description: true,
        image_path: true,
        stock: true,
        mode: true,
        parent_product_id: true,
        combination_attributes: {
          include: {
            attribute_option: {
              include: { attribute: { select: { id: true, name: true } } },
            },
          },
        },
        ...(hasInventoryManagement ? {
          storage_stocks: {
            where: { stock: { not: 0 } },
            include: {
              storage: {
                select: {
                  id: true,
                  name: true,
                  consecutive: true,
                  warehouse: { select: { id: true, name: true } },
                },
              },
            },
            orderBy: { storage: { name: 'asc' as const } },
          },
        } : {}),
      },
      orderBy: [
        { parent_product_id: 'asc' }, // padre primero (null < non-null)
        { name: 'asc' },
      ],
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      has_inventory_management: hasInventoryManagement,
      items: items.map((item: any) => ({
        id: item.id,
        name: item.name,
        barcode: item.barcode,
        description: item.description,
        image_path: item.image_path || null,
        stock: item.stock,
        is_parent: item.parent_product_id === null,
        attributes: (item.combination_attributes || []).map((ca: any) => ({
          attribute: ca.attribute_option?.attribute?.name,
          option: ca.attribute_option?.name,
        })),
        storages: hasInventoryManagement
          ? (item.storage_stocks || []).map((ss: any) => ({
              storage_id: ss.storage.id,
              storage_name: ss.storage.name,
              storage_consecutive: ss.storage.consecutive,
              warehouse_name: ss.storage.warehouse?.name,
              stock: ss.stock,
            }))
          : undefined,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async create(companyId: string, dto: CreateProductDto) {
    const tenantDb = await this.getTenantDb(companyId);

    const hasAccounting = await this.tenantContext.hasModule(companyId, 'accounting');
    if (hasAccounting) {
      if (dto.is_service) {
        if (!dto.revenue_account_code) {
          throw new BadRequestException('La cuenta de ingresos es requerida');
        }
      } else {
        if (!dto.asset_account_code || !dto.cogs_account_code || !dto.revenue_account_code) {
          throw new BadRequestException('Las cuentas contables son requeridas (inventario, costo de ventas, ingresos)');
        }
      }
    }

    // Validar unit_id requerido para productos (no servicios)
    if (!dto.is_service && !dto.unit_id) {
      throw new BadRequestException('La unidad de medida es requerida para productos');
    }

    return tenantDb.$transaction(async (tx: any) => {
      // Código de barras único
      const existingBarcode = await tx.product.findUnique({ where: { barcode: dto.barcode } });
      if (existingBarcode) {
        throw new ConflictException(`Ya existe un producto con el código de barras "${dto.barcode}"`);
      }

      // Nombre único entre productos principales activos
      const existingName = await tx.product.findFirst({
        where: { name: dto.name, is_active: true, mode: 'PRODUCT' },
      });
      if (existingName) {
        throw new ConflictException('Ya existe un producto con ese nombre');
      }

      // Verificar FKs
      const [category, unit, tax] = await Promise.all([
        tx.productCategory.findUnique({ where: { id: dto.category_id } }),
        dto.unit_id ? tx.productUnit.findUnique({ where: { id: dto.unit_id } }) : null,
        tx.tax.findUnique({ where: { id: dto.tax_id } }),
      ]);
      if (!category) throw new BadRequestException('Categoría no encontrada');
      if (dto.unit_id && !unit) throw new BadRequestException('Unidad no encontrada');
      if (!tax) throw new BadRequestException('Impuesto no encontrado');

      // Validar cuentas contables existen
      if (hasAccounting) {
        const codes = [dto.asset_account_code!, dto.cogs_account_code!, dto.revenue_account_code!];
        const accounts = await tx.chartOfAccount.findMany({
          where: { code: { in: codes } },
          select: { code: true },
        });
        const foundCodes = accounts.map((a: any) => a.code);
        if (!foundCodes.includes(dto.asset_account_code!)) throw new BadRequestException(`Cuenta de inventario ${dto.asset_account_code} no encontrada`);
        if (!foundCodes.includes(dto.cogs_account_code!)) throw new BadRequestException(`Cuenta de costo ${dto.cogs_account_code} no encontrada`);
        if (!foundCodes.includes(dto.revenue_account_code!)) throw new BadRequestException(`Cuenta de ingresos ${dto.revenue_account_code} no encontrada`);
      }

      const consecutive = await getNextConsecutive(tx, 'product');

      return tx.product.create({
        data: {
          consecutive,
          name: dto.name,
          description: dto.description || null,
          barcode: dto.barcode,
          category_id: dto.category_id,
          unit_id: dto.unit_id || undefined,
          tax_id: dto.tax_id,
          price: dto.price,
          cost: dto.cost,
          tax_included: dto.tax_included,
          costing_type: dto.costing_type as any,
          is_service: dto.is_service,
          image_path: dto.image_path || null,
          asset_account_code: dto.asset_account_code || null,
          cogs_account_code: dto.cogs_account_code || null,
          revenue_account_code: dto.revenue_account_code || null,
        },
        include: {
          category: { select: { id: true, name: true } },
          unit: { select: { id: true, name: true } },
          tax: { select: { id: true, name: true, rate: true } },
        },
      });
    });
  }

  async update(companyId: string, id: string, dto: UpdateProductDto): Promise<any> {
    const tenantDb = await this.getTenantDb(companyId);

    const product = await tenantDb.product.findUnique({ where: { id } });
    if (!product || !product.is_active) {
      throw new NotFoundException('Producto no encontrado');
    }

    if (product.is_aiu || product.is_bag) {
      // Solo se permiten cambiar cuentas contables en productos del sistema
      const accountFields = ['asset_account_code', 'cogs_account_code', 'revenue_account_code'];
      const dtoKeys = Object.keys(dto).filter(k => (dto as any)[k] !== undefined);
      const hasNonAccountFields = dtoKeys.some(k => !accountFields.includes(k));
      if (hasNonAccountFields) {
        throw new BadRequestException('Este producto del sistema solo permite modificar sus cuentas contables');
      }
      const data: any = {};
      if (dto.asset_account_code !== undefined) data.asset_account_code = dto.asset_account_code || null;
      if (dto.cogs_account_code !== undefined) data.cogs_account_code = dto.cogs_account_code || null;
      if (dto.revenue_account_code !== undefined) data.revenue_account_code = dto.revenue_account_code || null;
      const updated = await tenantDb.product.update({ where: { id }, data });
      return this.findOne(companyId, updated.id);
    }

    if (dto.barcode && dto.barcode !== product.barcode) {
      const existingBarcode = await tenantDb.product.findFirst({
        where: { barcode: dto.barcode, id: { not: id } },
      });
      if (existingBarcode) {
        throw new ConflictException(`Ya existe un producto con el código de barras "${dto.barcode}"`);
      }
    }

    if (dto.name && dto.name !== product.name) {
      const existingName = await tenantDb.product.findFirst({
        where: { name: dto.name, is_active: true, mode: product.mode, id: { not: id } },
      });
      if (existingName) {
        throw new ConflictException('Ya existe un producto con ese nombre');
      }
    }

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description || null;
    if (dto.barcode !== undefined) data.barcode = dto.barcode;
    if (dto.category_id !== undefined) data.category_id = dto.category_id;
    if (dto.unit_id !== undefined) data.unit_id = dto.unit_id;
    if (dto.tax_id !== undefined) data.tax_id = dto.tax_id;
    if (dto.price !== undefined) data.price = dto.price;
    if (dto.cost !== undefined) data.cost = dto.cost;
    if (dto.tax_included !== undefined) data.tax_included = dto.tax_included;
    if (dto.costing_type !== undefined) data.costing_type = dto.costing_type;
    if (dto.is_service !== undefined) data.is_service = dto.is_service;
    if (dto.image_path !== undefined) data.image_path = dto.image_path || null;
    if (dto.asset_account_code !== undefined) data.asset_account_code = dto.asset_account_code || null;
    if (dto.cogs_account_code !== undefined) data.cogs_account_code = dto.cogs_account_code || null;
    if (dto.revenue_account_code !== undefined) data.revenue_account_code = dto.revenue_account_code || null;

    // Si se envían attribute_option_ids, actualizar combination_attributes (solo combinaciones)
    if (dto.attribute_option_ids && dto.attribute_option_ids.length > 0) {
      if (product.mode !== 'COMBINATION') {
        throw new BadRequestException('Solo se pueden asignar opciones de atributo a combinaciones');
      }

      // Validar opciones
      const options = await tenantDb.productAttributeOption.findMany({
        where: { id: { in: dto.attribute_option_ids }, is_active: true },
        include: { attribute: { select: { id: true } } },
      });
      if (options.length !== dto.attribute_option_ids.length) {
        throw new BadRequestException('Algunas opciones de atributo no existen o no están activas');
      }

      // No 2 opciones del mismo atributo
      const attributeIds = options.map((o: any) => o.attribute.id);
      if (new Set(attributeIds).size !== attributeIds.length) {
        throw new BadRequestException('No se pueden asignar 2 opciones del mismo atributo');
      }

      // Fingerprint check — no duplicar combinación existente
      const fingerprint = [...dto.attribute_option_ids].sort().join(',');
      const siblings = await tenantDb.product.findMany({
        where: { parent_product_id: product.parent_product_id, is_active: true, id: { not: id } },
        include: { combination_attributes: { select: { product_attribute_option_id: true } } },
      });
      for (const sibling of siblings) {
        const siblingFp = (sibling as any).combination_attributes.map((ca: any) => ca.product_attribute_option_id).sort().join(',');
        if (siblingFp === fingerprint) {
          throw new ConflictException('Ya existe otra combinación con esas opciones de atributo');
        }
      }

      // Reemplazar combination_attributes en transacción
      return tenantDb.$transaction(async (tx: any) => {
        if (Object.keys(data).length > 0) {
          await tx.product.update({ where: { id }, data });
        }
        await tx.productCombinationAttribute.deleteMany({ where: { product_id: id } });
        await tx.productCombinationAttribute.createMany({
          data: dto.attribute_option_ids!.map(optId => ({
            product_id: id,
            product_attribute_option_id: optId,
          })),
        });
        return tx.product.findUnique({
          where: { id },
          include: {
            category: { select: { id: true, name: true } },
            unit: { select: { id: true, name: true } },
            tax: { select: { id: true, name: true, rate: true } },
            combination_attributes: {
              include: { attribute_option: { include: { attribute: { select: { id: true, name: true } } } } },
            },
          },
        });
      });
    }

    return tenantDb.product.update({
      where: { id },
      data,
      include: {
        category: { select: { id: true, name: true } },
        unit: { select: { id: true, name: true } },
        tax: { select: { id: true, name: true, rate: true } },
      },
    });
  }

  async delete(companyId: string, id: string) {
    const tenantDb = await this.getTenantDb(companyId);

    return tenantDb.$transaction(async (tx: any) => {
      const product = await tx.product.findUnique({
        where: { id },
        include: {
          _count: { select: { movements: true, combinations: true } },
          storage_stocks: { select: { stock: true } },
        },
      });

      if (!product || !product.is_active) {
        throw new NotFoundException('Producto no encontrado');
      }

      if (product.is_aiu || product.is_bag) {
        throw new BadRequestException('Este producto del sistema no puede ser eliminado');
      }

      const hasMovements = product._count.movements > 0;
      const hasCombinations = product._count.combinations > 0;
      const hasStock = product.storage_stocks.some((ss: any) => Number(ss.stock) !== 0);

      // Verificar movimientos y stock en combinaciones hijas
      let childHasMovementsOrStock = false;
      if (hasCombinations) {
        const children = await tx.product.findMany({
          where: { parent_product_id: id },
          include: {
            _count: { select: { movements: true } },
            storage_stocks: { select: { stock: true } },
          },
        });
        childHasMovementsOrStock = children.some((c: any) =>
          c._count.movements > 0 || c.storage_stocks.some((ss: any) => Number(ss.stock) !== 0)
        );
      }

      const canHardDelete = !hasMovements && !hasCombinations && !hasStock;

      if (!canHardDelete) {
        // Soft delete — desactivar producto y combinaciones
        if (hasCombinations) {
          await tx.product.updateMany({
            where: { parent_product_id: id, is_active: true },
            data: { is_active: false },
          });
        }
        await tx.product.update({ where: { id }, data: { is_active: false } });
        return { message: 'Producto desactivado', type: 'soft_delete' };
      }

      // Hard delete — eliminar permanentemente (no tiene movimientos, combinaciones ni stock)
      await tx.productCombinationAttribute.deleteMany({ where: { product_id: id } });
      await tx.productAttributeAssignment.deleteMany({ where: { product_id: id } });
      await tx.storageStock.deleteMany({ where: { product_id: id } });
      await tx.product.delete({ where: { id } });

      return { message: 'Producto eliminado permanentemente', type: 'hard_delete' };
    });
  }

  async reactivate(companyId: string, id: string) {
    const tenantDb = await this.getTenantDb(companyId);

    const product = await tenantDb.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }
    if (product.is_active) {
      throw new BadRequestException('El producto ya está activo');
    }

    // Reactivar el producto
    await tenantDb.product.update({ where: { id }, data: { is_active: true } });

    // Si es padre, reactivar sus combinaciones también
    if (product.mode === 'PRODUCT') {
      await tenantDb.product.updateMany({
        where: { parent_product_id: id, is_active: false },
        data: { is_active: true },
      });
    }

    return { message: 'Producto reactivado' };
  }

  // ============================================
  // AJUSTE MANUAL DE STOCK — POST /products/:id/adjust-stock
  // ============================================

  async adjustStock(companyId: string, tenantUserId: string, productId: string, dto: AdjustStockDto) {
    const tenantDb = await this.getTenantDb(companyId);
    const hasInventoryManagement = await this.tenantContext.hasModule(companyId, 'inventory_management');
    const hasAccounting = await this.tenantContext.hasModule(companyId, 'accounting');
    const hasCostCentersModule = await this.tenantContext.hasModule(companyId, 'cost_centers');

    const adjustDate = dto.date ? new Date(dto.date + 'T00:00:00') : new Date();

    return tenantDb.$transaction(async (tx: any) => {
      // Cargar costo y cuenta contable del producto ANTES de mover stock
      const product = await tx.product.findUnique({
        where: { id: productId },
        select: { cost: true, asset_account_code: true },
      });
      const productCost = Number(product?.cost ?? 0);

      const result = await moveStock({
        tx,
        productId,
        direction: dto.direction,
        quantity: dto.quantity,
        typeKey: 'adjustment',
        storageId: dto.storage_id,
        notes: dto.reason,
        date: adjustDate,
        hasInventoryManagement,
        userId: tenantUserId,
      });

      // Asiento contable
      const ccTypeKey = dto.direction === 'IN' ? 'income' : 'cost';
      const ccTypeKeyForJE = hasCostCentersModule && dto.cost_center_id ? ccTypeKey : undefined;

      if (hasAccounting && productCost > 0) {
        const assetAccountCode = product!.asset_account_code
          || (await tx.accountingConfig.findUnique({ where: { key: 'inventory_products' } }))!.account_code;

        const counterpartKey = dto.direction === 'IN' ? 'inventory_surplus_income' : 'inventory_shrinkage_cost';
        const counterpartCode = dto.counterpart_account_code
          || (await tx.accountingConfig.findUnique({ where: { key: counterpartKey } }))!.account_code;

        const amount = dto.quantity * productCost;
        const description = `Ajuste manual: ${dto.reason}`;

        const je = await createJournalEntry(tx, {
          date: adjustDate,
          description,
          type_key: 'inventory',
          reference_id: result.movementId,
          items: [
            {
              account_code: dto.direction === 'IN' ? assetAccountCode : counterpartCode,
              type: 'DEBIT' as const,
              amount,
              description,
              cost_center_id: dto.cost_center_id,
              cost_center_movement_type_key: ccTypeKeyForJE,
            },
            {
              account_code: dto.direction === 'IN' ? counterpartCode : assetAccountCode,
              type: 'CREDIT' as const,
              amount,
              description,
              cost_center_id: dto.cost_center_id,
              cost_center_movement_type_key: ccTypeKeyForJE,
            },
          ],
        });

        // CC movements
        if (hasCostCentersModule && dto.cost_center_id) {
          const ccType = await tx.costCenterMovementType.findUnique({
            where: { key: ccTypeKey },
            select: { nature: true },
          });
          const nature = ccType?.nature || 'DEBIT';

          const sides = [
            { type: 'DEBIT' as const },
            { type: 'CREDIT' as const },
          ];

          const jeItems = await tx.journalEntryItem.findMany({
            where: { journal_entry_id: je.id },
            select: { id: true, type: true },
          });

          for (const side of sides) {
            const sign = side.type === nature ? 'POSITIVE' : 'NEGATIVE';
            const ccMov = await createCostCenterMovement(tx, {
              cost_center_id: dto.cost_center_id,
              movement_date: adjustDate,
              type_key: ccTypeKey,
              reference_type_key: 'journal_entry',
              sign,
              amount,
              reference_id: je.id,
              description,
            });

            const jeItem = jeItems.find((j: any) => j.type === side.type);
            if (jeItem) {
              await tx.journalEntryItem.update({
                where: { id: jeItem.id },
                data: { cost_center_movement_id: ccMov.id },
              });
            }
          }
        }
      }

      return {
        consecutive: result.consecutive,
        newProductStock: result.newProductStock,
        newStorageStock: result.newStorageStock,
      };
    });
  }

  // ============================================
  // COMBINACIONES — GET fingerprints + POST create
  // ============================================

  async getCombinationFingerprints(companyId: string, parentId: string): Promise<string[]> {
    const tenantDb = await this.getTenantDb(companyId);
    const existing = await tenantDb.product.findMany({
      where: { parent_product_id: parentId, is_active: true },
      select: {
        combination_attributes: {
          select: { product_attribute_option_id: true },
        },
      },
    });
    return existing.map((c: any) =>
      c.combination_attributes.map((ca: any) => ca.product_attribute_option_id).sort().join(',')
    );
  }

  async createCombinations(companyId: string, parentId: string, dto: CreateCombinationsDto) {
    const tenantDb = await this.getTenantDb(companyId);

    return tenantDb.$transaction(async (tx: any) => {
      // Validar padre
      const parent = await tx.product.findUnique({ where: { id: parentId } });
      if (!parent || !parent.is_active) {
        throw new NotFoundException('Producto padre no encontrado');
      }
      if (parent.mode !== 'PRODUCT') {
        throw new BadRequestException('Solo se pueden crear combinaciones en productos principales');
      }
      if (parent.is_service) {
        throw new BadRequestException('Los servicios no pueden tener combinaciones');
      }

      // Cargar opciones referenciadas
      const allOptionIds = [...new Set(dto.combinations.flatMap(c => c.attribute_option_ids))];
      const options = await tx.productAttributeOption.findMany({
        where: { id: { in: allOptionIds }, is_active: true },
        include: { attribute: { select: { id: true, name: true } } },
      });
      const optionMap = new Map(options.map((o: any) => [o.id, o]));

      for (const combo of dto.combinations) {
        // Verificar que todas las opciones existen
        for (const optId of combo.attribute_option_ids) {
          if (!optionMap.has(optId)) {
            throw new BadRequestException(`Opción de atributo ${optId} no encontrada`);
          }
        }

        // No 2 opciones del mismo atributo
        const attributeIds = combo.attribute_option_ids.map(id => (optionMap.get(id) as any).attribute.id);
        if (new Set(attributeIds).size !== attributeIds.length) {
          throw new BadRequestException(`La combinación "${combo.name}" tiene 2 opciones del mismo atributo`);
        }
      }

      // Fingerprints existentes — dentro de tx para evitar race condition
      const existingCombinations = await tx.product.findMany({
        where: { parent_product_id: parentId, is_active: true },
        include: { combination_attributes: { select: { product_attribute_option_id: true } } },
      });
      const existingFingerprints = new Set(
        existingCombinations.map((c: any) =>
          c.combination_attributes.map((ca: any) => ca.product_attribute_option_id).sort().join(',')
        )
      );

      // No duplicados (existentes ni entre sí)
      const newFingerprints = new Set<string>();
      for (const combo of dto.combinations) {
        const fingerprint = [...combo.attribute_option_ids].sort().join(',');
        if (existingFingerprints.has(fingerprint)) {
          throw new ConflictException(`La combinación "${combo.name}" ya existe para este producto`);
        }
        if (newFingerprints.has(fingerprint)) {
          throw new ConflictException(`Combinaciones duplicadas en la solicitud: "${combo.name}"`);
        }
        newFingerprints.add(fingerprint);
      }

      // Códigos de barras únicos
      const barcodes = dto.combinations.map(c => c.barcode);
      const existingBarcodes = await tx.product.findMany({
        where: { barcode: { in: barcodes } },
        select: { barcode: true },
      });
      if (existingBarcodes.length > 0) {
        throw new ConflictException(`Códigos de barras duplicados: ${existingBarcodes.map((s: any) => s.barcode).join(', ')}`);
      }

      // Crear combinaciones
      const created: any[] = [];

      for (const combo of dto.combinations) {
        const consecutive = await getNextConsecutive(tx, 'product');

        const product = await tx.product.create({
          data: {
            consecutive,
            name: combo.name,
            barcode: combo.barcode,
            description: combo.description ?? parent.description,
            price: combo.price,
            cost: combo.cost,
            mode: 'COMBINATION',
            is_service: false,
            image_path: combo.image_path || null,
            parent_product_id: parentId,
            category_id: combo.category_id ?? parent.category_id,
            unit_id: combo.unit_id ?? parent.unit_id,
            tax_id: combo.tax_id ?? parent.tax_id,
            tax_included: combo.tax_included ?? parent.tax_included,
            costing_type: combo.costing_type ?? parent.costing_type,
            asset_account_code: combo.asset_account_code ?? parent.asset_account_code,
            cogs_account_code: combo.cogs_account_code ?? parent.cogs_account_code,
            revenue_account_code: combo.revenue_account_code ?? parent.revenue_account_code,
            combination_attributes: {
              create: combo.attribute_option_ids.map(optId => ({
                product_attribute_option_id: optId,
              })),
            },
          },
          include: {
            combination_attributes: {
              include: {
                attribute_option: {
                  include: { attribute: { select: { id: true, name: true } } },
                },
              },
            },
          },
        });

        created.push(product);
      }

      return { created: created.length, combinations: created };
    });
  }

  // ============================================
  // ATRIBUTOS ASIGNADOS — GET/PUT /products/:id/attributes
  // ============================================

  async getProductAttributes(companyId: string, productId: string) {
    const tenantDb = await this.getTenantDb(companyId);

    const product = await tenantDb.product.findUnique({ where: { id: productId } });
    if (!product || !product.is_active) {
      throw new NotFoundException('Producto no encontrado');
    }
    if (product.mode !== 'PRODUCT') {
      throw new BadRequestException('Solo los productos principales pueden tener atributos asignados');
    }

    const assignments = await tenantDb.productAttributeAssignment.findMany({
      where: { product_id: productId },
      include: {
        attribute: {
          include: {
            options: {
              where: { is_active: true },
              orderBy: { name: 'asc' },
            },
          },
        },
      },
      orderBy: { created_at: 'asc' },
    });

    return assignments.map((a: any) => ({
      id: a.attribute.id,
      name: a.attribute.name,
      options: a.attribute.options.map((o: any) => ({
        id: o.id,
        name: o.name,
      })),
    }));
  }

  async setProductAttributes(companyId: string, productId: string, dto: SetProductAttributesDto) {
    const tenantDb = await this.getTenantDb(companyId);

    const product = await tenantDb.product.findUnique({ where: { id: productId } });
    if (!product || !product.is_active) {
      throw new NotFoundException('Producto no encontrado');
    }
    if (product.mode !== 'PRODUCT') {
      throw new BadRequestException('Solo los productos principales pueden tener atributos asignados');
    }

    // Validar que todos los atributos existen y están activos
    if (dto.attribute_ids.length > 0) {
      const attrs = await tenantDb.productAttribute.findMany({
        where: { id: { in: dto.attribute_ids }, is_active: true },
      });
      if (attrs.length !== dto.attribute_ids.length) {
        throw new BadRequestException('Uno o más atributos no encontrados o inactivos');
      }
    }

    // Reemplazar todas las asignaciones en una transacción
    await tenantDb.$transaction(async (tx: any) => {
      await tx.productAttributeAssignment.deleteMany({ where: { product_id: productId } });

      if (dto.attribute_ids.length > 0) {
        await tx.productAttributeAssignment.createMany({
          data: dto.attribute_ids.map(attrId => ({
            product_id: productId,
            product_attribute_id: attrId,
          })),
        });
      }
    });

    return this.getProductAttributes(companyId, productId);
  }

  // ============================================
  // KARDEX — GET /products/:id/kardex
  // ============================================

  async getKardex(companyId: string, productId: string, params: { search?: string; type_key?: string; page?: number; limit?: number }) {
    const tenantDb = await this.getTenantDb(companyId);
    const { search, type_key, page = 1, limit = 15 } = params;

    const product = await tenantDb.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });
    if (!product) throw new NotFoundException('Producto no encontrado');

    const where: any = { product_id: productId };
    if (type_key) where.type_key = type_key;

    if (search) {
      const searchPattern = `%${search}%`;
      const matchIds = await tenantDb.$queryRaw<Array<{ id: string }>>`
        SELECT DISTINCT m."id" FROM "product_movements" m
        LEFT JOIN "product_movement_types" t ON t."key" = m."type_key"
        LEFT JOIN "storages" s ON s."id" = m."storage_id"
        WHERE m."product_id" = ${productId}::uuid
        AND (
          m."consecutive" ILIKE ${searchPattern}
          OR COALESCE(m."notes", '') ILIKE ${searchPattern}
          OR COALESCE(m."reference_consecutive", '') ILIKE ${searchPattern}
          OR t."name" ILIKE ${searchPattern}
          OR COALESCE(s."name", '') ILIKE ${searchPattern}
          OR word_similarity(${search}, COALESCE(m."notes", '')) > 0.3
          OR word_similarity(${search}, COALESCE(m."consecutive", '')) > 0.3
        )
      `;
      if (matchIds.length === 0) {
        return { items: [], total: 0, page, limit, totalPages: 0 };
      }
      where.id = { in: matchIds.map(r => r.id) };
    }

    const [items, total] = await Promise.all([
      tenantDb.productMovement.findMany({
        where,
        include: {
          type: { select: { key: true, name: true } },
          storage: {
            select: {
              id: true,
              name: true,
              warehouse: { select: { name: true } },
            },
          },
        },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      tenantDb.productMovement.count({ where }),
    ]);

    return {
      items: items.map((m: any) => ({
        id: m.id,
        consecutive: m.consecutive,
        type_key: m.type.key,
        type_name: m.type.name,
        direction: m.direction,
        quantity: Number(m.quantity),
        date: m.date,
        storage: m.storage ? {
          id: m.storage.id,
          name: m.storage.name,
          warehouse_name: m.storage.warehouse?.name,
        } : null,
        reference_id: m.reference_id,
        reference_consecutive: m.reference_consecutive,
        notes: m.notes,
        created_at: m.created_at,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ============================================
  // MOVEMENT TYPES — GET /products/movement-types
  // ============================================

  async getMovementTypes(companyId: string) {
    const tenantDb = await this.getTenantDb(companyId);
    return tenantDb.productMovementType.findMany({
      orderBy: { name: 'asc' },
    });
  }

  // ────── Top Selling ──────

  async topSelling(companyId: string, params: {
    limit?: number;
    from?: string;
    to?: string;
    storage_id?: string;
  } = {}) {
    const tenantDb = await this.getTenantDb(companyId);
    const { limit = 10, from, to, storage_id } = params;

    const conditions: string[] = [
      `m."direction" = 'OUT'`,
      `m."type_key" = 'sale'`,
    ];
    const values: any[] = [];

    if (from) {
      values.push(from);
      conditions.push(`m."date" >= $${values.length}::date`);
    }
    if (to) {
      values.push(to);
      conditions.push(`m."date" <= $${values.length}::date`);
    }
    if (storage_id) {
      values.push(storage_id);
      conditions.push(`m."storage_id" = $${values.length}::uuid`);
    }

    values.push(limit);
    const limitParam = `$${values.length}`;

    const query = `
      SELECT
        p."id",
        p."consecutive",
        p."barcode",
        p."name",
        p."price",
        p."is_service",
        SUM(m."quantity") as total_quantity,
        COUNT(m."id") as total_movements
      FROM "product_movements" m
      INNER JOIN "products" p ON p."id" = m."product_id" AND p."is_active" = true
      WHERE ${conditions.join(' AND ')}
      GROUP BY p."id", p."consecutive", p."barcode", p."name", p."price", p."is_service"
      ORDER BY total_quantity DESC
      LIMIT ${limitParam}
    `;

    const results = await tenantDb.$queryRawUnsafe(query, ...values);

    return (results as any[]).map((r: any) => ({
      id: r.id,
      consecutive: r.consecutive,
      barcode: r.barcode,
      name: r.name,
      price: Number(r.price),
      is_service: r.is_service,
      total_quantity: Number(r.total_quantity),
      total_movements: Number(r.total_movements),
    }));
  }
}
