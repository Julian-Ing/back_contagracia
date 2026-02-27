import { Injectable, Logger, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { TenantPrismaService } from '../tenant/tenant-prisma.service';
import { CreateActivityDto, CrmActivityStatus } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { ReminderSchedulerService } from '../automations/services/reminder-scheduler.service';

@Injectable()
export class ActivitiesService {
  private readonly logger = new Logger(ActivitiesService.name);

  constructor(
    private readonly tenantPrisma: TenantPrismaService,
    @Inject(forwardRef(() => ReminderSchedulerService))
    private readonly reminderScheduler: ReminderSchedulerService,
  ) {}

  async findAll(companyId: string, userId: string, params: any): Promise<any> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const where: any = { is_active: true };

    if (params.type) where.type = params.type;
    if (params.status) where.status = params.status;
    if (params.user_id) where.user_id = params.user_id;
    if (params.third_party_id) where.third_party_id = params.third_party_id;
    if (params.lead_id) where.lead_id = params.lead_id;
    if (params.opportunity_id) where.opportunity_id = params.opportunity_id;

    if (params.date_from || params.date_to) {
      where.due_date = {};
      if (params.date_from) where.due_date.gte = new Date(params.date_from);
      if (params.date_to) where.due_date.lte = new Date(params.date_to);
    }

    const [data, total] = await Promise.all([
      db.crmActivity.findMany({
        where,
        skip: params.skip,
        take: params.take || 20,
        include: { third_party: true, lead: true, opportunity: true },
        orderBy: { created_at: 'desc' },
      }),
      db.crmActivity.count({ where }),
    ]);

    return { data, total };
  }

  async findOne(companyId: string, id: string): Promise<any> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const activity = await db.crmActivity.findFirst({
      where: { id, is_active: true },
      include: { third_party: true, lead: true, opportunity: true },
    });

    if (!activity) {
      throw new NotFoundException('Actividad no encontrada');
    }

    return activity;
  }

  async create(companyId: string, userId: string, dto: CreateActivityDto): Promise<any> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const activity = await db.crmActivity.create({
      data: {
        type: dto.type,
        subject: dto.subject,
        description: dto.description,
        status: dto.status || CrmActivityStatus.PENDING,
        third_party_id: dto.third_party_id,
        lead_id: dto.lead_id,
        opportunity_id: dto.opportunity_id,
        user_id: dto.user_id,
        campaign_id: dto.campaign_id,
        due_date: dto.due_date ? new Date(dto.due_date) : undefined,
        metadata: dto.metadata,
        created_by: userId,
      },
      include: { third_party: true, lead: true, opportunity: true },
    });

    // Programar recordatorios si es una reunión
    if (dto.type === 'MEETING' && dto.due_date) {
      try {
        await this.reminderScheduler.scheduleReminders(companyId, activity.id);
      } catch (error) {
        this.logger.warn(`Failed to schedule reminders for activity ${activity.id}: ${error.message}`);
      }
    }

    return activity;
  }

  async update(companyId: string, id: string, userId: string, dto: UpdateActivityDto): Promise<any> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const activity = await db.crmActivity.findFirst({
      where: { id, is_active: true },
    });

    if (!activity) {
      throw new NotFoundException('Actividad no encontrada');
    }

    const data: any = { ...dto };
    if (dto.due_date) data.due_date = new Date(dto.due_date);

    const updated = await db.crmActivity.update({
      where: { id },
      data,
      include: { third_party: true, lead: true, opportunity: true },
    });

    // Reprogramar recordatorios si es una reunión y se cambió la fecha
    if (activity.type === 'MEETING' && dto.due_date) {
      try {
        await this.reminderScheduler.scheduleReminders(companyId, id);
      } catch (error) {
        this.logger.warn(`Failed to reschedule reminders for activity ${id}: ${error.message}`);
      }
    }

    return updated;
  }

  async complete(companyId: string, id: string, userId: string): Promise<any> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const activity = await db.crmActivity.findFirst({
      where: { id, is_active: true },
    });

    if (!activity) {
      throw new NotFoundException('Actividad no encontrada');
    }

    return db.crmActivity.update({
      where: { id },
      data: {
        status: CrmActivityStatus.COMPLETED,
        completed_at: new Date(),
      },
      include: { third_party: true, lead: true, opportunity: true },
    });
  }

  async cancel(companyId: string, id: string, userId: string): Promise<any> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const activity = await db.crmActivity.findFirst({
      where: { id, is_active: true },
    });

    if (!activity) {
      throw new NotFoundException('Actividad no encontrada');
    }

    // Cancelar recordatorios pendientes si es una reunión
    if (activity.type === 'MEETING') {
      try {
        await this.reminderScheduler.cancelReminders(companyId, id);
      } catch (error) {
        this.logger.warn(`Failed to cancel reminders for activity ${id}: ${error.message}`);
      }
    }

    return db.crmActivity.update({
      where: { id },
      data: {
        status: CrmActivityStatus.CANCELED,
      },
      include: { third_party: true, lead: true, opportunity: true },
    });
  }

  async remove(companyId: string, id: string, userId: string): Promise<any> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const activity = await db.crmActivity.findFirst({
      where: { id, is_active: true },
    });

    if (!activity) {
      throw new NotFoundException('Actividad no encontrada');
    }

    return db.crmActivity.update({
      where: { id },
      data: {
        is_active: false,
        deleted_at: new Date(),
      },
    });
  }
}
