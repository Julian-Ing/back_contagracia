import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { TenantPrismaService } from '../tenant/tenant-prisma.service';
import {
  CreateOpportunityAutomationDto,
  UpdateOpportunityAutomationDto,
} from './dto/opportunity-automation.dto';
import {
  CreateActivityAutomationDto,
  UpdateActivityAutomationDto,
} from './dto/activity-automation.dto';
import {
  CreateFormAutomationDto,
  UpdateFormAutomationDto,
} from './dto/form-automation.dto';

@Injectable()
export class AutomationsService {
  private readonly logger = new Logger(AutomationsService.name);

  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  // ============================================
  // Opportunity Automations
  // ============================================

  async findAllOpportunity(companyId: string) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    return db.crmOpportunityAutomation.findMany({
      where: { deleted_at: null },
      include: {
        email_template: { select: { id: true, name: true } },
        whatsapp_template: { select: { id: true, name: true } },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOneOpportunity(companyId: string, id: string) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    const automation = await db.crmOpportunityAutomation.findFirst({
      where: { id, deleted_at: null },
      include: {
        email_template: true,
        whatsapp_template: true,
      },
    });

    if (!automation) {
      throw new NotFoundException(`Automation ${id} not found`);
    }

    return automation;
  }

  async createOpportunity(companyId: string, dto: CreateOpportunityAutomationDto) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    return db.crmOpportunityAutomation.create({
      data: {
        name: dto.name,
        trigger_stage_from: dto.trigger_stage_from,
        trigger_stage_to: dto.trigger_stage_to,
        action_type: dto.action_type,
        email_template_id: dto.email_template_id,
        whatsapp_template_id: dto.whatsapp_template_id,
      },
      include: {
        email_template: { select: { id: true, name: true } },
        whatsapp_template: { select: { id: true, name: true } },
      },
    });
  }

  async updateOpportunity(companyId: string, id: string, dto: UpdateOpportunityAutomationDto) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    return db.crmOpportunityAutomation.update({
      where: { id },
      data: dto,
      include: {
        email_template: { select: { id: true, name: true } },
        whatsapp_template: { select: { id: true, name: true } },
      },
    });
  }

