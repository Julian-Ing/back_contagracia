import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantContextService } from '@contagracia/shared-modules';

@Injectable()
export class UnitsService {
  constructor(private readonly tenantContext: TenantContextService) {}

  private async getTenantDb(companyId: string) {
    const tenantDb = await this.tenantContext.getTenantClient(companyId);
    if (!tenantDb) {
      throw new NotFoundException('Empresa no encontrada o inactiva');
    }
    return tenantDb;
  }

  async findAll(companyId: string) {
    const tenantDb = await this.getTenantDb(companyId);
    return tenantDb.productUnit.findMany({
      where: { is_active: true },
      orderBy: { name: 'asc' },
    });
  }
}
