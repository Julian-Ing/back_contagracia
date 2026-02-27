'use client';

import { Card, CardContent } from '@/shared/components/ui/card';
import { Clock, CheckCircle, AlertCircle } from 'lucide-react';
import type { LeaveStats as LeaveStatsType } from '../types';
import { LEAVE_TYPE_LABELS } from '../types';

interface LeaveStatsProps {
  stats: LeaveStatsType | null;
  loading: boolean;
}

export function LeaveStats({ stats, loading }: LeaveStatsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[...Array(3)].map((_, i) => (
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
      label: 'Pendientes',
      value: stats.pending,
      icon: Clock,
      color: 'text-yellow-600 dark:text-yellow-400',
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
    },
    {
      label: 'Aprobadas (mes)',
      value: stats.approved_this_month,
      icon: CheckCircle,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    },
    {
      label: 'Solicitudes del Mes',
      value: stats.this_month.total,
      icon: AlertCircle,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-100 dark:bg-blue-900/30',
    },
  ];

  return (
    <div className="space-y-4 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

      {stats.this_month.by_type.length > 0 && (
        <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">Resumen por Tipo (mes)</p>
            <div className="flex flex-wrap gap-4 text-sm">
              {stats.this_month.by_type.map((item) => (
                <div key={item.leave_type} className="text-gray-500 dark:text-slate-400">
                  <span className="font-medium text-gray-700 dark:text-slate-300">
                    {LEAVE_TYPE_LABELS[item.leave_type] || item.leave_type}:
                  </span>{' '}
                  {item.count} ({item.days} dias)
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
