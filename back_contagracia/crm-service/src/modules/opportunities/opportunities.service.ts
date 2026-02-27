import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TenantPrismaService } from '../tenant/tenant-prisma.service';
import { CreateOpportunityDto } from './dto/create-opportunity.dto';
import { UpdateOpportunityDto } from './dto/update-opportunity.dto';
import { ChangeOpportunityStageDto } from './dto/change-stage.dto';
import { OpportunityStageChangedEvent, CRM_EVENTS } from '../automations/events/automation.events';

@Injectable()
export class OpportunitiesService {
  private readonly logger = new Logger(OpportunitiesService.name);

  constructor(
    private readonly tenantPrisma: TenantPrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async findAll(companyId: string, userId: string, params: any): Promise<any> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const where: any = { is_active: true };

    if (params.stage_id) where.stage_id = params.stage_id;
    if (params.assigned_to) where.assigned_to = params.assigned_to;

    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { third_party: { name: { contains: params.search, mode: 'insensitive' } } },
      ];
    }

    const [rawData, total] = await Promise.all([
      db.crmOpportunity.findMany({
        where,
        skip: params.skip,
        take: params.take || 20,
        include: {
          stage: true,
          third_party: true,
          assigned_user: true,
          cost_center: true,
        },
        orderBy: { created_at: 'desc' },
      }),
      db.crmOpportunity.count({ where }),
    ]);

    // Convert Decimal fields to numbers for JSON serialization
    const data = rawData.map((opp) => ({
      ...opp,
      expected_value: opp.expected_value ? Number(opp.expected_value) : null,
      probability: opp.probability ? Number(opp.probability) : null,
    }));

    return { data, total };
  }

  async getKanban(companyId: string): Promise<any> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const stages = await db.crmOpportunityStage.findMany({
      where: { is_active: true },
      orderBy: { position: 'asc' },
      include: {
        opportunities: {
          where: { is_active: true },
          include: { third_party: true },
          orderBy: { created_at: 'desc' },
        },
      },
    });

    return { stages };
  }

  async findOne(companyId: string, id: string): Promise<any> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const opportunity = await db.crmOpportunity.findFirst({
      where: { id, is_active: true },
      include: {
        stage: true,
        lead: true,
        third_party: true,
        activities: {
          where: { is_active: true },
          orderBy: { created_at: 'desc' },
          take: 10,
        },
        assigned_user: true,
        cost_center: true,
      },
    });

    if (!opportunity) {
      throw new NotFoundException('Oportunidad no encontrada');
    }

    return opportunity;
  }

  async create(companyId: string, userId: string, dto: CreateOpportunityDto): Promise<any> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    return db.crmOpportunity.create({
      data: {
        name: dto.name,
        stage_id: dto.stage_id,
        expected_value: dto.expected_value,
        third_party_id: dto.third_party_id,
        lead_id: dto.lead_id,
        probability: dto.probability || 0,
        close_date: dto.close_date ? new Date(dto.close_date) : undefined,
        assigned_to: dto.assigned_to,
        cost_center_id: dto.cost_center_id,
        created_by: userId,
        history: [
          {
            from: null,
            to: dto.stage_id,
            changed_by: userId,
            changed_at: new Date().toISOString(),
          },
        ],
      },
      include: { stage: true, third_party: true },
    });
  }

  async update(companyId: string, id: string, userId: string, dto: UpdateOpportunityDto): Promise<any> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const opportunity = await db.crmOpportunity.findFirst({
      where: { id, is_active: true },
    });

    if (!opportunity) {
      throw new NotFoundException('Oportunidad no encontrada');
    }

    const data: any = { ...dto, updated_by: userId };
    if (dto.close_date) data.close_date = new Date(dto.close_date);

    return db.crmOpportunity.update({
      where: { id },
      data,
      include: { stage: true, third_party: true },
    });
  }

  async changeStage(companyId: string, id: string, userId: string, dto: ChangeOpportunityStageDto): Promise<any> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const opportunity = await db.crmOpportunity.findFirst({
      where: { id, is_active: true },
      include: { third_party: true },
    });

    if (!opportunity) {
      throw new NotFoundException('Oportunidad no encontrada');
    }

    const newStage = await db.crmOpportunityStage.findUnique({
      where: { id: dto.stage_id },
    });

    if (!newStage) {
      throw new NotFoundException('Etapa no encontrada');
    }

    if (newStage.is_lost && !dto.lost_reason) {
      throw new BadRequestException('Se requiere una razon de perdida para esta etapa');
    }

    const fromStageId = opportunity.stage_id;
    const currentHistory = (opportunity.history as any[]) || [];
    const newHistory = [
      ...currentHistory,
      {
        from: fromStageId,
        to: dto.stage_id,
        changed_by: userId,
        changed_at: new Date().toISOString(),
      },
    ];

    const data: any = {
      stage_id: dto.stage_id,
      history: newHistory,
      updated_by: userId,
    };

    if (newStage.is_won) {
      data.won_at = new Date();
    }

    if (newStage.is_lost) {
      data.lost_reason = dto.lost_reason;
    }

    const updated = await db.crmOpportunity.update({
      where: { id },
      data,
      include: { stage: true, third_party: true },
    });

    // Emitir evento para disparar automatizaciones
    this.eventEmitter.emit(
      CRM_EVENTS.OPPORTUNITY_STAGE_CHANGED,
      new OpportunityStageChangedEvent(
        companyId,
        id,
        fromStageId,
        dto.stage_id,
        {
          id: updated.id,
          name: updated.name,
          expected_value: updated.expected_value ? Number(updated.expected_value) : undefined,
          expected_close_date: updated.close_date ?? undefined,
          assigned_to: updated.assigned_to ?? undefined,
        },
        updated.third_party ? {
          id: updated.third_party.id,
          name: updated.third_party.name || 'Sin nombre',
          email: updated.third_party.email ?? undefined,
          phone: updated.third_party.phone ?? undefined,
          whatsapp: updated.third_party.whatsapp_number ?? undefined,
          company_name: updated.third_party.company_name ?? undefined,
        } : null,
      ),
    );

    this.logger.log(`Stage changed for opportunity ${id}: ${fromStageId} -> ${dto.stage_id}`);

    return updated;
  }

  async remove(companyId: string, id: string, userId: string): Promise<any> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const opportunity = await db.crmOpportunity.findFirst({
      where: { id, is_active: true },
    });

    if (!opportunity) {
      throw new NotFoundException('Oportunidad no encontrada');
    }

    return db.crmOpportunity.update({
      where: { id },
      data: {
        is_active: false,
        deleted_at: new Date(),
        updated_by: userId,
      },
    });
  }
}
