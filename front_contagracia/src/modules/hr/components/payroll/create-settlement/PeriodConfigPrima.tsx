'use client';

import { useEffect } from 'react';
import { Label } from '@/shared/components/ui/label';
import { Select } from '@/shared/components/ui/select';
import { DatePicker } from '@/shared/components/ui/date-picker';
import { Gift } from 'lucide-react';
import type { CreateSettlementFormState } from '../../../types';

interface PeriodConfigPrimaProps {
  form: CreateSettlementFormState;
  onUpdate: <K extends keyof CreateSettlementFormState>(key: K, value: CreateSettlementFormState[K]) => void;
}

const YEARS = Array.from({ length: 5 }, (_, i) => {
  const y = new Date().getFullYear() - i;
  return { value: String(y), label: String(y) };
});

const SEMESTERS = [
  { value: 'first', label: 'Primer Semestre (Enero - Junio)' },
  { value: 'second', label: 'Segundo Semestre (Julio - Diciembre)' },
];

export function PeriodConfigPrima({ form, onUpdate }: PeriodConfigPrimaProps) {
  const { year, semester } = form;

  // Auto-calculate dates from year + semester
  useEffect(() => {
    if (!year || !semester) return;

    let startDate: string;
    let endDate: string;

    if (semester === 'first') {
      startDate = `${year}-01-01`;
      endDate = `${year}-06-30`;
    } else {
      startDate = `${year}-07-01`;
      endDate = `${year}-12-31`;
    }

    if (form.start_date !== startDate) onUpdate('start_date', startDate);
    if (form.end_date !== endDate) onUpdate('end_date', endDate);
  }, [year, semester]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label>Ano *</Label>
          <Select
            value={String(year)}
            onChange={(v) => onUpdate('year', Number(v))}
            options={YEARS}
          />
        </div>
        <div>
          <Label>Semestre *</Label>
          <Select
            value={semester}
            onChange={(v) => onUpdate('semester', v as 'first' | 'second')}
            options={SEMESTERS}
            placeholder="Selecciona el semestre"
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

      {form.start_date && form.end_date && (
        <p className="text-xs text-muted-foreground">
          Periodo: <span className="font-medium text-foreground">{form.start_date}</span> a{' '}
          <span className="font-medium text-foreground">{form.end_date}</span>
        </p>
      )}

      <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
        <div className="flex items-start gap-2">
          <Gift className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-800 dark:text-amber-300">
            Esta liquidacion calculara <strong>solo la prima de servicios</strong> del semestre correspondiente.
          </p>
        </div>
      </div>
    </div>
  );
}
