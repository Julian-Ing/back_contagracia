'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Input } from '@/shared/components/ui/input';
import {
  Users,
  Star,
  AlertTriangle,
  TrendingUp,
  Brain,
} from 'lucide-react';
import type { DashboardResponse, DashboardFilters, EmployeeMetrics } from '../types';
import { RISK_LABELS, RISK_COLORS } from '../types';

function StarRating({ score, max = 5 }: { score: number; max?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i < Math.round(score) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 dark:text-slate-600'}`}
        />
      ))}
      <span className="ml-1 text-sm font-medium text-gray-700 dark:text-slate-300">
        {score.toFixed(2)}
      </span>
    </div>
  );
}

interface DashboardTabProps {
  data: DashboardResponse | null;
  loading: boolean;
  filters: DashboardFilters;
  updateFilters: (filters: Partial<DashboardFilters>) => void;
}

const PERIODS: { value: DashboardFilters['period']; label: string }[] = [
  { value: '1m', label: '1 Mes' },
  { value: '3m', label: '3 Meses' },
  { value: '6m', label: '6 Meses' },
  { value: '1y', label: '1 Año' },
];

export function DashboardTab({ data, loading, filters, updateFilters }: DashboardTabProps) {
  const summary = data?.summary;
  const improvingCount = data?.all_employees?.filter((e) => e.trend === 'improving').length ?? 0;

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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <Card key={i} className="bg-white dark:bg-slate-800/50">
              <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-5 bg-gray-200 dark:bg-slate-700 rounded w-48" />
                  {[...Array(3)].map((_, j) => (
                    <div key={j} className="h-12 bg-gray-200 dark:bg-slate-700 rounded" />
                  ))}
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
      {/* Selector de periodo */}
      <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-gray-700 dark:text-slate-300">Periodo:</span>
            <div className="flex gap-1">
              {PERIODS.map((p) => (
                <Button
                  key={p.value}
                  variant={filters.period === p.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => updateFilters({ period: p.value, date_from: undefined, date_to: undefined })}
                >
                  {p.label}
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-sm text-gray-500 dark:text-slate-400">Desde:</span>
              <Input
                type="date"
                className="w-40"
                value={filters.date_from || ''}
                onChange={(e) => updateFilters({ date_from: e.target.value, period: undefined })}
              />
              <span className="text-sm text-gray-500 dark:text-slate-400">Hasta:</span>
              <Input
                type="date"
                className="w-40"
                value={filters.date_to || ''}
                onChange={(e) => updateFilters({ date_to: e.target.value, period: undefined })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">Empleados Analizados</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                  {summary?.total_employees ?? 0}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-indigo-100 dark:bg-indigo-900/50 grid place-items-center">
                <Users className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">Score Promedio</p>
                <div className="mt-1">
                  <StarRating score={summary?.average_score ?? 0} />
                </div>
              </div>
              <div className="h-12 w-12 rounded-full bg-yellow-100 dark:bg-yellow-900/50 grid place-items-center">
                <Star className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">Alto Riesgo</p>
                <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-1">
                  {summary?.risk_distribution?.high ?? 0}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/50 grid place-items-center">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">Mejorando</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-1">
                  {improvingCount}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/50 grid place-items-center">
                <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Needs Attention + Top Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Requieren Atención Inmediata */}
        <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Requieren Atención Inmediata
            </CardTitle>
            <CardDescription>Empleados con score &lt; 3.0 o riesgo alto</CardDescription>
          </CardHeader>
          <CardContent>
            {(!data?.needs_attention || data.needs_attention.length === 0) ? (
              <div className="text-center py-6">
                <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/50 grid place-items-center mx-auto mb-3">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  No hay empleados en riesgo. ¡Excelente!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.needs_attention.slice(0, 5).map((emp) => (
                  <EmployeeAttentionCard key={emp.third_party_id} employee={emp} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Mejores Desempeños */}
        <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              Mejores Desempeños
            </CardTitle>
            <CardDescription>Empleados con score &gt;= 4.0</CardDescription>
          </CardHeader>
          <CardContent>
            {(!data?.top_performers || data.top_performers.length === 0) ? (
              <div className="text-center py-6">
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  No hay suficientes datos para identificar top performers.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.top_performers.slice(0, 5).map((emp, idx) => (
                  <div
                    key={emp.third_party_id}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-slate-700/30"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-yellow-500">#{idx + 1}</span>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white text-sm">
                          {emp.employee_name}
                        </p>
                        <StarRating score={emp.overall_score} />
                      </div>
                    </div>
                    <div className="text-right text-xs text-gray-500 dark:text-slate-400">
                      <p>+{emp.observations_summary.positive} positivas</p>
                      <p>{emp.attendance_summary.punctuality_rate}% puntualidad</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Rising Stars */}
      {data?.rising_stars && data.rising_stars.length > 0 && (
        <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
              Estrellas en Ascenso
            </CardTitle>
            <CardDescription>Empleados con tendencia positiva y score &gt;= 3.5</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {data.rising_stars.slice(0, 3).map((emp) => (
                <div
                  key={emp.third_party_id}
                  className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                    <p className="font-medium text-gray-900 dark:text-white text-sm">
                      {emp.employee_name}
                    </p>
                  </div>
                  <StarRating score={emp.overall_score} />
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-2">
                    +{emp.observations_summary.positive} reconocimientos · Mejorando consistentemente
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state when no data */}
      {!data && !loading && (
        <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
          <CardContent className="p-12 text-center">
            <Brain className="h-12 w-12 text-gray-300 dark:text-slate-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-slate-400">
              No hay datos suficientes para el análisis. Registra observaciones y asistencia para ver métricas.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function EmployeeAttentionCard({ employee }: { employee: EmployeeMetrics }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-gray-900 dark:text-white text-sm truncate">
            {employee.employee_name}
          </p>
          <Badge className={RISK_COLORS[employee.risk_level]}>
            {RISK_LABELS[employee.risk_level]}
          </Badge>
        </div>
        <div className="flex items-center gap-4 mt-1 text-xs text-gray-500 dark:text-slate-400">
          <span>Score: {employee.overall_score.toFixed(2)}</span>
          <span className="text-red-600">-{employee.observations_summary.negative} negativas</span>
          <span>{employee.attendance_summary.late_days} tardanzas</span>
        </div>
        {employee.recommendations.length > 0 && (
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 truncate">
            {employee.recommendations[0]}
          </p>
        )}
      </div>
    </div>
  );
}
