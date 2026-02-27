import { Injectable, Logger } from '@nestjs/common';
import { TenantPrismaService } from '../tenant/tenant-prisma.service';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  async getStats(companyId: string): Promise<any> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const [contacts, leads, opportunities, activities, wonOpportunities] =
      await Promise.all([
        db.thirdParty.count({ where: { is_active: true, roles: { has: 'CONTACT' } } }),
        db.crmLead.count({ where: { is_active: true } }),
        db.crmOpportunity.count({ where: { is_active: true } }),
        db.crmActivity.count({ where: { is_active: true } }),
        db.crmOpportunity.findMany({
          where: {
            is_active: true,
            stage: { is_won: true },
          },
          select: { expected_value: true },
        }),
      ]);

    const wonValue = wonOpportunities.reduce(
      (sum, opp) => sum + (opp.expected_value?.toNumber?.() ?? Number(opp.expected_value) ?? 0),
      0,
    );

    return { contacts, leads, opportunities, activities, wonValue };
  }

  async getPipeline(companyId: string): Promise<any> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const stages = await db.crmOpportunityStage.findMany({
      where: { is_active: true },
      orderBy: { position: 'asc' },
      include: {
        opportunities: {
          where: { is_active: true },
          select: { expected_value: true },
        },
      },
    });

    return stages.map((stage) => ({
      stage_id: stage.id,
      stage_name: stage.name,
      color: stage.color,
      count: stage.opportunities.length,
      total_value: stage.opportunities.reduce(
        (sum, opp) => sum + (opp.expected_value?.toNumber?.() ?? Number(opp.expected_value) ?? 0),
        0,
      ),
    }));
  }

  async getLeadsBySource(companyId: string): Promise<any> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const result = await db.crmLead.groupBy({
      by: ['source'],
      where: { is_active: true },
      _count: { id: true },
    });

    return result.map((r) => ({
      source: r.source,
      count: r._count.id,
    }));
  }

  async getRecentActivities(companyId: string): Promise<any> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    return db.crmActivity.findMany({
      where: { is_active: true },
      include: { third_party: true },
      orderBy: { created_at: 'desc' },
      take: 10,
    });
  }
}
