'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { payrollSettlementsService } from '../../services/payroll-settlements.service';
import type { CreateSettlementFormState, CreateSettlementDto } from '../../types';
import { SettlementInfoCard } from './create-settlement/SettlementInfoCard';
import { EmployeeSelectionCard } from './create-settlement/EmployeeSelectionCard';
import { CreateSettlementFooter } from './create-settlement/CreateSettlementFooter';
import toast from 'react-hot-toast';

const MONTH_NAMES = [
  '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function suggestName(form: CreateSettlementFormState): string {
  const { settlement_type, year, month, semester, period_number, pay_frequency } = form;
  const type = settlement_type ?? 'REGULAR';

  switch (type) {
    case 'REGULAR': {
      const base = `Nomina ${MONTH_NAMES[month] || ''} ${year}`;
      const freq = pay_frequency ?? 'QUINCENAL';
      if (freq === 'MENSUAL') return base.trim();
      if (freq === 'SEMANAL') return `${base} S${period_number ?? 1}`.trim();
      return `${base} Q${period_number ?? 1}`.trim();
    }
    case 'PRIMA':
      return `Prima ${semester === 'first' ? '1er' : semester === 'second' ? '2do' : ''} Semestre ${year}`.trim();
    case 'CESANTIAS':
      return `Cesantias ${year}`;
    case 'VACACIONES':
      return `Vacaciones ${year}`;
    case 'TERMINACION':
      return `Terminacion ${MONTH_NAMES[month] || ''} ${year}`.trim();
    default:
      return '';
  }
}

const now = new Date();

const INITIAL_FORM: CreateSettlementFormState = {
  settlement_name: '',
  settlement_type: 'REGULAR',
  start_date: '',
  end_date: '',
  payment_date: '',
  period_number: 1,
  liquidate_prima: false,
  liquidate_cesantias: false,
  liquidate_cesantias_interest: false,
  liquidate_vacaciones: false,
  termination_reason: undefined,
  notes: '',
  year: now.getFullYear(),
  month: now.getMonth() + 1,
  semester: '',
  salary_had_variations: null,
  pay_frequency: 'QUINCENAL',
};

export function CreateSettlementForm() {
  const router = useRouter();
  const [form, setForm] = useState<CreateSettlementFormState>({ ...INITIAL_FORM });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const autoNameRef = useRef(true);

  const updateField = useCallback(<K extends keyof CreateSettlementFormState>(key: K, value: CreateSettlementFormState[K]) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };

      // When type changes, reset period-related fields
      if (key === 'settlement_type') {
        next.start_date = '';
        next.end_date = '';
        next.payment_date = '';
        next.semester = '';
        next.salary_had_variations = null;
        next.pay_frequency = 'QUINCENAL';
        next.period_number = 1;
        next.liquidate_prima = false;
        next.liquidate_cesantias = false;
        next.liquidate_cesantias_interest = false;
        next.liquidate_vacaciones = false;
      }

      return next;
    });
  }, []);

  // Auto-suggest name
  useEffect(() => {
    if (!autoNameRef.current) return;
    const suggested = suggestName(form);
    if (suggested && form.settlement_name !== suggested) {
      setForm((prev) => ({ ...prev, settlement_name: suggested }));
    }
  }, [form.settlement_type, form.year, form.month, form.semester, form.period_number, form.pay_frequency]);

  const handleUpdate = useCallback(<K extends keyof CreateSettlementFormState>(key: K, value: CreateSettlementFormState[K]) => {
    if (key === 'settlement_name') {
      autoNameRef.current = false;
      setForm((prev) => ({ ...prev, settlement_name: value as string }));
      return;
    }
    if (key === 'settlement_type') {
      autoNameRef.current = true;
    }
    updateField(key, value);
  }, [updateField]);

  const submittingRef = useRef(false);
  const handleSubmit = useCallback(async () => {
    if (submittingRef.current) return;
    if (!form.settlement_name?.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }
    if (!form.start_date || !form.end_date) {
      toast.error('Las fechas de inicio y fin son obligatorias');
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    try {
      const payload: CreateSettlementDto = {
        settlement_name: form.settlement_name,
        settlement_type: form.settlement_type,
        start_date: form.start_date,
        end_date: form.end_date,
        payment_date: form.payment_date || undefined,
        period_number: form.period_number,
        liquidate_prima: form.liquidate_prima,
        liquidate_cesantias: form.liquidate_cesantias,
        liquidate_cesantias_interest: form.liquidate_cesantias_interest,
        liquidate_vacaciones: form.liquidate_vacaciones,
        termination_reason: form.termination_reason || undefined,
        employee_ids: selectedIds.size > 0 ? Array.from(selectedIds) : undefined,
        notes: form.notes || undefined,
      };
      const created = await payrollSettlementsService.create(payload);
      toast.success('Liquidacion creada exitosamente');
      router.push(`/dashboard/payroll/settlements/${created.id}`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al crear liquidacion');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [form, selectedIds, router]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <SettlementInfoCard form={form} onUpdate={handleUpdate} />
      <EmployeeSelectionCard
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        settlementType={form.settlement_type ?? 'REGULAR'}
        startDate={form.start_date}
        endDate={form.end_date}
      />
      <CreateSettlementFooter
        selectedCount={selectedIds.size}
        submitting={submitting}
        onCancel={() => router.back()}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
