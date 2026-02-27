import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { TenantPrismaService } from '../tenant/tenant-prisma.service';
import { CreateFeeConceptDto } from './dto/create-fee-concept.dto';
import { UpdateFeeConceptDto } from './dto/update-fee-concept.dto';

@Injectable()
export class FeeConceptsService {
  private readonly logger = new Logger(FeeConceptsService.name);

  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  async findAll(
    companyId: string,
    params: {
      search?: string;
      is_active?: string;
      is_recurring?: string;
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

    // Filtro is_recurring
    if (params.is_recurring !== undefined) {
      where.is_recurring = params.is_recurring === 'true';
    }

    // Búsqueda por nombre o código
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { code: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      db.phFeeConcept.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: params.skip ? Number(params.skip) : undefined,
        take: params.take ? Number(params.take) : undefined,
      }),
      db.phFeeConcept.count({ where }),
    ]);

    return { data, total };
  }

  async findOne(companyId: string, id: string) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const feeConcept = await db.phFeeConcept.findUnique({
      where: { id },
    });

    if (!feeConcept) {
      throw new NotFoundException('Concepto de cobro no encontrado');
    }

    return feeConcept;
  }

  async create(companyId: string, dto: CreateFeeConceptDto) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    return db.phFeeConcept.create({
      data: {
        ...dto,
        company_id: companyId,
      },
    });
  }

  async update(companyId: string, id: string, dto: UpdateFeeConceptDto) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const existing = await db.phFeeConcept.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Concepto de cobro no encontrado');
    }

    return db.phFeeConcept.update({
      where: { id },
      data: dto,
    });
  }

  async remove(companyId: string, id: string) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const existing = await db.phFeeConcept.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Concepto de cobro no encontrado');
    }

    return db.phFeeConcept.update({
      where: { id },
      data: { is_active: false },
    });
  }
}
