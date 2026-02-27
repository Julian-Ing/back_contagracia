'use client';

import {
  Users,
  Crown,
  UserCheck,
  TrendingUp,
  Target,
  Trophy,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
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

function roleBadge(role: string) {
  if (role === 'SALES_DIRECTOR') {
    return (
      <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
        Director
      </Badge>
    );
  }
  return (
    <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
      Asesor
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TeamManagementPage() {
  const { members, loading } = useTeam();

  const directors = members.filter((m) => m.role === 'SALES_DIRECTOR');
  const advisors = members.filter((m) => m.role === 'SALES_ADVISOR');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 dark:border-purple-400 mx-auto" />
          <p className="text-gray-500 dark:text-slate-400">Cargando equipo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Users className="h-7 w-7 text-purple-600 dark:text-purple-400" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Gestión de Equipos
        </h1>
      </div>

      {/* ---- Team Hierarchy ---- */}
      <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">Jerarquía del Equipo</CardTitle>
          <CardDescription className="text-gray-500 dark:text-slate-400">
            Estructura organizacional del equipo comercial
          </CardDescription>
        </CardHeader>
        <CardContent>
          {directors.map((director) => {
            const dirAdvisors = advisors.filter((a) => a.supervisor_id === director.id);
            return (
              <div key={director.id} className="space-y-4">
                {/* Director card */}
                <div className="flex justify-center">
                  <div className="w-full max-w-sm rounded-lg border-2 border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/20 p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-200 dark:bg-purple-800">
                        <Crown className="h-5 w-5 text-purple-700 dark:text-purple-300" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{director.name}</p>
                        {roleBadge(director.role)}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-sm">
                      <div>
                        <p className="text-gray-500 dark:text-slate-400">Leads</p>
                        <p className="font-bold text-gray-900 dark:text-white">{director.leads_count}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-slate-400">Opps</p>
                        <p className="font-bold text-gray-900 dark:text-white">{director.opportunities_count}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-slate-400">Ganadas</p>
                        <p className="font-bold text-gray-900 dark:text-white">{director.won_count}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Connector line */}
                <div className="flex justify-center">
                  <div className="h-8 w-px bg-gray-300 dark:bg-slate-600" />
                </div>

                {/* Horizontal connector */}
                <div className="flex justify-center">
                  <div className="h-px bg-gray-300 dark:bg-slate-600" style={{ width: `${Math.min(dirAdvisors.length * 25, 90)}%` }} />
                </div>

                {/* Advisors */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {dirAdvisors.map((advisor) => (
                    <div
                      key={advisor.id}
                      className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-200 dark:bg-blue-800">
                          <UserCheck className="h-4 w-4 text-blue-700 dark:text-blue-300" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white text-sm">{advisor.name}</p>
                          {roleBadge(advisor.role)}
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div>
                          <p className="text-gray-500 dark:text-slate-400">Leads</p>
                          <p className="font-bold text-gray-900 dark:text-white">{advisor.leads_count}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-slate-400">Opps</p>
                          <p className="font-bold text-gray-900 dark:text-white">{advisor.opportunities_count}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-slate-400">Ganadas</p>
                          <p className="font-bold text-gray-900 dark:text-white">{advisor.won_count}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* ---- Detail Table ---- */}
      <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
            <Target className="h-5 w-5 text-gray-500 dark:text-slate-400" />
            Detalle del Equipo
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-200 dark:border-slate-700">
                  <TableHead className="text-gray-600 dark:text-slate-300">Nombre</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300">Rol</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300 text-right">Leads Asignados</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300 text-right">Opps Abiertas</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300 text-right">Opps Ganadas</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300 text-right">Valor Ganado (COP)</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300 text-right">Tasa Conversión</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow
                    key={member.id}
                    className="border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/40"
                  >
                    <TableCell className="font-medium text-gray-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        {member.role === 'SALES_DIRECTOR' && (
                          <Crown className="h-4 w-4 text-purple-500" />
                        )}
                        {member.name}
                      </div>
                    </TableCell>
                    <TableCell>{roleBadge(member.role)}</TableCell>
                    <TableCell className="text-right text-gray-700 dark:text-slate-300">
                      {member.leads_count}
                    </TableCell>
                    <TableCell className="text-right text-gray-700 dark:text-slate-300">
                      {member.opportunities_count}
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
