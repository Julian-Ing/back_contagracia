import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { TenantContextService } from '@contagracia/shared-modules';

// Tablas paramétricas disponibles en tenant DB (READ-ONLY, replicadas desde master)
const CATALOG_TABLES = {
  departments: 'department',
  municipalities: 'municipality',
  'type-document-identifications': 'typeDocumentIdentification',
  'type-organizations': 'typeOrganization',
  'type-regimes': 'typeRegime',
  'type-liabilities': 'typeLiability',
  banks: 'bank',
  'payment-methods': 'paymentMethod',
  'product-units': 'productUnit',
  'tax-types': 'taxType',
  taxes: 'tax',
} as const;

type CatalogTable = keyof typeof CATALOG_TABLES;

@Injectable()
export class CatalogsService {
  constructor(private readonly tenantContext: TenantContextService) {}

  getAvailableCatalogs() {
    return Object.keys(CATALOG_TABLES);
  }

  private async getModel(companyId: string, tableName: string) {
    const modelName = CATALOG_TABLES[tableName as CatalogTable];
    if (!modelName) {
      throw new BadRequestException(
        `Catálogo '${tableName}' no válido. Disponibles: ${Object.keys(CATALOG_TABLES).join(', ')}`,
      );
    }
    const tenantDb = await this.tenantContext.getTenantClient(companyId);
    if (!tenantDb) {
      throw new NotFoundException('Empresa no encontrada o inactiva');
    }
    return (tenantDb as any)[modelName];
  }

  async findAll(
    companyId: string,
    tableName: string,
    filters?: {
      is_active?: boolean;
      search?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const model = await this.getModel(companyId, tableName);
    const { is_active, search, page = 1, limit = 50 } = filters || {};

    const where: any = {};
    if (is_active !== undefined) {
      where.is_active = is_active;
    }
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const total = await model.count({ where: Object.keys(where).length > 0 ? where : undefined });

    const data = await model.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      orderBy: { name: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    };
  }

  async findOne(companyId: string, tableName: string, id: string | number) {
    const model = await this.getModel(companyId, tableName);
    const record = await model.findUnique({ where: { id } });
    if (!record) {
      throw new NotFoundException(`Registro con ID ${id} no encontrado en ${tableName}`);
    }
    return record;
  }

  async getDepartmentsByCountry(companyId: string, countryId: string) {
    const tenantDb = await this.tenantContext.getTenantClient(companyId);
    if (!tenantDb) throw new NotFoundException('Empresa no encontrada');
    return tenantDb.department.findMany({
      where: { country_id: countryId },
      orderBy: { name: 'asc' },
    });
  }

  async getMunicipalitiesByDepartment(companyId: string, departmentId: string) {
    const tenantDb = await this.tenantContext.getTenantClient(companyId);
    if (!tenantDb) throw new NotFoundException('Empresa no encontrada');
    return tenantDb.municipality.findMany({
      where: { department_id: departmentId },
      orderBy: { name: 'asc' },
    });
  }
}
