'use client';

import { useEffect } from 'react';
import { Label } from '@/shared/components/ui/label';
import { Select } from '@/shared/components/ui/select';
import { DatePicker } from '@/shared/components/ui/date-picker';
import { Landmark, Building2, User } from 'lucide-react';
import type { CreateSettlementFormState } from '../../../types';

interface PeriodConfigCesantiasProps {
  form: CreateSettlementFormState;
  onUpdate: <K extends keyof CreateSettlementFormState>(key: K, value: CreateSettlementFormState[K]) => void;
}

const YEARS = Array.from({ length: 5 }, (_, i) => {
  const y = new Date().getFullYear() - i;
  return { value: String(y), label: String(y) };
});

export function PeriodConfigCesantias({ form, onUpdate }: PeriodConfigCesantiasProps) {
  const { year } = form;

  // Auto-calculate full year dates
  useEffect(() => {
    if (!year) return;
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    if (form.start_date !== startDate) onUpdate('start_date', startDate);
    if (form.end_date !== endDate) onUpdate('end_date', endDate);
  }, [year]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Ano *</Label>
          <Select
            value={String(year)}
            onChange={(v) => onUpdate('year', Number(v))}
            options={YEARS}
          />
        </div>
        <div>
          <Label>Fecha de Pago</Label>
          <DatePicker
            value={form.payment_date || undefined}
            onChange={(value) => onUpdate('payment_date', value)}
          />
        </div>
      </div>

      {/* Info card */}
      <div className="rounded-lg border border-purple-200 dark:border-purple-800 overflow-hidden">
        <div className="px-4 py-3 bg-gradient-to-r from-purple-600 to-violet-600">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-white/20 flex items-center justify-center">
              <Landmark className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Cesantias {year}</p>
              <p className="text-xs text-purple-100">1 de enero — 31 de diciembre</p>
            </div>
          </div>
        </div>

        <div className="bg-purple-50/50 dark:bg-purple-950/10 px-4 py-3">
          <p className="text-xs font-medium text-purple-900 dark:text-purple-200 mb-2">Fechas limite de pago</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 px-2.5 py-1.5 bg-white dark:bg-purple-950/30 rounded border border-purple-100 dark:border-purple-800/50">
              <Building2 className="h-4 w-4 text-purple-500 shrink-0" />
              <div>
                <p className="text-[10px] text-purple-500 dark:text-purple-400">Cesantias al fondo</p>
                <p className="text-xs font-medium text-purple-900 dark:text-purple-200">14 feb {year + 1}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-2.5 py-1.5 bg-white dark:bg-purple-950/30 rounded border border-purple-100 dark:border-purple-800/50">
              <User className="h-4 w-4 text-violet-500 shrink-0" />
              <div>
                <p className="text-[10px] text-purple-500 dark:text-purple-400">Intereses al empleado</p>
                <p className="text-xs font-medium text-purple-900 dark:text-purple-200">31 ene {year + 1}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
