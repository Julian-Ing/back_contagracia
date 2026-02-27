'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { TrendingUp, TrendingDown, AlertTriangle, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import type { DashboardResponse } from '../types';

interface ReportsTabProps {
  data: DashboardResponse | null;
  loading: boolean;
}

export function ReportsTab({ data, loading }: ReportsTabProps) {
  const employees = data?.all_employees ?? [];
  const improvingCount = employees.filter((e) => e.trend === 'improving').length;
  const decliningCount = employees.filter((e) => e.trend === 'declining').length;
  const highRiskCount = data?.summary?.risk_distribution?.high ?? 0;

  // Aggregate recommendations
  const recommendationCounts = new Map<string, number>();
  for (const emp of employees) {
    for (const rec of emp.recommendations) {
      recommendationCounts.set(rec, (recommendationCounts.get(rec) || 0) + 1);
    }
  }
  const aggregatedRecommendations = Array.from(recommendationCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const handleExportCSV = () => {
    if (!employees.length) {
      toast.error('No hay datos para exportar');
      return;
    }

    const headers = [
      'Empleado',
      'Documento',
      'Score General',
      'Asistencia',
      'Desempeño',
      'Actitud',
      'Obs Positivas',
      'Obs Negativas',
      'Puntualidad %',
      'Tardanzas',
      'Tendencia',
      'Riesgo',
      'Recomendación',
    ];

    const rows = employees.map((emp) => [
      emp.employee_name,
      emp.identification_number,
      emp.overall_score.toFixed(2),
      emp.attendance_score,
      emp.performance_score,
      emp.attitude_score,
      emp.observations_summary.positive,
      emp.observations_summary.negative,
      emp.attendance_summary.punctuality_rate,
      emp.attendance_summary.late_days,
      emp.trend,
      emp.risk_level,
      emp.recommendations[0] || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((cell) => {
          const str = String(cell);
          return str.includes(',') || str.includes('"')
            ? `"${str.replace(/"/g, '""')}"`
            : str;
        }).join(',')
      ),
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analisis-desempeno-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exportado correctamente');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="bg-white dark:bg-slate-800/50">
            <CardContent className="p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-5 bg-gray-200 dark:bg-slate-700 rounded w-48" />
                <div className="h-16 bg-gray-200 dark:bg-slate-700 rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Team Trends */}
      <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">Tendencias del Equipo</CardTitle>
          <CardDescription>Resumen de tendencias de rendimiento</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/50 grid place-items-center">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-700 dark:text-green-400">{improvingCount}</p>
                  <p className="text-sm text-green-600 dark:text-green-500">Mejorando</p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/50 grid place-items-center">
                  <TrendingDown className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-700 dark:text-red-400">{decliningCount}</p>
                  <p className="text-sm text-red-600 dark:text-red-500">Empeorando</p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-yellow-100 dark:bg-yellow-900/50 grid place-items-center">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">{highRiskCount}</p>
                  <p className="text-sm text-yellow-600 dark:text-yellow-500">Alto Riesgo</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Aggregated Recommendations */}
      <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">Acciones Recomendadas</CardTitle>
          <CardDescription>Recomendaciones más frecuentes del equipo</CardDescription>
        </CardHeader>
        <CardContent>
          {aggregatedRecommendations.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-slate-400 text-center py-4">
              No hay recomendaciones disponibles.
            </p>
          ) : (
            <div className="space-y-3">
              {aggregatedRecommendations.map(([rec, count], idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-slate-700/30 border border-gray-200 dark:border-slate-600"
                >
                  <p className="text-sm text-gray-700 dark:text-slate-300 flex-1">{rec}</p>
                  <Badge variant="secondary" className="ml-3">
                    {count} empleado{count > 1 ? 's' : ''}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Export */}
      <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">Exportar Análisis</CardTitle>
          <CardDescription>Descarga los datos de rendimiento en formato CSV</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleExportCSV} disabled={employees.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Exportar a CSV
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
