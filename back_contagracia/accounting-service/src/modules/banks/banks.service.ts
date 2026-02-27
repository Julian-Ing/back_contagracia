import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantContextService } from '@contagracia/shared-modules';

export interface BanksQueryParams {
  search?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class BanksService {
  constructor(private readonly tenantContext: TenantContextService) {}

  private async getTenantDb(companyId: string) {
    const tenantDb = await this.tenantContext.getTenantClient(companyId);
    if (!tenantDb) {
      throw new NotFoundException('Empresa no encontrada o inactiva');
    }
    return tenantDb;
  }

  async findAll(companyId: string, params: BanksQueryParams = {}) {
    const tenantDb = await this.getTenantDb(companyId);
    const { search, page = 1, limit = 50 } = params;

    const where: any = { is_active: true };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [banks, total] = await Promise.all([
      tenantDb.bank.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      tenantDb.bank.count({ where }),
    ]);

    return {
      data: banks.map((b) => ({
        id: b.id,
        code: b.code,
        name: b.name,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    };
  }
}
