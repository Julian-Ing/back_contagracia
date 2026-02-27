import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { TenantPrismaService } from '../tenant/tenant-prisma.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMaintenancePlanDto, UpdateMaintenancePlanDto, CreateMaintenanceLogDto, UpdateMaintenanceLogDto } from './dto';

const PLAN_INCLUDE = {
  condominium: { select: { id: true, name: true } },
  unit: { select: { id: true, unit_number: true, condominium_id: true } },
  provider: { select: { id: true, name: true, identification_number: true } },
  _count: { select: { logs: true } },
};

const LOG_INCLUDE = {
  provider: { select: { id: true, name: true, identification_number: true } },
};

@Injectable()
export class MaintenancePlansService {
  private readonly logger = new Logger(MaintenancePlansService.name);

  constructor(
    private readonly tenantPrisma: TenantPrismaService,
    private readonly masterPrisma: PrismaService,
  ) {}

  // ─── Plans CRUD ───

  async findAll(
    companyId: string,
    query: {
      condominium_id?: string;
      category?: string;
      status?: string;
      skip?: number;
      take?: number;
    },
  ) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    const where: any = {};
    if (query.condominium_id) where.condominium_id = query.condominium_id;
    if (query.category) where.category = query.category;
    if (query.status) where.status = query.status;

    const skip = query.skip ?? 0;
    const take = query.take ?? 50;

    const [data, total] = await Promise.all([
      db.phMaintenancePlan.findMany({
        where,
        skip,
        take,
        orderBy: { next_maintenance_date: 'asc' },
        include: PLAN_INCLUDE,
      }),
      db.phMaintenancePlan.count({ where }),
    ]);

    return { data, total, skip, take };
  }

  async findOne(companyId: string, id: string) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    const plan = await db.phMaintenancePlan.findUnique({
      where: { id },
      include: {
        ...PLAN_INCLUDE,
        logs: {
          orderBy: { performed_date: 'desc' as const },
          take: 10,
          include: LOG_INCLUDE,
        },
      },
    });
    if (!plan) throw new NotFoundException('Plan de mantenimiento no encontrado');
    return plan;
  }

  async create(companyId: string, dto: CreateMaintenancePlanDto, userId: string) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    return db.phMaintenancePlan.create({
      data: {
        condominium_id: dto.condominium_id,
        provider_third_party_id: dto.provider_third_party_id || null,
        name: dto.name,
        description: dto.description,
        category: dto.category,
        frequency: dto.frequency,
        estimated_cost: dto.estimated_cost,
        last_maintenance_date: dto.last_maintenance_date
          ? new Date(dto.last_maintenance_date)
          : null,
        next_maintenance_date: new Date(dto.next_maintenance_date),
        document_url: dto.document_url,
        notes: dto.notes,
        created_by: userId,
      },
      include: PLAN_INCLUDE,
    });
  }

  async update(companyId: string, id: string, dto: UpdateMaintenancePlanDto) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    const existing = await db.phMaintenancePlan.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Plan de mantenimiento no encontrado');

    const data: any = { ...dto };
    if (dto.next_maintenance_date) data.next_maintenance_date = new Date(dto.next_maintenance_date);
    if (dto.last_maintenance_date) data.last_maintenance_date = new Date(dto.last_maintenance_date);
    if (dto.provider_third_party_id === '') data.provider_third_party_id = null;

    return db.phMaintenancePlan.update({
      where: { id },
      data,
      include: PLAN_INCLUDE,
    });
  }

  async remove(companyId: string, id: string) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    const exists = await db.phMaintenancePlan.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Plan de mantenimiento no encontrado');
    await db.phMaintenancePlan.delete({ where: { id } });
    return { message: 'Plan de mantenimiento eliminado exitosamente' };
  }

  // ─── Maintenance Logs ───

  async findPlanLogs(companyId: string, planId: string) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    return db.phMaintenanceLog.findMany({
      where: { plan_id: planId },
      orderBy: { performed_date: 'desc' },
      include: LOG_INCLUDE,
    });
  }

  async addLog(
    companyId: string,
    planId: string,
    dto: CreateMaintenanceLogDto,
    userId: string,
  ) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    const plan = await db.phMaintenancePlan.findUnique({ where: { id: planId } });
    if (!plan) throw new NotFoundException('Plan de mantenimiento no encontrado');

    const log = await db.phMaintenanceLog.create({
      data: {
        plan_id: planId,
        unit_ids: dto.unit_ids ?? [],
        performed_date: new Date(dto.performed_date),
        performed_by: dto.performed_by,
        provider_third_party_id: dto.provider_third_party_id || null,
        actual_cost: dto.actual_cost,
        observations: dto.observations,
        document_url: dto.document_url,
        created_by: userId,
      },
      include: LOG_INCLUDE,
    });

    // Auto-avance: calcular next_maintenance_date según frecuencia
    const nextDate = this.calculateNextDate(new Date(dto.performed_date), plan.frequency);
    await db.phMaintenancePlan.update({
      where: { id: planId },
      data: {
        last_maintenance_date: new Date(dto.performed_date),
        ...(nextDate ? { next_maintenance_date: nextDate } : {}),
      },
    });

    return log;
  }

  async updateLog(companyId: string, logId: string, dto: UpdateMaintenanceLogDto) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    const existing = await db.phMaintenanceLog.findUnique({ where: { id: logId } });
    if (!existing) throw new NotFoundException('Registro no encontrado');

    const data: any = { ...dto };
    if (dto.performed_date) data.performed_date = new Date(dto.performed_date);
    if (dto.unit_ids !== undefined) data.unit_ids = dto.unit_ids;
    if (dto.provider_third_party_id === '') data.provider_third_party_id = null;

    return db.phMaintenanceLog.update({
      where: { id: logId },
      data,
      include: LOG_INCLUDE,
    });
  }

  async removeLog(companyId: string, logId: string) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    const exists = await db.phMaintenanceLog.findUnique({ where: { id: logId } });
    if (!exists) throw new NotFoundException('Registro no encontrado');
    await db.phMaintenanceLog.delete({ where: { id: logId } });
    return { message: 'Registro eliminado' };
  }

  // ─── Helpers ───

  private calculateNextDate(fromDate: Date, frequency: string): Date | null {
    const next = new Date(fromDate);
    switch (frequency) {
      case 'mensual':
        next.setMonth(next.getMonth() + 1);
        break;
      case 'bimestral':
        next.setMonth(next.getMonth() + 2);
        break;
      case 'trimestral':
        next.setMonth(next.getMonth() + 3);
        break;
      case 'semestral':
        next.setMonth(next.getMonth() + 6);
        break;
      case 'anual':
        next.setFullYear(next.getFullYear() + 1);
        break;
      case 'unica':
        return null;
      default:
        return null;
    }
    return next;
  }
}
