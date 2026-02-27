import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { TenantPrismaService } from '../tenant/tenant-prisma.service';
import { CreateUnitTypeDto } from './dto/create-unit-type.dto';
import { UpdateUnitTypeDto } from './dto/update-unit-type.dto';

@Injectable()
export class UnitTypesService {
  private readonly logger = new Logger(UnitTypesService.name);

  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  async findAll(
    companyId: string,
    params: {
      search?: string;
      is_active?: string;
      skip?: number;
      take?: number;
    },
  ) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const where: any = { company_id: companyId };

    // Filtro is_active
    if (params.is_active !== undefined) {
      where.is_active = params.is_active === 'true';
    }

    // Búsqueda por nombre o código
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { code: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      db.phUnitType.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: params.skip ? Number(params.skip) : undefined,
        take: params.take ? Number(params.take) : undefined,
      }),
      db.phUnitType.count({ where }),
    ]);

    return { data, total };
  }

  async findOne(companyId: string, id: string) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const unitType = await db.phUnitType.findUnique({
      where: { id },
    });

    if (!unitType) {
      throw new NotFoundException('Tipo de unidad no encontrado');
    }

    return unitType;
  }

  async create(companyId: string, dto: CreateUnitTypeDto) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    return db.phUnitType.create({
      data: {
        ...dto,
        company_id: companyId,
      },
    });
  }

  async update(companyId: string, id: string, dto: UpdateUnitTypeDto) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const existing = await db.phUnitType.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Tipo de unidad no encontrado');
    }

    return db.phUnitType.update({
      where: { id },
      data: dto,
    });
  }

  async remove(companyId: string, id: string) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const existing = await db.phUnitType.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Tipo de unidad no encontrado');
    }

    return db.phUnitType.update({
      where: { id },
      data: { is_active: false },
    });
  }
}
