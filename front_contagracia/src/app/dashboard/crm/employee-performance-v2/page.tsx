'use client';

import { useState, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  Target,
  Trophy,
  Users,
  Activity,
  CheckCircle2,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Select } from '@/shared/components/ui/select';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/shared/components/ui/table';
import { cn } from '@/shared/lib/utils';

import type { TeamMember } from '@/modules/crm/types';
import { useTeam } from '@/modules/crm/hooks/useTeam';

// ---------------------------------------------------------------------------
// Mock data for charts (keep for now)
// ---------------------------------------------------------------------------

const MONTHLY_DATA = [
  { mes: 'Jul', leads: 18, oportunidades: 10, ganadas: 5 },
  { mes: 'Ago', leads: 22, oportunidades: 14, ganadas: 8 },
  { mes: 'Sep', leads: 25, oportunidades: 16, ganadas: 10 },
  { mes: 'Oct', leads: 30, oportunidades: 20, ganadas: 12 },
  { mes: 'Nov', leads: 28, oportunidades: 18, ganadas: 11 },
  { mes: 'Dic', leads: 35, oportunidades: 22, ganadas: 15 },
];

const ACTIVITY_DISTRIBUTION = [
  { name: 'Llamadas', value: 35 },
  { name: 'Reuniones', value: 20 },
  { name: 'Emails', value: 25 },
  { name: 'WhatsApp', value: 15 },
  { name: 'Tareas', value: 5 },
];

const PIE_COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

const CONVERSION_TREND = [
  { mes: 'Jul', tasa: 27.8 },
  { mes: 'Ago', tasa: 36.4 },
  { mes: 'Sep', tasa: 40.0 },
  { mes: 'Oct', tasa: 40.0 },
  { mes: 'Nov', tasa: 39.3 },
  { mes: 'Dic', tasa: 42.9 },
];

