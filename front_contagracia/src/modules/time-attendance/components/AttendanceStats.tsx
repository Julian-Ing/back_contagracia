'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Users, UserCheck, UserX, Timer } from 'lucide-react';
import { attendanceService } from '../services/attendance.service';
import type { AttendanceStats as AttendanceStatsType } from '../types';
import { OVERTIME_TYPE_LABELS } from '../types';

export function AttendanceStats() {
  const [stats, setStats] = useState<AttendanceStatsType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await attendanceService.getStats();
        setStats(data);
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
            <CardContent className="p-4">
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-24" />
                <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-16" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const cards = [
    {
      label: 'Empleados Activos',
      value: stats.attendance.total_active_employees,
      icon: Users,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
      label: 'Presentes Hoy',
      value: stats.attendance.present_today,
      icon: UserCheck,
      color: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-100 dark:bg-green-900/30',
    },
    {
      label: 'Ausentes Hoy',
      value: stats.attendance.absent_today,
      icon: UserX,
      color: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-100 dark:bg-red-900/30',
    },
  ];

  return (
    <div className="space-y-4 mb-6">
      {/* Cards principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => (
          <Card key={card.label} className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-lg ${card.bg} flex items-center justify-center`}>
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-slate-400">{card.label}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{card.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Resumen horas extras del mes */}
      {(stats.overtime.pending_requests > 0 || stats.overtime.this_month.total_hours > 0) && (
        <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Timer className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">Horas Extras del Mes</span>
              {stats.overtime.pending_requests > 0 && (
                <span className="text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 px-2 py-0.5 rounded-full">
                  {stats.overtime.pending_requests} pendiente(s)
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              <div>
                <span className="text-gray-500 dark:text-slate-400">Total Horas: </span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {stats.overtime.this_month.total_hours.toFixed(1)}h
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-slate-400">Total Monto: </span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {formatCurrency(stats.overtime.this_month.total_amount)}
                </span>
              </div>
              {Object.entries(stats.overtime.this_month.by_type).map(([type, data]) => (
                <div key={type} className="text-xs text-gray-500 dark:text-slate-400">
                  {OVERTIME_TYPE_LABELS[type as keyof typeof OVERTIME_TYPE_LABELS] || type}: {data.count} ({data.hours.toFixed(1)}h)
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
