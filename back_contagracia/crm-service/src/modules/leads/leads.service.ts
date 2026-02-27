import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { TenantPrismaService } from '../tenant/tenant-prisma.service';
import { CreateLeadDto, LeadStage } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { ChangeLeadStageDto } from './dto/change-stage.dto';
import { BulkAssignDto } from './dto/bulk-assign.dto';
import { ConvertLeadDto } from './dto/convert-lead.dto';

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);

  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  async findAll(companyId: string, userId: string, params: any): Promise<any> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const where: any = { is_active: true };

    if (params.stage) where.stage = params.stage;
    if (params.source) where.source = params.source;
    if (params.assigned_to) where.assigned_to = params.assigned_to;
    if (params.campaign_id) where.campaign_id = params.campaign_id;

    if (params.search) {
      where.third_party = {
        name: { contains: params.search, mode: 'insensitive' },
      };
    }

    const [data, total] = await Promise.all([
      db.crmLead.findMany({
        where,
        skip: params.skip,
        take: params.take || 20,
        include: {
          third_party: true,
          campaign: true,
          assigned_user: true,
        },
        orderBy: { created_at: 'desc' },
      }),
      db.crmLead.count({ where }),
    ]);

    return { data, total };
  }

  async findOne(companyId: string, id: string): Promise<any> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const lead = await db.crmLead.findFirst({
      where: { id, is_active: true },
      include: {
        third_party: true,
        campaign: true,
        activities: {
          where: { is_active: true },
          orderBy: { created_at: 'desc' },
          take: 10,
        },
        opportunities: {
          where: { is_active: true },
        },
        assigned_user: true,
      },
    });

    if (!lead) {
      throw new NotFoundException('Lead no encontrado');
    }

    return lead;
  }

  async create(companyId: string, userId: string, dto: CreateLeadDto): Promise<any> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    return db.crmLead.create({
      data: {
        third_party_id: dto.third_party_id,
        source: dto.source,
        stage: dto.stage || LeadStage.NEW,
        campaign_id: dto.campaign_id,
        assigned_to: dto.assigned_to,
        created_by: userId,
      },
      include: {
        third_party: true,
        campaign: true,
        assigned_user: true,
      },
    });
  }

  async update(companyId: string, id: string, userId: string, dto: UpdateLeadDto): Promise<any> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const lead = await db.crmLead.findFirst({
      where: { id, is_active: true },
    });

    if (!lead) {
      throw new NotFoundException('Lead no encontrado');
    }

    return db.crmLead.update({
      where: { id },
      data: {
        ...dto,
        updated_by: userId,
      },
      include: {
        third_party: true,
        campaign: true,
        assigned_user: true,
      },
    });
  }

  async changeStage(companyId: string, id: string, userId: string, dto: ChangeLeadStageDto): Promise<any> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const lead = await db.crmLead.findFirst({
      where: { id, is_active: true },
    });

    if (!lead) {
      throw new NotFoundException('Lead no encontrado');
    }

    const data: any = {
      stage: dto.stage,
      updated_by: userId,
    };

    if (dto.stage === LeadStage.CONVERTED) {
      data.converted_at = new Date();
    }

    return db.crmLead.update({
      where: { id },
      data,
      include: {
        third_party: true,
        campaign: true,
        assigned_user: true,
      },
    });
  }

  async convert(companyId: string, id: string, userId: string, dto: ConvertLeadDto): Promise<any> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const lead = await db.crmLead.findFirst({
      where: { id, is_active: true },
      include: { third_party: true },
    });

    if (!lead) {
      throw new NotFoundException('Lead no encontrado');
    }

    // Get the stage - either provided or first active
    let stageId = dto.stage_id;
    if (!stageId) {
      const firstActiveStage = await db.crmOpportunityStage.findFirst({
        where: { is_active: true, is_initial_stage: true },
        orderBy: { position: 'asc' },
      });

      if (!firstActiveStage) {
        const anyActiveStage = await db.crmOpportunityStage.findFirst({
          where: { is_active: true },
          orderBy: { position: 'asc' },
        });
        if (!anyActiveStage) {
          throw new BadRequestException('No hay etapas de oportunidad configuradas');
        }
        stageId = anyActiveStage.id;
      } else {
        stageId = firstActiveStage.id;
      }
    }

    const [opportunity] = await db.$transaction([
      db.crmOpportunity.create({
        data: {
          lead_id: lead.id,
          third_party_id: lead.third_party_id,
          name: dto.name,
          stage_id: stageId,
          expected_value: dto.expected_value,
          probability: (dto.probability ?? 25) / 100,
          close_date: dto.close_date ? new Date(dto.close_date) : null,
          assigned_to: dto.assigned_to || lead.assigned_to,
          cost_center_id: dto.cost_center_id || null,
          created_by: userId,
          history: [
            {
              from: null,
              to: stageId,
              changed_by: userId,
              changed_at: new Date().toISOString(),
            },
          ],
        },
        include: { stage: true, third_party: true },
      }),
      db.crmLead.update({
        where: { id },
        data: {
          stage: LeadStage.CONVERTED,
          converted_at: new Date(),
          updated_by: userId,
        },
      }),
    ]);

    return opportunity;
  }

  async bulkAssign(companyId: string, userId: string, dto: BulkAssignDto): Promise<any> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    await db.crmLead.updateMany({
      where: {
        id: { in: dto.leadIds },
        is_active: true,
      },
      data: {
        assigned_to: dto.assignedTo,
        updated_by: userId,
      },
    });

    return { message: `${dto.leadIds.length} leads asignados correctamente` };
  }

  async remove(companyId: string, id: string, userId: string): Promise<any> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const lead = await db.crmLead.findFirst({
      where: { id, is_active: true },
    });

    if (!lead) {
      throw new NotFoundException('Lead no encontrado');
    }

    return db.crmLead.update({
      where: { id },
      data: {
        is_active: false,
        deleted_at: new Date(),
        updated_by: userId,
      },
    });
  }
}
