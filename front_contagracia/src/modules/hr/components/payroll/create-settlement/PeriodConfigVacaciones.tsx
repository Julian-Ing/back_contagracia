'use client';

import { useEffect } from 'react';
import { Label } from '@/shared/components/ui/label';
import { Select } from '@/shared/components/ui/select';
import { DatePicker } from '@/shared/components/ui/date-picker';
import { Palmtree } from 'lucide-react';
import type { CreateSettlementFormState } from '../../../types';

interface PeriodConfigVacacionesProps {
  form: CreateSettlementFormState;
  onUpdate: <K extends keyof CreateSettlementFormState>(key: K, value: CreateSettlementFormState[K]) => void;
}

const YEARS = Array.from({ length: 5 }, (_, i) => {
  const y = new Date().getFullYear() - i;
  return { value: String(y), label: String(y) };
});

export function PeriodConfigVacaciones({ form, onUpdate }: PeriodConfigVacacionesProps) {
  const { year } = form;

  // Default date range to full year
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

      <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
        <div className="flex items-start gap-2">
          <Palmtree className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm text-green-800 dark:text-green-300">
              Las fechas se estableceran segun los <strong>permisos de vacaciones aprobados</strong> de los empleados seleccionados.
            </p>
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
              Se requiere que el empleado tenga un permiso de vacaciones aprobado para ser incluido en el calculo.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