const DATE_RANGES = [
  { value: 'last_30', label: 'Últimos 30 días' },
  { value: 'last_90', label: 'Últimos 90 días' },
  { value: 'last_180', label: 'Últimos 6 meses' },
  { value: 'year', label: 'Este año' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCOP(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function EmployeePerformanceV2Page() {
  const { members, ranking, loading, fetchRanking } = useTeam();
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('last_180');

  const currentMember = useMemo(() => {
    if (selectedEmployee === 'all') return null;
    return members.find((m) => m.id === selectedEmployee) ?? null;
  }, [selectedEmployee, members]);

  // Aggregate stats
  const stats = useMemo(() => {
    if (currentMember) return currentMember;
    return {
      leads_count: members.reduce((s, m) => s + m.leads_count, 0),
      opportunities_count: members.reduce((s, m) => s + m.opportunities_count, 0),
      won_count: members.reduce((s, m) => s + m.won_count, 0),
      total_won_value: members.reduce((s, m) => s + m.total_won_value, 0),
      activities_completed: members.reduce((s, m) => s + m.activities_completed, 0),
      conversion_rate:
        members.reduce((s, m) => s + m.won_count, 0) /
        Math.max(members.reduce((s, m) => s + m.leads_count, 0), 1) *
        100,
    };
  }, [currentMember, members]);

  const statCards = [
    { label: 'Leads Asignados', value: stats.leads_count, icon: Target, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30' },
    { label: 'Opps Abiertas', value: stats.opportunities_count, icon: Activity, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30' },
    { label: 'Opps Ganadas', value: stats.won_count, icon: Trophy, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
    { label: 'Valor Ganado', value: formatCOP(stats.total_won_value), icon: TrendingUp, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-900/30', isString: true },
    { label: 'Actividades Completadas', value: stats.activities_completed, icon: CheckCircle2, color: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-100 dark:bg-cyan-900/30' },
    { label: 'Tasa Conversión', value: `${stats.conversion_rate.toFixed(1)}%`, icon: BarChart3, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-100 dark:bg-rose-900/30', isString: true },
  ];

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="text-gray-600 dark:text-slate-400">Cargando desempeño comercial...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-7 w-7 text-purple-600 dark:text-purple-400" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Desempeño Comercial
          </h1>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Select
            options={[{ value: 'all', label: 'Todos los empleados' }, ...members.map((m) => ({ value: m.id, label: m.name }))]}
            value={selectedEmployee}
            onChange={setSelectedEmployee}
            placeholder="Empleado"
            className="w-52 bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700"
          />

          <Select
            options={DATE_RANGES}
            value={dateRange}
            onChange={setDateRange}
            placeholder="Rango"
            className="w-48 bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700"
          />
        </div>
      </div>

      {/* ---- Stats Cards ---- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', s.bg)}>
                    <Icon className={cn('h-5 w-5', s.color)} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-slate-400">{s.label}</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {s.isString ? s.value : String(s.value)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ---- Charts Row ---- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white text-base">
              Leads vs Oportunidades vs Ganadas
            </CardTitle>
            <CardDescription className="text-gray-500 dark:text-slate-400">
              Progresión mensual del embudo comercial
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={MONTHLY_DATA}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                  <XAxis dataKey="mes" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#f1f5f9',
                    }}
                  />
                  <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
                  <Bar dataKey="leads" name="Leads" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="oportunidades" name="Oportunidades" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="ganadas" name="Ganadas" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white text-base">
              Distribución por Tipo de Actividad
            </CardTitle>
            <CardDescription className="text-gray-500 dark:text-slate-400">
              Proporción de actividades realizadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={ACTIVITY_DISTRIBUTION}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  >
                    {ACTIVITY_DISTRIBUTION.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#f1f5f9',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Line Chart */}
      <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white text-base">
            Tendencia de Tasa de Conversión
          </CardTitle>
          <CardDescription className="text-gray-500 dark:text-slate-400">
            Evolución mensual del porcentaje de conversión
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={CONVERSION_TREND}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                <XAxis dataKey="mes" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  domain={[0, 50]}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#f1f5f9',
                  }}
                  formatter={(value) => [`${Number(value ?? 0).toFixed(1)}%`, 'Tasa']}
                />
                <Line
                  type="monotone"
                  dataKey="tasa"
                  name="Tasa de Conversión"
                  stroke="#8b5cf6"
                  strokeWidth={3}
                  dot={{ fill: '#8b5cf6', r: 5 }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* ---- Ranking Table ---- */}
      <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            Ranking por Tasa de Conversión
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-200 dark:border-slate-700">
                  <TableHead className="text-gray-600 dark:text-slate-300 w-16 text-center">#</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300">Nombre</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300">Rol</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300 text-right">Leads</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300 text-right">Ganadas</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300 text-right">Valor Ganado</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300 text-right">Tasa Conversión</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ranking.map((member, idx) => (
                  <TableRow
                    key={member.id}
                    className="border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/40"
                  >
                    <TableCell className="text-center">
                      {idx === 0 ? (
                        <span className="text-amber-500 font-bold text-lg">1</span>
                      ) : idx === 1 ? (
                        <span className="text-gray-400 font-bold text-lg">2</span>
                      ) : idx === 2 ? (
                        <span className="text-orange-600 dark:text-orange-400 font-bold text-lg">3</span>
                      ) : (
                        <span className="text-gray-500 dark:text-slate-400 font-medium">{idx + 1}</span>
                      )}
                    </TableCell>
                    <TableCell className="font-medium text-gray-900 dark:text-white">
                      {member.name}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={cn(
                          member.role === 'SALES_DIRECTOR'
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                        )}
                      >
                        {member.role === 'SALES_DIRECTOR' ? 'Director' : 'Asesor'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-gray-700 dark:text-slate-300">
                      {member.leads_count}
                    </TableCell>
                    <TableCell className="text-right text-gray-700 dark:text-slate-300">
                      {member.won_count}
                    </TableCell>
                    <TableCell className="text-right font-medium text-gray-900 dark:text-white">
                      {formatCOP(member.total_won_value)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={cn(
                          'font-semibold',
                          member.conversion_rate >= 35
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : member.conversion_rate >= 25
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-red-600 dark:text-red-400',
                        )}
                      >
                        {member.conversion_rate.toFixed(1)}%
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
