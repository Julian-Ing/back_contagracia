'use client';

import { Card, CardContent } from '@/shared/components/ui/card';
import { Clock, CheckCircle, DollarSign } from 'lucide-react';
import type { TravelExpenseStats as TravelExpenseStatsType } from '../types';
import { EXPENSE_CATEGORY_LABELS } from '../types';

function formatCOP(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

interface TravelExpenseStatsProps {
  stats: TravelExpenseStatsType | null;
  loading: boolean;
}

export function TravelExpenseStats({ stats, loading }: TravelExpenseStatsProps) {
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
      value: String(stats.pending),
      icon: Clock,
      color: 'text-yellow-600 dark:text-yellow-400',
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
    },
    {
      label: 'Aprobados (mes)',
      value: String(stats.approved_this_month),
      icon: CheckCircle,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    },
    {
      label: 'Total Asignado (mes)',
      value: formatCOP(stats.total_assigned_this_month),
      icon: DollarSign,
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

      {stats.this_month.by_category.length > 0 && (
        <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">Resumen por Categoria (mes)</p>
            <div className="flex flex-wrap gap-4 text-sm">
              {stats.this_month.by_category.map((item) => (
                <div key={item.expense_category} className="text-gray-500 dark:text-slate-400">
                  <span className="font-medium text-gray-700 dark:text-slate-300">
                    {EXPENSE_CATEGORY_LABELS[item.expense_category] || item.expense_category}:
                  </span>{' '}
                  {item.count} ({formatCOP(item.total)})
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
