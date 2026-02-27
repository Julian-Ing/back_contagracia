import { Injectable, Logger } from '@nestjs/common';
import { TenantPrismaService } from '../tenant/tenant-prisma.service';

@Injectable()
export class TeamService {
  private readonly logger = new Logger(TeamService.name);

  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  async getMembers(companyId: string): Promise<any> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const users = await db.tenantUser.findMany({
      where: { is_active: true },
      select: {
        id: true,
        full_name: true,
        email: true,
      },
    });

    const members = await Promise.all(
      users.map(async (user) => {
        const [leadsCount, opportunitiesCount, wonCount, activitiesCount] =
          await Promise.all([
            db.crmLead.count({ where: { assigned_to: user.id, is_active: true } }),
            db.crmOpportunity.count({ where: { assigned_to: user.id, is_active: true } }),
            db.crmOpportunity.count({
              where: { assigned_to: user.id, is_active: true, stage: { is_won: true } },
            }),
            db.crmActivity.count({ where: { user_id: user.id, is_active: true } }),
          ]);

        return {
          user: { id: user.id, full_name: user.full_name, email: user.email },
          stats: {
            leads_count: leadsCount,
            opportunities_count: opportunitiesCount,
            won_count: wonCount,
            activities_count: activitiesCount,
          },
        };
      }),
    );

    // Only return users that have at least one CRM assignment
    return members.filter(
      (m) =>
        m.stats.leads_count > 0 ||
        m.stats.opportunities_count > 0 ||
        m.stats.activities_count > 0,
    );
  }

  async getMemberPerformance(companyId: string, userId: string): Promise<any> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const [
      leadsAssigned,
      leadsConverted,
      opportunitiesAssigned,
      wonOpportunities,
      activitiesCompleted,
      activitiesPending,
    ] = await Promise.all([
      db.crmLead.count({ where: { assigned_to: userId, is_active: true } }),
      db.crmLead.count({
        where: { assigned_to: userId, is_active: true, stage: 'CONVERTED' },
      }),
      db.crmOpportunity.count({ where: { assigned_to: userId, is_active: true } }),
      db.crmOpportunity.findMany({
        where: { assigned_to: userId, is_active: true, stage: { is_won: true } },
        select: { expected_value: true },
      }),
      db.crmActivity.count({
        where: { user_id: userId, is_active: true, status: 'COMPLETED' },
      }),
      db.crmActivity.count({
        where: { user_id: userId, is_active: true, status: 'PENDING' },
      }),
    ]);

    const totalWonValue = wonOpportunities.reduce(
      (sum, opp) => sum + (opp.expected_value?.toNumber?.() ?? Number(opp.expected_value) ?? 0),
      0,
    );

    return {
      leads_assigned: leadsAssigned,
      leads_converted: leadsConverted,
      opportunities_assigned: opportunitiesAssigned,
      opportunities_won: wonOpportunities.length,
      total_won_value: totalWonValue,
      activities_completed: activitiesCompleted,
      activities_pending: activitiesPending,
    };
  }

  async getRanking(companyId: string): Promise<any> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const users = await db.tenantUser.findMany({
      where: { is_active: true },
      select: { id: true, full_name: true, email: true },
    });

    const ranking = await Promise.all(
      users.map(async (user) => {
        const wonOpportunities = await db.crmOpportunity.findMany({
          where: { assigned_to: user.id, is_active: true, stage: { is_won: true } },
          select: { expected_value: true },
        });

        const totalWonValue = wonOpportunities.reduce(
          (sum, opp) =>
            sum + (opp.expected_value?.toNumber?.() ?? Number(opp.expected_value) ?? 0),
          0,
        );

        return {
          user: { id: user.id, full_name: user.full_name, email: user.email },
          won_count: wonOpportunities.length,
          total_won_value: totalWonValue,
        };
      }),
    );

    return ranking
      .filter((r) => r.total_won_value > 0 || r.won_count > 0)
      .sort((a, b) => b.total_won_value - a.total_won_value);
  }
}
