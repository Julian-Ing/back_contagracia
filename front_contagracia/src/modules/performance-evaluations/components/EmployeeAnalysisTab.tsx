'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/shared/components/ui/table';
import { Star, TrendingUp, TrendingDown, Activity, Brain } from 'lucide-react';
import type { DashboardResponse, EmployeeMetrics } from '../types';
import { RISK_LABELS, RISK_COLORS, TREND_LABELS } from '../types';

function ScoreBar({ score, max = 5 }: { score: number; max?: number }) {
  const pct = (score / max) * 100;
  let color = 'bg-green-500';
  if (score < 3) color = 'bg-red-500';
  else if (score < 4) color = 'bg-yellow-500';

  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium text-gray-700 dark:text-slate-300">{score}</span>
    </div>
  );
}

function StarRating({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${i < Math.round(score) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 dark:text-slate-600'}`}
        />
      ))}
      <span className="ml-1 text-xs font-bold text-gray-700 dark:text-slate-300">
        {score.toFixed(2)}
      </span>
    </div>
  );
}

function TrendIcon({ trend }: { trend: EmployeeMetrics['trend'] }) {
  if (trend === 'improving') {
    return (
      <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
        <TrendingUp className="h-4 w-4" />
        <span className="text-xs">{TREND_LABELS[trend]}</span>
      </div>
    );
  }
  if (trend === 'declining') {
    return (
      <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
        <TrendingDown className="h-4 w-4" />
        <span className="text-xs">{TREND_LABELS[trend]}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 text-gray-500 dark:text-slate-400">
      <Activity className="h-4 w-4" />
      <span className="text-xs">{TREND_LABELS[trend]}</span>
    </div>
  );
}

interface EmployeeAnalysisTabProps {
  data: DashboardResponse | null;
  loading: boolean;
}

export function EmployeeAnalysisTab({ data, loading }: EmployeeAnalysisTabProps) {
  const employees = data?.all_employees
    ? [...data.all_employees].sort((a, b) => b.overall_score - a.overall_score)
    : [];

  return (
    <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
      <CardHeader>
        <CardTitle className="text-gray-900 dark:text-white flex items-center justify-between">
          <span>Análisis por Empleado</span>
          {data && <Badge variant="secondary">{employees.length} empleados</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-200 dark:border-slate-700">
                <TableHead className="text-gray-600 dark:text-slate-300">Empleado</TableHead>
                <TableHead className="text-gray-600 dark:text-slate-300">Score General</TableHead>
                <TableHead className="text-gray-600 dark:text-slate-300">Asistencia</TableHead>
                <TableHead className="text-gray-600 dark:text-slate-300">Desempeño</TableHead>
                <TableHead className="text-gray-600 dark:text-slate-300">Actitud</TableHead>
                <TableHead className="text-gray-600 dark:text-slate-300">Observaciones</TableHead>
                <TableHead className="text-gray-600 dark:text-slate-300">Puntualidad</TableHead>
                <TableHead className="text-gray-600 dark:text-slate-300">Tendencia</TableHead>
                <TableHead className="text-gray-600 dark:text-slate-300">Riesgo</TableHead>
                <TableHead className="text-gray-600 dark:text-slate-300">Recomendaciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i} className="border-gray-200 dark:border-slate-700">
                    {[...Array(10)].map((_, j) => (
                      <TableCell key={j}>
                        <div className="animate-pulse h-4 bg-gray-200 dark:bg-slate-700 rounded w-16" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : employees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-12">
                    <Brain className="h-10 w-10 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-slate-400">
                      No hay datos suficientes. Registra observaciones y asistencia para ver el análisis.
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                employees.map((emp) => (
                  <TableRow
                    key={emp.third_party_id}
                    className="border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/40"
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white text-sm">
                          {emp.employee_name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-slate-400">
                          {emp.identification_number}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StarRating score={emp.overall_score} />
                    </TableCell>
                    <TableCell>
                      <ScoreBar score={emp.attendance_score} />
                    </TableCell>
                    <TableCell>
                      <ScoreBar score={emp.performance_score} />
                    </TableCell>
                    <TableCell>
                      <ScoreBar score={emp.attitude_score} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-green-600 dark:text-green-400 font-medium">
                          +{emp.observations_summary.positive}
                        </span>
                        <span className="text-red-600 dark:text-red-400 font-medium">
                          -{emp.observations_summary.negative}
                        </span>
                        <span className="text-gray-500 dark:text-slate-400">
                          ~{emp.observations_summary.neutral}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium text-gray-700 dark:text-slate-300">
                        {emp.attendance_summary.punctuality_rate}%
                      </span>
                    </TableCell>
                    <TableCell>
                      <TrendIcon trend={emp.trend} />
                    </TableCell>
                    <TableCell>
                      <Badge className={RISK_COLORS[emp.risk_level]}>
                        {RISK_LABELS[emp.risk_level]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {emp.recommendations.slice(0, 2).map((rec, i) => (
                          <Badge key={i} variant="outline" className="text-xs truncate max-w-[180px]">
                            {rec}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
