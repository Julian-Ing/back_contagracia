import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { TenantContextService } from '@contagracia/shared-modules';

export interface ChartOfAccountsQueryParams {
  search?: string;
  type?: string;
  page?: number;
  limit?: number;
  /** Filtrar cuentas cuyo código empiece con este prefijo (ej: "13" para CxC) */
  code_prefix?: string;
  /** Filtrar cuentas que empiecen con cualquiera de estos prefijos (separados por coma) */
  include_prefixes?: string;
  /** Excluir cuentas que empiecen con cualquiera de estos prefijos (separados por coma) */
  exclude_prefixes?: string;
  /** Si es true, retorna lista plana sin árbol (para selects) */
  flat?: boolean;
}

export interface CreateAccountDto {
  code: string;
  name: string;
  type?: string;
  parent_code?: string | null;
}

export interface UpdateAccountDto {
  name?: string;
}

/**
 * Tipos de cuenta por primer dígito del código PUC colombiano
 */
const ACCOUNT_TYPE_BY_FIRST_DIGIT: Record<string, string> = {
  '1': 'ASSET',
  '2': 'LIABILITY',
  '3': 'EQUITY',
  '4': 'INCOME',
  '5': 'EXPENSE',
  '6': 'COST',
  '7': 'PRODUCTION_COST',
  '8': 'DEBTOR_ACCOUNTS',
  '9': 'CREDITOR_ACCOUNTS',
};

/**
 * Obtiene el código padre según la estructura PUC
 * Solo longitudes válidas: 1, 2, 4, 6, 8, 10...
 * - 1 dígito: sin padre
 * - 2 dígitos: padre es 1 dígito
 * - 4+ dígitos: padre es código - 2 últimos dígitos
 */
function getParentCode(code: string): string | null {
  if (!code || code.length <= 1) return null;
  if (code.length === 2) return code.charAt(0);
  return code.substring(0, code.length - 2);
}

/**
 * Verifica si la longitud del código es válida para PUC
 * Solo 1, 2, 4, 6, 8, 10... dígitos
 */
function isValidCodeLength(length: number): boolean {
  if (length === 1 || length === 2) return true;
  if (length >= 4 && length % 2 === 0) return true;
  return false;
}

@Injectable()
export class ChartOfAccountsService {
  constructor(private readonly tenantContext: TenantContextService) {}

  private async getTenantDb(companyId: string) {
    const tenantDb = await this.tenantContext.getTenantClient(companyId);
    if (!tenantDb) {
      throw new NotFoundException('Empresa no encontrada o inactiva');
    }
    return tenantDb;
  }

