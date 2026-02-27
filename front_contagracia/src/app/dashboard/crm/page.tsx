'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { cn } from '@/shared/lib/utils';
import {
  Users,
  Target,
  DollarSign,
  TrendingUp,
  Clock,
  UserPlus,
  Handshake,
  Contact,
  Megaphone,
  ArrowRight,
  CalendarClock,
  AlertTriangle,
  Activity,
} from 'lucide-react';
import type { CrmDashboardStats, PipelineStageStats } from '@/modules/crm/types';
import { useDashboard } from '@/modules/crm/hooks/useDashboard';


const COLOR_MAP: Record<string, { border: string; bg: string; darkBorder: string; darkBg: string; text: string; darkText: string; subText: string; darkSubText: string; iconText: string; darkIconText: string }> = {
  blue: { border: 'border-blue-200', bg: 'bg-blue-50', darkBorder: 'dark:border-blue-800', darkBg: 'dark:bg-blue-950/30', text: 'text-blue-900', darkText: 'dark:text-blue-100', subText: 'text-blue-600', darkSubText: 'dark:text-blue-400', iconText: 'text-blue-600', darkIconText: 'dark:text-blue-400' },
  purple: { border: 'border-purple-200', bg: 'bg-purple-50', darkBorder: 'dark:border-purple-800', darkBg: 'dark:bg-purple-950/30', text: 'text-purple-900', darkText: 'dark:text-purple-100', subText: 'text-purple-600', darkSubText: 'dark:text-purple-400', iconText: 'text-purple-600', darkIconText: 'dark:text-purple-400' },
  green: { border: 'border-green-200', bg: 'bg-green-50', darkBorder: 'dark:border-green-800', darkBg: 'dark:bg-green-950/30', text: 'text-green-900', darkText: 'dark:text-green-100', subText: 'text-green-600', darkSubText: 'dark:text-green-400', iconText: 'text-green-600', darkIconText: 'dark:text-green-400' },
  yellow: { border: 'border-yellow-200', bg: 'bg-yellow-50', darkBorder: 'dark:border-yellow-800', darkBg: 'dark:bg-yellow-950/30', text: 'text-yellow-900', darkText: 'dark:text-yellow-100', subText: 'text-yellow-600', darkSubText: 'dark:text-yellow-400', iconText: 'text-yellow-600', darkIconText: 'dark:text-yellow-400' },
  red: { border: 'border-red-200', bg: 'bg-red-50', darkBorder: 'dark:border-red-800', darkBg: 'dark:bg-red-950/30', text: 'text-red-900', darkText: 'dark:text-red-100', subText: 'text-red-600', darkSubText: 'dark:text-red-400', iconText: 'text-red-600', darkIconText: 'dark:text-red-400' },
};

function formatValue(value: number, format: 'number' | 'currency' | 'percent') {
  if (format === 'currency') {
    return value.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });
  }
  if (format === 'percent') {
    return `${value.toFixed(1)}%`;
  }
  return value.toLocaleString('es-CO');
}

