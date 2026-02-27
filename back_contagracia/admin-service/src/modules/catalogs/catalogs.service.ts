import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Tablas paramétricas disponibles
const CATALOG_TABLES = {
  countries: 'country',
  departments: 'department',
  municipalities: 'municipality',
  'type-document-identifications': 'typeDocumentIdentification',
  'type-organizations': 'typeOrganization',
  'type-regimes': 'typeRegime',
  'type-liabilities': 'typeLiability',
  banks: 'bank',
  'payment-methods': 'paymentMethod',
  'economic-activities': 'economicActivity',
} as const;

type CatalogTable = keyof typeof CATALOG_TABLES;

@Injectable()
export class CatalogsService {
  constructor(private prisma: PrismaService) {}

  getAvailableCatalogs() {
    return Object.keys(CATALOG_TABLES);
  }

  private getModel(tableName: string) {
    const modelName = CATALOG_TABLES[tableName as CatalogTable];
    if (!modelName) {
      throw new BadRequestException(
        `Catálogo '${tableName}' no válido. Disponibles: ${Object.keys(CATALOG_TABLES).join(', ')}`,
      );
    }
    return (this.prisma as any)[modelName];
  }

  async findAll(
    tableName: string,
    filters?: {
      is_active?: boolean;
      search?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const model = this.getModel(tableName);
    const { is_active, search, page = 1, limit = 50 } = filters || {};

    // Construir where dinámicamente
    const where: any = {};

    // Filtro is_active
    if (is_active !== undefined) {
      where.is_active = is_active;
    }

    // Búsqueda por nombre (fuzzy con contains insensitive)
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    // Obtener total para paginación
    const total = await model.count({ where: Object.keys(where).length > 0 ? where : undefined });

    // Obtener registros con paginación
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

  async findOne(tableName: string, id: string | number) {
    const model = this.getModel(tableName);

    const record = await model.findUnique({
      where: { id },
    });

    if (!record) {
      throw new NotFoundException(
        `Registro con ID ${id} no encontrado en ${tableName}`,
      );
    }

    return record;
  }

  async create(tableName: string, data: Record<string, any>) {
    const model = this.getModel(tableName);

    try {
      return await model.create({ data });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new BadRequestException(
          'Ya existe un registro con ese código o identificador único',
        );
      }
      throw error;
    }
  }

  async update(tableName: string, id: string | number, data: Record<string, any>) {
    const model = this.getModel(tableName);

    // Verificar que existe
    const existing = await model.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(
        `Registro con ID ${id} no encontrado en ${tableName}`,
      );
    }

    try {
      return await model.update({
        where: { id },
        data,
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new BadRequestException(
          'Ya existe un registro con ese código o identificador único',
        );
      }
      throw error;
    }
  }

  async remove(tableName: string, id: string | number) {
    const model = this.getModel(tableName);

    // Verificar que existe
    const existing = await model.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(
        `Registro con ID ${id} no encontrado en ${tableName}`,
      );
    }

    try {
      return await model.delete({ where: { id } });
    } catch (error: any) {
      if (error.code === 'P2003') {
        throw new BadRequestException(
          'No se puede eliminar porque tiene registros relacionados',
        );
      }
      throw error;
    }
  }

  // Departamentos por país
  async getDepartmentsByCountry(countryId: string) {
    return this.prisma.department.findMany({
      where: { country_id: countryId },
      orderBy: { name: 'asc' },
    });
  }

  // Municipios por departamento
  async getMunicipalitiesByDepartment(departmentId: string) {
    return this.prisma.municipality.findMany({
      where: { department_id: departmentId },
      orderBy: { name: 'asc' },
    });
  }
}
