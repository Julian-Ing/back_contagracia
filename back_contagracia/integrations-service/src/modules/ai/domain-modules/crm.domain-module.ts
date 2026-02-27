import { Injectable, Logger } from '@nestjs/common';
import { TenantContextService } from '@contagracia/shared-modules';
import { DomainModule, DomainModuleContext } from './domain-module.interface';

@Injectable()
export class CrmDomainModule implements DomainModule {
  moduleId = 'crm';
  private readonly logger = new Logger(CrmDomainModule.name);

  constructor(private readonly tenantContext: TenantContextService) {}

  async getContext(companyId: string, query: string): Promise<DomainModuleContext> {
    const tenant = await this.tenantContext.getTenantClient(companyId);
    if (!tenant) {
      return {
        data: null,
        instructions: ['No se pudo conectar a la base de datos del tenant.'],
        description: 'Error de conexión al tenant',
      };
    }

    const queryLower = query.toLowerCase();
    const data: Record<string, any> = {};
    const instructions: string[] = [];

    // Detectar intención por keywords y cargar datos relevantes
    const intents = this.detectIntents(queryLower);

    if (intents.has('leads') || intents.has('overview')) {
      const [totalLeads, leadsByStage, recentLeads] = await Promise.all([
        tenant.crmLead.count({ where: { is_active: true, deleted_at: null } }),
        tenant.crmLead.groupBy({
          by: ['stage'],
          where: { is_active: true, deleted_at: null },
          _count: true,
        }),
        tenant.crmLead.findMany({
          where: { is_active: true, deleted_at: null },
          take: 5,
          orderBy: { created_at: 'desc' },
          include: { third_party: { select: { name: true, email: true } } },
        }),
      ]);

      data.leads = {
        total: totalLeads,
        byStage: leadsByStage.map((g) => ({ stage: g.stage, count: g._count })),
        recent: recentLeads.map((l) => ({
          id: l.id,
          contact: l.third_party?.name || 'Sin nombre',
          email: l.third_party?.email,
          stage: l.stage,
          source: l.source,
          createdAt: l.created_at,
        })),
      };
      instructions.push('Tienes datos de leads: total, distribución por etapa y los 5 más recientes.');
    }

    if (intents.has('opportunities') || intents.has('pipeline') || intents.has('overview')) {
      const [totalOpps, stages, oppsByStage] = await Promise.all([
        tenant.crmOpportunity.count({ where: { is_active: true, deleted_at: null } }),
        tenant.crmOpportunityStage.findMany({
          where: { is_active: true },
          orderBy: { position: 'asc' },
        }),
        tenant.crmOpportunity.groupBy({
          by: ['stage_id'],
          where: { is_active: true, deleted_at: null },
          _count: true,
          _sum: { expected_value: true },
        }),
      ]);

      const stageMap = new Map(stages.map((s) => [s.id, s.name]));

      data.opportunities = {
        total: totalOpps,
        stages: stages.map((s) => ({ id: s.id, name: s.name, position: s.position, probability: s.probability, isWon: s.is_won, isLost: s.is_lost })),
        byStage: oppsByStage.map((g) => ({
          stage: stageMap.get(g.stage_id) || g.stage_id,
          count: g._count,
          totalValue: g._sum?.expected_value?.toString() || '0',
        })),
      };
      instructions.push('Tienes datos del pipeline: oportunidades por etapa con valor total.');
    }

    if (intents.has('winrate') || intents.has('conversion')) {
      const [wonCount, lostCount, totalClosed] = await Promise.all([
        tenant.crmOpportunity.count({
          where: { is_active: true, deleted_at: null, stage: { is_won: true } },
        }),
        tenant.crmOpportunity.count({
          where: { is_active: true, deleted_at: null, stage: { is_lost: true } },
        }),
        tenant.crmOpportunity.count({
          where: {
            is_active: true,
            deleted_at: null,
            OR: [{ stage: { is_won: true } }, { stage: { is_lost: true } }],
          },
        }),
      ]);

      data.conversion = {
        won: wonCount,
        lost: lostCount,
        totalClosed,
        winRate: totalClosed > 0 ? ((wonCount / totalClosed) * 100).toFixed(1) + '%' : 'N/A',
      };
      instructions.push('Tienes datos de conversión: oportunidades ganadas, perdidas y win rate.');
    }

    if (intents.has('campaigns')) {
      const campaigns = await tenant.crmCampaign.findMany({
        where: { is_active: true, deleted_at: null },
        orderBy: { created_at: 'desc' },
        take: 10,
        select: {
          id: true,
          name: true,
          channel: true,
          status: true,
          budget: true,
          start_date: true,
          end_date: true,
        },
      });

      data.campaigns = campaigns.map((c) => ({
        name: c.name,
        channel: c.channel,
        status: c.status,
        budget: c.budget?.toString() || null,
        startDate: c.start_date,
        endDate: c.end_date,
      }));
      instructions.push('Tienes datos de las campañas activas (hasta 10 más recientes).');
    }

    if (intents.has('activities')) {
      const [pendingActivities, overdueActivities] = await Promise.all([
        tenant.crmActivity.count({
          where: { is_active: true, deleted_at: null, status: 'PENDING' },
        }),
        tenant.crmActivity.count({
          where: {
            is_active: true,
            deleted_at: null,
            status: 'PENDING',
            due_date: { lt: new Date() },
          },
        }),
      ]);

      data.activities = {
        pending: pendingActivities,
        overdue: overdueActivities,
      };
      instructions.push('Tienes datos de actividades pendientes y vencidas.');
    }

    // Si no se detectó ninguna intención específica, dar un resumen general
    if (Object.keys(data).length === 0) {
      const [totalLeads, totalOpps, totalCampaigns, pendingActivities] = await Promise.all([
        tenant.crmLead.count({ where: { is_active: true, deleted_at: null } }),
        tenant.crmOpportunity.count({ where: { is_active: true, deleted_at: null } }),
        tenant.crmCampaign.count({ where: { is_active: true, deleted_at: null } }),
        tenant.crmActivity.count({ where: { is_active: true, deleted_at: null, status: 'PENDING' } }),
      ]);

      data.summary = {
        totalLeads,
        totalOpportunities: totalOpps,
        totalCampaigns,
        pendingActivities,
      };
      instructions.push(
        'Tienes un resumen general del CRM. Si el usuario pregunta algo específico, sugiere seleccionar el área (leads, oportunidades, campañas, etc.).',
      );
    }

    instructions.push(
      'Presenta los datos de forma clara y estructurada.',
      'Los montos están en pesos colombianos (COP).',
      'Si el usuario pide más detalle, sugiere preguntas de seguimiento.',
    );

    return {
      data,
      instructions,
      description: 'Datos del módulo CRM con leads, oportunidades, campañas y actividades.',
    };
  }

  private detectIntents(query: string): Set<string> {
    const intents = new Set<string>();

    const keywords: Record<string, string[]> = {
      leads: ['lead', 'leads', 'prospecto', 'prospectos', 'contacto nuevo', 'nuevos contactos'],
      opportunities: ['oportunidad', 'oportunidades', 'negocio', 'negocios', 'deal', 'deals'],
      pipeline: ['pipeline', 'embudo', 'funnel', 'etapa', 'etapas'],
      winrate: ['win rate', 'tasa de cierre', 'conversión', 'conversion', 'ganadas', 'perdidas', 'efectividad'],
      campaigns: ['campaña', 'campañas', 'campaign', 'marketing'],
      activities: ['actividad', 'actividades', 'tarea', 'tareas', 'pendiente', 'pendientes', 'vencida', 'vencidas', 'reunión', 'reuniones'],
      overview: ['resumen', 'general', 'cómo va', 'como va', 'estado', 'panorama', 'overview', 'dashboard'],
    };

    for (const [intent, words] of Object.entries(keywords)) {
      if (words.some((w) => query.includes(w))) {
        intents.add(intent);
      }
    }

    return intents;
  }
}