export default function CrmDashboardPage() {
  const router = useRouter();
  const { stats, pipeline, recentActivities, loading } = useDashboard();

  const s = stats ?? {
    total_leads: 0,
    new_leads: 0,
    open_opportunities: 0,
    total_pipeline_value: 0,
    won_opportunities: 0,
    total_won_value: 0,
    conversion_rate: 0,
    active_campaigns: 0,
    activities_pending: 0,
    emails_sent: 0,
    whatsapp_conversations: 0,
  };

  const STAT_CARDS = [
    {
      title: 'Total Leads',
      value: s.total_leads,
      format: 'number' as const,
      icon: Users,
      color: 'blue',
      description: 'Leads registrados en el sistema',
    },
    {
      title: 'Oportunidades Abiertas',
      value: s.open_opportunities,
      format: 'number' as const,
      icon: Target,
      color: 'purple',
      description: 'Oportunidades activas en el pipeline',
    },
    {
      title: 'Valor del Pipeline',
      value: s.total_pipeline_value,
      format: 'currency' as const,
      icon: DollarSign,
      color: 'green',
      description: 'Valor total de oportunidades abiertas',
    },
    {
      title: 'Tasa de Conversion',
      value: s.conversion_rate,
      format: 'percent' as const,
      icon: TrendingUp,
      color: 'yellow',
      description: 'Leads convertidos a oportunidades',
    },
    {
      title: 'Actividades Pendientes',
      value: s.activities_pending,
      format: 'number' as const,
      icon: Clock,
      color: 'red',
      description: 'Tareas y seguimientos por completar',
    },
  ];

  const totalPipelineCount = pipeline.reduce((acc, s) => acc + s.count, 0);

  return (
    <main className="py-6 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-4">
          <div className="text-gray-600 dark:text-gray-400">Cargando...</div>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">CRM</h1>
        <p className="text-lg text-gray-500 dark:text-gray-400 mt-1">
          Gestiona tus relaciones comerciales, leads y oportunidades de negocio.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        {STAT_CARDS.map((card) => {
          const c = COLOR_MAP[card.color];
          const Icon = card.icon;
          return (
            <Card key={card.title} className={cn(c.border, c.bg, c.darkBorder, c.darkBg)}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className={cn('text-sm font-medium', c.subText, c.darkSubText)}>
                  {card.title}
                </CardTitle>
                <Icon className={cn('h-4 w-4', c.iconText, c.darkIconText)} />
              </CardHeader>
              <CardContent>
                <div className={cn('text-2xl font-bold', c.text, c.darkText)}>
                  {formatValue(card.value, card.format)}
                </div>
                <p className={cn('text-xs mt-1', c.subText, c.darkSubText)}>{card.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Pipeline Visualization */}
      <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">Pipeline de Oportunidades</CardTitle>
          <CardDescription>Distribucion de oportunidades por etapa</CardDescription>
        </CardHeader>
        <CardContent>
          {totalPipelineCount === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-400 dark:text-gray-500">
              <Target className="h-10 w-10 mb-3" />
              <p className="text-sm font-medium">Sin oportunidades en el pipeline</p>
              <p className="text-xs mt-1">Las oportunidades apareceran aqui al ser creadas.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Bar */}
              <div className="flex h-8 rounded-lg overflow-hidden">
                {pipeline.filter((s) => s.count > 0).map((stage) => (
                  <div
                    key={stage.stage}
                    className="flex items-center justify-center text-xs font-medium text-white transition-all"
                    style={{
                      backgroundColor: stage.color,
                      width: `${(stage.count / totalPipelineCount) * 100}%`,
                    }}
                  >
                    {stage.count}
                  </div>
                ))}
              </div>
              {/* Legend */}
              <div className="flex flex-wrap gap-4">
                {pipeline.map((stage) => (
                  <div key={stage.stage} className="flex items-center gap-2 text-sm">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: stage.color }} />
                    <span className="text-gray-700 dark:text-gray-300">{stage.stage_name}</span>
                    <Badge variant="secondary" className="text-xs">{stage.count}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Two Columns: Activities + Opportunities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Actividades Recientes */}
        <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center text-gray-900 dark:text-white">
              <Activity className="mr-2 h-5 w-5 text-blue-500" />
              Actividades Recientes
            </CardTitle>
            <CardDescription>Ultimas tareas, llamadas y reuniones</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-gray-500">
              <CalendarClock className="h-12 w-12 mb-3" />
              <p className="text-sm font-medium">No hay actividades recientes</p>
              <p className="text-xs mt-1 text-center max-w-xs">
                Las actividades como llamadas, reuniones y tareas apareceran aqui.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Oportunidades por Vencer */}
        <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center text-gray-900 dark:text-white">
              <AlertTriangle className="mr-2 h-5 w-5 text-yellow-500" />
              Oportunidades por Vencer
            </CardTitle>
            <CardDescription>Oportunidades con fecha de cierre proxima</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-gray-500">
              <Handshake className="h-12 w-12 mb-3" />
              <p className="text-sm font-medium">No hay oportunidades por vencer</p>
              <p className="text-xs mt-1 text-center max-w-xs">
                Las oportunidades con fecha de cierre proxima apareceran aqui.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">Acciones Rapidas</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Button
            variant="outline"
            className="h-20 flex-col gap-2 border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-200"
            onClick={() => router.push('/dashboard/crm/leads')}
          >
            <UserPlus className="h-6 w-6" />
            <span>Leads</span>
          </Button>
          <Button
            variant="outline"
            className="h-20 flex-col gap-2 border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-200"
            onClick={() => router.push('/dashboard/crm/opportunities')}
          >
            <Handshake className="h-6 w-6" />
            <span>Oportunidades</span>
          </Button>
          <Button
            variant="outline"
            className="h-20 flex-col gap-2 border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-200"
            onClick={() => router.push('/dashboard/crm/contacts')}
          >
            <Contact className="h-6 w-6" />
            <span>Contactos</span>
          </Button>
          <Button
            variant="outline"
            className="h-20 flex-col gap-2 border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-200"
            onClick={() => router.push('/dashboard/crm/campaigns')}
          >
            <Megaphone className="h-6 w-6" />
            <span>Campanas</span>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