  async removeOpportunity(companyId: string, id: string) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    return db.crmOpportunityAutomation.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
  }

  async toggleOpportunity(companyId: string, id: string) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    const automation = await this.findOneOpportunity(companyId, id);
    return db.crmOpportunityAutomation.update({
      where: { id },
      data: { is_active: !automation.is_active },
    });
  }

  // ============================================
  // Activity Automations
  // ============================================

  async findAllActivity(companyId: string) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    return db.crmActivityAutomation.findMany({
      where: { deleted_at: null },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOneActivity(companyId: string, id: string) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    const automation = await db.crmActivityAutomation.findFirst({
      where: { id, deleted_at: null },
    });

    if (!automation) {
      throw new NotFoundException(`Automation ${id} not found`);
    }

    return automation;
  }

  async createActivity(companyId: string, dto: CreateActivityAutomationDto) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    return db.crmActivityAutomation.create({
      data: {
        name: dto.name,
        trigger_stage_from: dto.trigger_stage_from,
        trigger_stage_to: dto.trigger_stage_to,
        activity_type: dto.activity_type,
        activity_subject: dto.activity_subject,
        activity_description: dto.activity_description,
        days_offset: dto.days_offset ?? 0,
        assigned_to_rule: dto.assigned_to_rule ?? 'same_as_owner',
        assigned_to_user_id: dto.assigned_to_user_id,
      },
    });
  }

  async updateActivity(companyId: string, id: string, dto: UpdateActivityAutomationDto) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    return db.crmActivityAutomation.update({
      where: { id },
      data: dto,
    });
  }

  async removeActivity(companyId: string, id: string) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    return db.crmActivityAutomation.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
  }

  async toggleActivity(companyId: string, id: string) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    const automation = await this.findOneActivity(companyId, id);
    return db.crmActivityAutomation.update({
      where: { id },
      data: { is_active: !automation.is_active },
    });
  }

  // ============================================
  // Form Automations
  // ============================================

  async findAllForm(companyId: string) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    return db.crmFormAutomation.findMany({
      include: {
        form: { select: { id: true, name: true, slug: true } },
        auto_response_template: { select: { id: true, name: true } },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOneForm(companyId: string, id: string) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    const automation = await db.crmFormAutomation.findUnique({
      where: { id },
      include: {
        form: true,
        auto_response_template: true,
      },
    });

    if (!automation) {
      throw new NotFoundException(`Automation ${id} not found`);
    }

    return automation;
  }

  async findFormAutomationByFormId(companyId: string, formId: string) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    return db.crmFormAutomation.findUnique({
      where: { form_id: formId },
      include: {
        form: true,
        auto_response_template: true,
      },
    });
  }

  async createForm(companyId: string, dto: CreateFormAutomationDto) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    // Verificar que no exista ya una automatización para este formulario
    const existing = await db.crmFormAutomation.findUnique({
      where: { form_id: dto.form_id },
    });

    if (existing) {
      throw new ConflictException(`An automation already exists for form ${dto.form_id}`);
    }

    return db.crmFormAutomation.create({
      data: {
        form_id: dto.form_id,
        create_lead: dto.create_lead ?? true,
        lead_stage: dto.lead_stage,
        lead_source: dto.lead_source,
        create_opportunity: dto.create_opportunity ?? false,
        opportunity_stage_id: dto.opportunity_stage_id,
        opportunity_value: dto.opportunity_value,
        opportunity_probability: dto.opportunity_probability,
        assignment_type: dto.assignment_type ?? 'none',
        assigned_user_id: dto.assigned_user_id,
        round_robin_users: dto.round_robin_users,
        send_notification: dto.send_notification ?? false,
        auto_response_enabled: dto.auto_response_enabled ?? false,
        auto_response_template_id: dto.auto_response_template_id,
      },
      include: {
        form: { select: { id: true, name: true, slug: true } },
        auto_response_template: { select: { id: true, name: true } },
      },
    });
  }

  async updateForm(companyId: string, id: string, dto: UpdateFormAutomationDto) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    return db.crmFormAutomation.update({
      where: { id },
      data: dto,
      include: {
        form: { select: { id: true, name: true, slug: true } },
        auto_response_template: { select: { id: true, name: true } },
      },
    });
  }

  async removeForm(companyId: string, id: string) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    return db.crmFormAutomation.delete({
      where: { id },
    });
  }

  async toggleForm(companyId: string, id: string) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    const automation = await this.findOneForm(companyId, id);
    return db.crmFormAutomation.update({
      where: { id },
      data: { is_active: !automation.is_active },
    });
  }

  // ============================================
  // Automation Logs
  // ============================================

  async getLogs(
    companyId: string,
    filters?: {
      automation_type?: string;
      automation_id?: string;
      status?: string;
      from_date?: Date;
      to_date?: Date;
      limit?: number;
      offset?: number;
    },
  ) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const where: any = {};

    if (filters?.automation_type) {
      where.automation_type = filters.automation_type;
    }

    if (filters?.automation_id) {
      where.automation_id = filters.automation_id;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.from_date || filters?.to_date) {
      where.executed_at = {};
      if (filters?.from_date) {
        where.executed_at.gte = filters.from_date;
      }
      if (filters?.to_date) {
        where.executed_at.lte = filters.to_date;
      }
    }

    const [logs, total] = await Promise.all([
      db.crmAutomationLog.findMany({
        where,
        orderBy: { executed_at: 'desc' },
        take: filters?.limit ?? 50,
        skip: filters?.offset ?? 0,
      }),
      db.crmAutomationLog.count({ where }),
    ]);

    return { logs, total };
  }
}
