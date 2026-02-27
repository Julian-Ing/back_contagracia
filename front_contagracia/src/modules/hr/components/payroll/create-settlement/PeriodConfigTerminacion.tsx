'use client';

import { Label } from '@/shared/components/ui/label';
import { DatePicker } from '@/shared/components/ui/date-picker';
import { Select } from '@/shared/components/ui/select';
import { UserX } from 'lucide-react';
import type { CreateSettlementFormState, SettlementTerminationReason } from '../../../types';
import { SETTLEMENT_TERMINATION_REASON_LABELS } from '../../../types';

const TERMINATION_REASON_OPTIONS = (
  Object.entries(SETTLEMENT_TERMINATION_REASON_LABELS) as [SettlementTerminationReason, string][]
).map(([value, label]) => ({ value, label }));

interface PeriodConfigTerminacionProps {
  form: CreateSettlementFormState;
  onUpdate: <K extends keyof CreateSettlementFormState>(key: K, value: CreateSettlementFormState[K]) => void;
}

export function PeriodConfigTerminacion({ form, onUpdate }: PeriodConfigTerminacionProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label>Fecha Desde *</Label>
          <DatePicker
            value={form.start_date || undefined}
            onChange={(value) => onUpdate('start_date', value)}
          />
        </div>
        <div>
          <Label>Fecha Hasta *</Label>
          <DatePicker
            value={form.end_date || undefined}
            onChange={(value) => onUpdate('end_date', value)}
          />
        </div>
        <div>
          <Label>Fecha de Pago *</Label>
          <DatePicker
            value={form.payment_date || undefined}
            onChange={(value) => onUpdate('payment_date', value)}
          />
        </div>
      </div>

      {form.start_date && form.end_date && (
        <p className="text-xs text-muted-foreground">
          Se mostraran empleados cuya fecha de terminacion de contrato este dentro del rango seleccionado.
        </p>
      )}

      {/* Termination reason */}
      <div>
        <Label>Razón de Terminación *</Label>
        <Select
          options={TERMINATION_REASON_OPTIONS}
          value={form.termination_reason ?? ''}
          onChange={(value) => onUpdate('termination_reason', value as SettlementTerminationReason)}
          placeholder="Seleccionar razón..."
        />
      </div>

      {/* Salary variation radio */}
      <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
        <Label className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1 block">
          El salario del empleado tuvo variaciones durante el periodo?
        </Label>
        <p className="text-xs text-blue-600 dark:text-blue-400 mb-3">
          Si el salario cambio, se calculara el promedio para cesantias, prima y vacaciones.
        </p>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="salary_had_variations"
              checked={form.salary_had_variations === null}
              onChange={() => onUpdate('salary_had_variations', null)}
              className="w-4 h-4 text-blue-600"
            />
            <span className="text-sm">Detectar automaticamente</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="salary_had_variations"
              checked={form.salary_had_variations === false}
              onChange={() => onUpdate('salary_had_variations', false)}
              className="w-4 h-4 text-blue-600"
            />
            <span className="text-sm">No, se mantuvo igual</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="salary_had_variations"
              checked={form.salary_had_variations === true}
              onChange={() => onUpdate('salary_had_variations', true)}
              className="w-4 h-4 text-blue-600"
            />
            <span className="text-sm">Si, tuvo variaciones</span>
          </label>
        </div>
      </div>

      {/* Warning banner */}
      <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800">
        <div className="flex items-start gap-2">
          <UserX className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
          <p className="text-sm text-red-800 dark:text-red-300">
            Liquidacion final. Se calcularan <strong>todas las prestaciones pendientes</strong>: vacaciones, prima proporcional, cesantias e intereses.
          </p>
        </div>
      </div>
    </div>
  );
}
