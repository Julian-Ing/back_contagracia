'use client';

import { useEffect } from 'react';
import { Label } from '@/shared/components/ui/label';
import { Select } from '@/shared/components/ui/select';
import { DatePicker } from '@/shared/components/ui/date-picker';
import type { CreateSettlementFormState, PayFrequency } from '../../../types';

interface PeriodConfigRegularProps {
  form: CreateSettlementFormState;
  onUpdate: <K extends keyof CreateSettlementFormState>(key: K, value: CreateSettlementFormState[K]) => void;
}

const YEARS = Array.from({ length: 5 }, (_, i) => {
  const y = new Date().getFullYear() - i;
  return { value: String(y), label: String(y) };
});

const MONTHS = [
  { value: '1', label: 'Enero' }, { value: '2', label: 'Febrero' },
  { value: '3', label: 'Marzo' }, { value: '4', label: 'Abril' },
  { value: '5', label: 'Mayo' }, { value: '6', label: 'Junio' },
  { value: '7', label: 'Julio' }, { value: '8', label: 'Agosto' },
  { value: '9', label: 'Septiembre' }, { value: '10', label: 'Octubre' },
  { value: '11', label: 'Noviembre' }, { value: '12', label: 'Diciembre' },
];

const FREQUENCIES = [
  { value: 'QUINCENAL', label: 'Quincenal' },
  { value: 'MENSUAL', label: 'Mensual' },
  { value: 'SEMANAL', label: 'Semanal' },
];

function getPeriodsForFrequency(freq: PayFrequency) {
  switch (freq) {
    case 'MENSUAL':
      return [{ value: '1', label: 'Mes completo' }];
    case 'QUINCENAL':
      return [
        { value: '1', label: 'Periodo 1 (Q1) - 1 al 15' },
        { value: '2', label: 'Periodo 2 (Q2) - 16 al 30/31' },
      ];
    case 'SEMANAL':
      return [
        { value: '1', label: 'Semana 1 - 1 al 7' },
        { value: '2', label: 'Semana 2 - 8 al 14' },
        { value: '3', label: 'Semana 3 - 15 al 21' },
        { value: '4', label: 'Semana 4 - 22 al fin de mes' },
      ];
  }
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function calculateDates(year: number, month: number, freq: PayFrequency, period: number) {
  const last = lastDayOfMonth(year, month);
  switch (freq) {
    case 'MENSUAL':
      return { startDay: 1, endDay: last };
    case 'QUINCENAL':
      return period === 1
        ? { startDay: 1, endDay: 15 }
        : { startDay: 16, endDay: last };
    case 'SEMANAL':
      if (period === 1) return { startDay: 1, endDay: 7 };
      if (period === 2) return { startDay: 8, endDay: 14 };
      if (period === 3) return { startDay: 15, endDay: 21 };
      return { startDay: 22, endDay: last };
  }
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function PeriodConfigRegular({ form, onUpdate }: PeriodConfigRegularProps) {
  const { year, month, period_number, pay_frequency } = form;
  const freq = pay_frequency ?? 'QUINCENAL';
  const period = period_number ?? 1;
  const periodOptions = getPeriodsForFrequency(freq);

  // Auto-calculate start_date and end_date
  useEffect(() => {
    if (!year || !month) return;

    const { startDay, endDay } = calculateDates(year, month, freq, period);
    const startDate = `${year}-${pad2(month)}-${pad2(startDay)}`;
    const endDate = `${year}-${pad2(month)}-${pad2(endDay)}`;

    if (form.start_date !== startDate) onUpdate('start_date', startDate);
    if (form.end_date !== endDate) onUpdate('end_date', endDate);
  }, [year, month, freq, period]);

  // Reset period_number to 1 when frequency changes
  useEffect(() => {
    if (period_number && period_number > periodOptions.length) {
      onUpdate('period_number', 1);
    }
  }, [freq]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div>
          <Label>Año *</Label>
          <Select
            value={String(year)}
            onChange={(v) => onUpdate('year', Number(v))}
            options={YEARS}
          />
        </div>
        <div>
          <Label>Mes *</Label>
          <Select
            value={String(month)}
            onChange={(v) => onUpdate('month', Number(v))}
            options={MONTHS}
          />
        </div>
        <div>
          <Label>Frecuencia</Label>
          <Select
            value={freq}
            onChange={(v) => onUpdate('pay_frequency', v as PayFrequency)}
            options={FREQUENCIES}
          />
        </div>
        <div>
          <Label>Periodo</Label>
          <Select
            value={String(period)}
            onChange={(v) => onUpdate('period_number', Number(v))}
            options={periodOptions}
            disabled={freq === 'MENSUAL'}
          />
        </div>
        <div>
          <Label>Fecha de Pago</Label>
          <DatePicker
            value={form.payment_date || ''}
            onChange={(v) => onUpdate('payment_date', v)}
          />
        </div>
      </div>

      {form.start_date && form.end_date && (
        <p className="text-xs text-muted-foreground">
          Periodo: <span className="font-medium text-foreground">{form.start_date}</span> a{' '}
          <span className="font-medium text-foreground">{form.end_date}</span>
        </p>
      )}
    </div>
  );
}
