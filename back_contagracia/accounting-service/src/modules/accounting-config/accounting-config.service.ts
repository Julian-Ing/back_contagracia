import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantContextService } from '@contagracia/shared-modules';

export interface AccountingConfigItem {
  key: string;
  description: string;
  account_code: string | null;
  default: string | null;
  account?: { code: string; name: string } | null;
}

export interface UpdateAccountingConfigDto {
  account_code?: string | null;
}

@Injectable()
export class AccountingConfigService {
  constructor(private readonly tenantContext: TenantContextService) {}

  private async getTenantDb(companyId: string) {
    return this.tenantContext.getTenantClient(companyId);
  }

  /**
   * Listar configuraciones contables con paginación
   */
  async findAll(companyId: string, search?: string, page = 1, limit = 20): Promise<{
    data: AccountingConfigItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const tenantDb = await this.getTenantDb(companyId);

    const where: any = {};

    if (search) {
      where.OR = [
        { key: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      tenantDb.accountingConfig.findMany({
        where,
        orderBy: { key: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          account: { select: { code: true, name: true } },
        },
      }),
      tenantDb.accountingConfig.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Obtener una configuración por key
   */
  async findOne(companyId: string, key: string): Promise<AccountingConfigItem> {
    const tenantDb = await this.getTenantDb(companyId);

    const config = await tenantDb.accountingConfig.findUnique({
      where: { key },
      include: {
        account: { select: { code: true, name: true } },
      },
    });

    if (!config) {
      throw new NotFoundException(`Configuración ${key} no encontrada`);
    }

    return config;
  }

  /**
   * Actualizar cuenta(s) de una configuración
   */
  async update(companyId: string, key: string, dto: UpdateAccountingConfigDto): Promise<AccountingConfigItem> {
    const tenantDb = await this.getTenantDb(companyId);

    // Verificar que existe
    const existing = await tenantDb.accountingConfig.findUnique({ where: { key } });
    if (!existing) {
      throw new NotFoundException(`Configuración ${key} no encontrada`);
    }

    // Validar cuenta si se especifica
    if (dto.account_code) {
      const account = await tenantDb.chartOfAccount.findUnique({
        where: { code: dto.account_code },
      });
      if (!account) {
        throw new NotFoundException(`Cuenta ${dto.account_code} no encontrada`);
      }
    }

    const updated = await tenantDb.accountingConfig.update({
      where: { key },
      data: {
        account_code: dto.account_code !== undefined ? dto.account_code : undefined,
      },
      include: {
        account: { select: { code: true, name: true } },
      },
    });

    return updated;
  }

  /**
   * Resetear configuración a su valor por defecto
   */
  async resetToDefault(companyId: string, key: string): Promise<AccountingConfigItem> {
    const tenantDb = await this.getTenantDb(companyId);

    const existing = await tenantDb.accountingConfig.findUnique({ where: { key } });
    if (!existing) {
      throw new NotFoundException(`Configuración ${key} no encontrada`);
    }

    const updated = await tenantDb.accountingConfig.update({
      where: { key },
      data: {
        account_code: existing.default,
      },
      include: {
        account: { select: { code: true, name: true } },
      },
    });

    return updated;
  }
}
