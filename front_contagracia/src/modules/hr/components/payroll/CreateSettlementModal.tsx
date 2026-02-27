'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Select } from '@/shared/components/ui/select';
import { DatePicker } from '@/shared/components/ui/date-picker';
import { Loader2, Plus } from 'lucide-react';
import { payrollSettlementsService } from '../../services/payroll-settlements.service';
import { SETTLEMENT_TYPE_LABELS } from '../../types';
import type { SettlementType, CreateSettlementDto } from '../../types';
import toast from 'react-hot-toast';

interface CreateSettlementModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const INITIAL_FORM: CreateSettlementDto = {
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
  notes: '',
};

export function CreateSettlementModal({ open, onClose, onSuccess }: CreateSettlementModalProps) {
  const [form, setForm] = useState<CreateSettlementDto>({ ...INITIAL_FORM });
  const [submitting, setSubmitting] = useState(false);

  const handleOpen = (isOpen: boolean) => {
    if (!isOpen) {
      setForm({ ...INITIAL_FORM });
      onClose();
    }
  };

  const handleSubmit = async () => {
    if (!form.settlement_name.trim()) {
      toast.error('El nombre es requerido');
      return;
    }
    if (!form.start_date || !form.end_date) {
      toast.error('Las fechas de inicio y fin son requeridas');
      return;
    }

    setSubmitting(true);
    try {
      await payrollSettlementsService.create(form);
      toast.success('Liquidacion creada exitosamente');
      setForm({ ...INITIAL_FORM });
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al crear la liquidacion');
    } finally {
      setSubmitting(false);
    }
  };

  const isRegular = form.settlement_type === 'REGULAR';

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Nueva Liquidacion de Nomina
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label>Nombre *</Label>
            <Input
              value={form.settlement_name}
              onChange={(e) => setForm((p) => ({ ...p, settlement_name: e.target.value }))}
              placeholder="Ej: Nomina Enero 2026 - Quincena 1"
            />
          </div>

          <div>
            <Label>Tipo de Liquidacion</Label>
            <Select
              value={form.settlement_type}
              onChange={(v) => setForm((p) => ({ ...p, settlement_type: v as SettlementType }))}
              options={Object.entries(SETTLEMENT_TYPE_LABELS).map(([key, label]) => ({ value: key, label }))}
              placeholder="Selecciona tipo"
            />
          </div>

          <div>
            <Label>Periodo</Label>
            <Select
              value={String(form.period_number ?? 1)}
              onChange={(v) => setForm((p) => ({ ...p, period_number: Number(v) }))}
              options={[
                { value: '1', label: 'Periodo 1 (Quincena 1)' },
                { value: '2', label: 'Periodo 2 (Quincena 2)' },
              ]}
              placeholder="Selecciona periodo"
            />
          </div>

          <div>
            <Label>Fecha Inicio *</Label>
            <DatePicker
              value={form.start_date}
              onChange={(v) => setForm((p) => ({ ...p, start_date: v }))}
            />
          </div>

          <div>
            <Label>Fecha Fin *</Label>
            <DatePicker
              value={form.end_date}
              onChange={(v) => setForm((p) => ({ ...p, end_date: v }))}
            />
          </div>

          <div>
            <Label>Fecha de Pago</Label>
            <DatePicker
              value={form.payment_date ?? ''}
              onChange={(v) => setForm((p) => ({ ...p, payment_date: v }))}
              clearable
            />
          </div>

          {isRegular && (
            <div className="col-span-2 space-y-3 p-4 rounded-lg bg-gray-50 dark:bg-gray-900">
              <Label className="text-sm font-medium">Liquidaciones Adicionales</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="liq_prima"
                    checked={form.liquidate_prima}
                    onCheckedChange={(c) => setForm((p) => ({ ...p, liquidate_prima: !!c }))}
                  />
                  <Label htmlFor="liq_prima" className="font-normal">Prima de Servicios</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="liq_cesantias"
                    checked={form.liquidate_cesantias}
                    onCheckedChange={(c) => setForm((p) => ({ ...p, liquidate_cesantias: !!c }))}
                  />
                  <Label htmlFor="liq_cesantias" className="font-normal">Cesantias</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="liq_intereses"
                    checked={form.liquidate_cesantias_interest}
                    onCheckedChange={(c) => setForm((p) => ({ ...p, liquidate_cesantias_interest: !!c }))}
                  />
                  <Label htmlFor="liq_intereses" className="font-normal">Intereses Cesantias</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="liq_vacaciones"
                    checked={form.liquidate_vacaciones}
                    onCheckedChange={(c) => setForm((p) => ({ ...p, liquidate_vacaciones: !!c }))}
                  />
                  <Label htmlFor="liq_vacaciones" className="font-normal">Vacaciones</Label>
                </div>
              </div>
            </div>
          )}

          <div className="col-span-2">
            <Label>Notas</Label>
            <Textarea
              value={form.notes ?? ''}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              placeholder="Notas opcionales..."
              rows={2}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creando...
              </>
            ) : (
              'Crear Liquidacion'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