  /**
   * Listar cuentas con búsqueda, filtro y paginación
   */
  async findAll(companyId: string, params: ChartOfAccountsQueryParams = {}) {
    const tenantDb = await this.getTenantDb(companyId);
    const { search, type, page = 1, limit = 100, code_prefix, include_prefixes, exclude_prefixes, flat = false } = params;

    // Construir filtro WHERE
    const where: any = { is_active: true };
    const andConditions: any[] = [];

    if (type) {
      where.type = type;
    }

    // Filtro por prefijo único (legacy)
    if (code_prefix) {
      andConditions.push({ code: { startsWith: code_prefix } });
    }

    // Filtro de inclusión por múltiples prefijos (OR)
    if (include_prefixes) {
      const prefixes = include_prefixes.split(',').map(p => p.trim()).filter(Boolean);
      if (prefixes.length > 0) {
        andConditions.push({
          OR: prefixes.map(prefix => ({ code: { startsWith: prefix } })),
        });
      }
    }

    // Filtro de exclusión por múltiples prefijos (NOT startsWith para cada uno)
    if (exclude_prefixes) {
      const prefixes = exclude_prefixes.split(',').map(p => p.trim()).filter(Boolean);
      for (const prefix of prefixes) {
        andConditions.push({
          NOT: { code: { startsWith: prefix } },
        });
      }
    }

    // Búsqueda fuzzy por código o nombre (pg_trgm)
    if (search) {
      const searchPattern = `%${search}%`;
      const fuzzyMatches = await tenantDb.$queryRaw<Array<{ code: string }>>`
        SELECT "code" FROM "chart_of_accounts"
        WHERE "code" ILIKE ${searchPattern}
        OR "name" ILIKE ${searchPattern}
        OR word_similarity(${search}, COALESCE("name", '')) > 0.3
        OR word_similarity(${search}, COALESCE("code", '')) > 0.3
      `;
      const matchCodes = fuzzyMatches.map(r => r.code);
      if (matchCodes.length > 0) {
        andConditions.push({ code: { in: matchCodes } });
      } else {
        andConditions.push({ code: { in: [] } });
      }
    }

    // Combinar todas las condiciones AND
    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    // Obtener total para paginación
    const total = await tenantDb.chartOfAccount.count({ where });

    // Obtener cuentas filtradas
    const accounts = await tenantDb.chartOfAccount.findMany({
      where,
      orderBy: { code: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Si flat=true, retornar lista plana (para selects)
    if (flat) {
      return {
        data: accounts.map(a => ({
          code: a.code,
          name: a.name,
          type: a.type,
          parent_code: a.parent_code,
        })),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      };
    }

    // Si hay búsqueda o filtro, retornamos lista plana con info de ancestros
    if (search || type || code_prefix || include_prefixes || exclude_prefixes) {
      // Obtener códigos de padres necesarios
      const parentCodes = new Set<string>();
      for (const account of accounts) {
        let parentCode = account.parent_code;
        while (parentCode) {
          parentCodes.add(parentCode);
          const parent = await tenantDb.chartOfAccount.findUnique({
            where: { code: parentCode },
            select: { parent_code: true },
          });
          parentCode = parent?.parent_code || null;
        }
      }

      // Obtener datos de los padres
      const parents = parentCodes.size > 0
        ? await tenantDb.chartOfAccount.findMany({
            where: { code: { in: Array.from(parentCodes) } },
            orderBy: { code: 'asc' },
          })
        : [];

      // Combinar cuentas encontradas con sus padres
      const allAccounts = [...parents, ...accounts];
      const uniqueAccounts = Array.from(
        new Map(allAccounts.map((a) => [a.code, a])).values()
      ).sort((a, b) => a.code.localeCompare(b.code));

      // Construir árbol
      const tree = this.buildTree(uniqueAccounts, accounts.map(a => a.code));

      return {
        data: tree,
        total,
        filtered: accounts.length,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      };
    }

    // Sin filtros: construir árbol completo
    const allAccounts = await tenantDb.chartOfAccount.findMany({
      where: { is_active: true },
      orderBy: { code: 'asc' },
    });

    const tree = this.buildTree(allAccounts);

    return {
      data: tree,
      total: allAccounts.length,
      page: 1,
      limit: allAccounts.length,
      totalPages: 1,
      hasMore: false,
    };
  }

  /**
   * Construir árbol jerárquico
   */
  private buildTree(accounts: any[], matchedCodes?: string[]) {
    const accountMap = new Map<string, any>();
    const rootAccounts: any[] = [];
    const matchedSet = matchedCodes ? new Set(matchedCodes) : null;

    // Crear todos los nodos
    for (const account of accounts) {
      accountMap.set(account.code, {
        code: account.code,
        name: account.name,
        type: account.type,
        parent_code: account.parent_code,
        children: [],
        _matched: matchedSet ? matchedSet.has(account.code) : undefined,
      });
    }

    // Construir jerarquía
    for (const account of accounts) {
      const node = accountMap.get(account.code);
      if (account.parent_code && accountMap.has(account.parent_code)) {
        accountMap.get(account.parent_code).children.push(node);
      } else {
        rootAccounts.push(node);
      }
    }

    return rootAccounts;
  }

  /**
   * Obtener cuenta por código
   */
  async findOne(companyId: string, code: string): Promise<any> {
    const tenantDb = await this.getTenantDb(companyId);

    const account = await tenantDb.chartOfAccount.findUnique({
      where: { code },
      include: {
        parent: true,
        children: {
          where: { is_active: true },
          orderBy: { code: 'asc' },
        },
      },
    });

    if (!account) {
      throw new NotFoundException('Cuenta no encontrada');
    }

    return account;
  }

  /**
   * Eliminar cuenta permanentemente
   */
  async delete(companyId: string, code: string): Promise<{ message: string }> {
    const tenantDb = await this.getTenantDb(companyId);

    // Verificar cuenta con sus relaciones
    const account = await tenantDb.chartOfAccount.findUnique({
      where: { code },
      include: {
        children: { where: { is_active: true }, take: 1 },
        accounting_configs: { take: 1 },
        payroll_concepts_debit: { take: 1 },
        payroll_concepts_admin_debit: { take: 1 },
        payroll_concepts_credit: { take: 1 },
        journal_entry_items: { take: 1 },
      },
    });

    if (!account) {
      throw new NotFoundException('Cuenta no encontrada');
    }

    // Validaciones
    if (account.children.length > 0) {
      throw new ConflictException('No se puede eliminar: tiene subcuentas activas');
    }

    const inAccountingConfig = account.accounting_configs.length > 0;
    const inPayrollConcepts = account.payroll_concepts_debit.length > 0 ||
                              account.payroll_concepts_admin_debit.length > 0 ||
                              account.payroll_concepts_credit.length > 0;

    if (inAccountingConfig || inPayrollConcepts) {
      throw new ConflictException('No se puede eliminar: está en uso en configuración contable o conceptos de nómina');
    }

    if (account.journal_entry_items.length > 0) {
      throw new ConflictException('No se puede eliminar: tiene movimientos contables');
    }

    // Eliminar permanentemente
    await tenantDb.chartOfAccount.delete({
      where: { code },
    });

    return { message: 'Cuenta eliminada exitosamente' };
  }

  /**
   * Crear nueva cuenta
   */
  async create(companyId: string, dto: CreateAccountDto): Promise<any> {
    const tenantDb = await this.getTenantDb(companyId);

    // Validar código
    if (!dto.code || !/^\d+$/.test(dto.code)) {
      throw new BadRequestException('El código debe contener solo dígitos');
    }

    if (dto.code.charAt(0) === '0') {
      throw new BadRequestException('El código no puede empezar con 0');
    }

    // Validar longitud (solo 1, 2, 4, 6, 8...)
    if (!isValidCodeLength(dto.code.length)) {
      throw new BadRequestException('La longitud del código debe ser 1, 2, 4, 6, 8, 10... dígitos');
    }

    // Verificar si ya existe
    const existing = await tenantDb.chartOfAccount.findUnique({
      where: { code: dto.code },
    });

    if (existing) {
      throw new ConflictException('Ya existe una cuenta con este código');
    }

    // Detectar tipo automáticamente según primer dígito
    const firstDigit = dto.code.charAt(0);
    const detectedType = ACCOUNT_TYPE_BY_FIRST_DIGIT[firstDigit];

    if (!detectedType) {
      throw new BadRequestException('El primer dígito del código no es válido (debe ser 1-9)');
    }

    // Usar tipo detectado
    const accountType = detectedType;

    // Detectar padre automáticamente
    const parentCode = getParentCode(dto.code);

    // Si tiene padre, verificar que exista
    if (parentCode) {
      const parent = await tenantDb.chartOfAccount.findUnique({
        where: { code: parentCode },
      });

      if (!parent) {
        throw new BadRequestException(
          `La cuenta padre ${parentCode} no existe. Debe crearla primero.`,
        );
      }
    }

    // Crear la cuenta
    const account = await tenantDb.chartOfAccount.create({
      data: {
        code: dto.code,
        name: dto.name,
        type: accountType as any,
        parent_code: parentCode,
        is_active: true,
      },
    });

    return account;
  }

  /**
   * Actualizar cuenta (solo nombre)
   */
  async update(companyId: string, code: string, dto: UpdateAccountDto): Promise<any> {
    const tenantDb = await this.getTenantDb(companyId);

    // Verificar que existe
    const account = await tenantDb.chartOfAccount.findUnique({
      where: { code },
    });

    if (!account) {
      throw new NotFoundException('Cuenta no encontrada');
    }

    // Solo permitir actualizar el nombre
    const updated = await tenantDb.chartOfAccount.update({
      where: { code },
      data: {
        name: dto.name,
      },
    });

    return updated;
  }
}
