import { Injectable, Logger } from '@nestjs/common';
import { TenantPrismaService } from '../tenant/tenant-prisma.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);

  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  async findAll(
    companyId: string,
    filters: {
      status?: string;
      channel?: string;
      skip?: number;
      take?: number;
    },
  ): Promise<any> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    const { status, channel, skip = 0, take = 20 } = filters;

    const where: any = { is_active: true };

    if (status) {
      where.status = status;
    }

    if (channel) {
      where.channel = channel;
    }

    const [campaigns, total] = await Promise.all([
      db.crmCampaign.findMany({
        where,
        skip,
        take,
        orderBy: { created_at: 'desc' },
      }),
      db.crmCampaign.count({ where }),
    ]);

    // Count active leads for each campaign
    const data = await Promise.all(
      campaigns.map(async (campaign) => {
        const leadsCount = await db.crmLead.count({
          where: {
            campaign_id: campaign.id,
            is_active: true,
          },
        });
        return {
          ...campaign,
          leads_count: leadsCount,
        };
      }),
    );

    return { data, total };
  }

  async findOne(companyId: string, id: string): Promise<any> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const campaign = await db.crmCampaign.findUniqueOrThrow({
      where: { id },
      include: {
        _count: { select: { leads: true } },
      },
    });

    const totalLeads = campaign._count.leads;

    let conversionRate = 0;
    if (totalLeads > 0) {
      const convertedLeads = await db.crmLead.count({
        where: {
          campaign_id: id,
          stage: 'CONVERTED',
        },
      });
      conversionRate = (convertedLeads / totalLeads) * 100;
    }

    return {
      ...campaign,
      stats: {
        total_leads: totalLeads,
        conversion_rate: Math.round(conversionRate * 100) / 100,
      },
    };
  }

  async create(companyId: string, dto: CreateCampaignDto, userId: string): Promise<any> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    return db.crmCampaign.create({
      data: {
        name: dto.name,
        description: dto.description,
        channel: dto.channel,
        target_audience: dto.target_audience,
        start_date: new Date(dto.start_date),
        end_date: dto.end_date ? new Date(dto.end_date) : undefined,
        budget: dto.budget,
        status: dto.status,
        whatsapp_template_sid: dto.whatsapp_template_sid,
        whatsapp_template_params: dto.whatsapp_template_params,
        created_by: userId,
      },
    });
  }

  async update(companyId: string, id: string, dto: UpdateCampaignDto, userId: string): Promise<any> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const data: any = { ...dto, updated_by: userId };

    if (dto.start_date) {
      data.start_date = new Date(dto.start_date);
    }
    if (dto.end_date) {
      data.end_date = new Date(dto.end_date);
    }

    return db.crmCampaign.update({
      where: { id },
      data,
    });
  }

  async remove(companyId: string, id: string): Promise<any> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    return db.crmCampaign.update({
      where: { id },
      data: {
        is_active: false,
        deleted_at: new Date(),
      },
    });
  }
}
