'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import {
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle2,
  Download,
  Award,
  AlertTriangle,
  MessageSquare,
  Star,
  FileText,
} from 'lucide-react';
import { observationsService } from '../services/observations.service';
import type {
  ObservationStats,
  ObservationType,
  Observation,
} from '../types';
import {
  OBSERVATION_TYPE_LABELS,
  OBSERVATION_TYPE_COLORS,
} from '../types';

const TYPE_ICONS: Record<ObservationType, typeof Star> = {
  RECOGNITION: Star,
  ACHIEVEMENT: Award,
  FEEDBACK: MessageSquare,
  CONCERN: AlertTriangle,
  INCIDENT: AlertTriangle,
  WARNING: AlertTriangle,
};

const TYPE_BAR_COLORS: Record<ObservationType, string> = {
  RECOGNITION: 'bg-green-500',
  ACHIEVEMENT: 'bg-emerald-500',
  FEEDBACK: 'bg-blue-500',
  CONCERN: 'bg-yellow-500',
  INCIDENT: 'bg-red-500',
  WARNING: 'bg-orange-500',
};

interface ObservationsReportsTabProps {
  refreshKey: number;
}

export function ObservationsReportsTab({ refreshKey }: ObservationsReportsTabProps) {
  const [stats, setStats] = useState<ObservationStats | null>(null);
  const [allObservations, setAllObservations] = useState<Observation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [statsRes, obsRes] = await Promise.all([
          observationsService.getStats(),
          observationsService.getAll({ limit: 500 }),
        ]);
        setStats(statsRes);
        setAllObservations(obsRes.data);
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [refreshKey]);

  const resolvedCount = stats?.by_status?.find((s) => s.status === 'RESOLVED')?.count ?? 0;
  const efficiency = stats && stats.total > 0 ? Math.round((resolvedCount / stats.total) * 100) : 0;
  const monthlyAvg = stats ? Math.round((stats.total / 12) * 10) / 10 : 0;
  const participationEmployees = new Set(allObservations.map((o) => o.employee_profile_id)).size;

  // Top employees by recognitions + achievements
  const employeeMap = new Map<string, { name: string; doc: string; recognitions: number; achievements: number; total: number }>();
  for (const obs of allObservations) {
    const key = obs.employee_profile_id || obs.third_party_id;
    if (!employeeMap.has(key)) {
      employeeMap.set(key, {
        name: obs.employee_profile?.third_party?.name || 'Sin nombre',
        doc: obs.employee_profile?.third_party?.identification_number || '',
        recognitions: 0,
        achievements: 0,
        total: 0,
      });
    }
    const emp = employeeMap.get(key)!;
    if (obs.observation_type === 'RECOGNITION') emp.recognitions++;
    if (obs.observation_type === 'ACHIEVEMENT') emp.achievements++;
    emp.total = emp.recognitions + emp.achievements;
  }
  const topEmployees = [...employeeMap.values()].filter((e) => e.total > 0).sort((a, b) => b.total - a.total).slice(0, 5);

  // Employees with pending follow-ups
  const pendingByEmployee = new Map<string, { name: string; count: number }>();
  const now = new Date();
  for (const obs of allObservations) {
    if (obs.status === 'ACTIVE' && obs.follow_up_date && new Date(obs.follow_up_date) <= now) {
      const key = obs.employee_profile_id || obs.third_party_id;
      if (!pendingByEmployee.has(key)) {
        pendingByEmployee.set(key, {
          name: obs.employee_profile?.third_party?.name || 'Sin nombre',
          count: 0,
        });
      }
      pendingByEmployee.get(key)!.count++;
    }
  }
  const priorities = [...pendingByEmployee.values()].sort((a, b) => b.count - a.count).slice(0, 4);

  // Category summary
  const typeCount = (type: ObservationType) => stats?.by_type?.find((t) => t.type === type)?.count ?? 0;
  const categories = [
    { type: 'RECOGNITION' as ObservationType, label: 'Reconocimientos', color: 'bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800', textColor: 'text-green-700 dark:text-green-400', icon: Star },
    { type: 'ACHIEVEMENT' as ObservationType, label: 'Logros', color: 'bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800', textColor: 'text-blue-700 dark:text-blue-400', icon: Award },
    { type: 'INCIDENT' as ObservationType, label: 'Incidentes', color: 'bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800', textColor: 'text-red-700 dark:text-red-400', icon: AlertTriangle },
    { type: 'FEEDBACK' as ObservationType, label: 'Retroalimentación', color: 'bg-purple-100 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800', textColor: 'text-purple-700 dark:text-purple-400', icon: MessageSquare },
  ];

  // CSV export
  const handleExportCSV = () => {
    if (allObservations.length === 0) return;
    const headers = ['Empleado', 'Documento', 'Titulo', 'Tipo', 'Severidad', 'Estado', 'Fecha', 'Accion Requerida', 'Seguimiento'];
    const rows = allObservations.map((o) => [
      o.employee_profile?.third_party?.name || '',
      o.employee_profile?.third_party?.identification_number || '',
      `"${(o.title || '').replace(/"/g, '""')}"`,
      OBSERVATION_TYPE_LABELS[o.observation_type] || o.observation_type,
      o.severity,
      o.status,
      o.observation_date?.split('T')[0] || '',
      `"${(o.action_required || '').replace(/"/g, '""')}"`,
      o.follow_up_date?.split('T')[0] || '',
    ]);
    const csv = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `observaciones_reporte_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="bg-white dark:bg-slate-800/50">
              <CardContent className="p-6">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-24" />
                  <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-16" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 4 Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">Promedio Mensual</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{monthlyAvg}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-indigo-100 dark:bg-indigo-900/50 grid place-items-center">
                <BarChart3 className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">Empleados con Obs.</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{participationEmployees}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/50 grid place-items-center">
                <TrendingUp className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">Seguimientos Pendientes</p>
                <p className="text-3xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                  {stats?.pending_follow_up ?? 0}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/50 grid place-items-center">
                <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">Eficiencia (Resueltas)</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-1">{efficiency}%</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/50 grid place-items-center">
                <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Distribution by Type + Top Employees */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-indigo-500" />
              Distribución por Tipo
            </CardTitle>
            <CardDescription>Desglose de observaciones por categoría</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(['RECOGNITION', 'ACHIEVEMENT', 'FEEDBACK', 'CONCERN', 'INCIDENT', 'WARNING'] as ObservationType[]).map((type) => {
                const count = typeCount(type);
                const pct = stats && stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                const Icon = TYPE_ICONS[type];
                return (
                  <div key={type} className="flex items-center gap-3">
                    <div className="w-28 flex items-center gap-2">
                      <Icon className="h-4 w-4 text-gray-500 dark:text-slate-400 shrink-0" />
                      <span className="text-sm text-gray-700 dark:text-slate-300 truncate">
                        {OBSERVATION_TYPE_LABELS[type]}
                      </span>
                    </div>
                    <div className="flex-1 h-3 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${TYPE_BAR_COLORS[type]} rounded-full transition-all`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-slate-300 w-14 text-right">
                      {count} ({pct}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-500" />
              Empleados Destacados
            </CardTitle>
            <CardDescription>Mayor cantidad de reconocimientos y logros</CardDescription>
          </CardHeader>
          <CardContent>
            {topEmployees.length === 0 ? (
              <div className="text-center py-8">
                <Award className="h-10 w-10 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  No hay reconocimientos o logros registrados.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {topEmployees.map((emp, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-slate-700/30"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-yellow-500">#{idx + 1}</span>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white text-sm">{emp.name}</p>
                        <p className="text-xs text-gray-500 dark:text-slate-400">{emp.doc}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        <Star className="h-3 w-3 mr-1" />{emp.recognitions}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        <Award className="h-3 w-3 mr-1" />{emp.achievements}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Category Summary + Priorities + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Summary */}
        <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white text-base">Resumen por Categoría</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {categories.map((cat) => {
                const Icon = cat.icon;
                return (
                  <div key={cat.type} className={`p-3 rounded-lg border ${cat.color}`}>
                    <Icon className={`h-5 w-5 ${cat.textColor} mb-1`} />
                    <p className={`text-2xl font-bold ${cat.textColor}`}>{typeCount(cat.type)}</p>
                    <p className="text-xs text-gray-600 dark:text-slate-400">{cat.label}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Priorities */}
        <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white text-base">Prioridades</CardTitle>
            <CardDescription>Empleados con seguimientos vencidos</CardDescription>
          </CardHeader>
          <CardContent>
            {priorities.length === 0 ? (
              <div className="text-center py-6">
                <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/50 grid place-items-center mx-auto mb-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  No hay seguimientos pendientes.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {priorities.map((p, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white text-sm">{p.name}</p>
                      <p className="text-xs text-gray-500 dark:text-slate-400">Seguimientos pendientes</p>
                    </div>
                    <Badge variant="destructive">{p.count}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white text-base">Acciones Rápidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={handleExportCSV}
                disabled={allObservations.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar a CSV
              </Button>
              <div className="pt-2 border-t border-gray-200 dark:border-slate-700 mt-2">
                <p className="text-xs text-gray-500 dark:text-slate-400 mb-2">Resumen rápido</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between text-gray-700 dark:text-slate-300">
                    <span>Total observaciones</span>
                    <span className="font-medium">{stats?.total ?? 0}</span>
                  </div>
                  <div className="flex justify-between text-gray-700 dark:text-slate-300">
                    <span>Activas</span>
                    <span className="font-medium text-green-600 dark:text-green-400">{stats?.active ?? 0}</span>
                  </div>
                  <div className="flex justify-between text-gray-700 dark:text-slate-300">
                    <span>Resueltas</span>
                    <span className="font-medium text-blue-600 dark:text-blue-400">{resolvedCount}</span>
                  </div>
                  <div className="flex justify-between text-gray-700 dark:text-slate-300">
                    <span>Seguimientos vencidos</span>
                    <span className="font-medium text-amber-600 dark:text-amber-400">{stats?.pending_follow_up ?? 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* No data state */}
      {stats && stats.total === 0 && (
        <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 text-gray-300 dark:text-slate-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-slate-400">
              No hay observaciones registradas. Crea observaciones para ver los reportes.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
