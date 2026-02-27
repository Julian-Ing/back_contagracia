'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { Select } from '@/shared/components/ui/select';
import toast from 'react-hot-toast';
import { leavesService } from '../services/leaves.service';
import { LEAVE_TYPE_OPTIONS } from '../types';
import type { LeaveRequest, LeaveType, CreateLeaveDto, EditLeaveDto } from '../types';

interface Employee {
  id: string;
  name: string;
}

interface LeaveFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: LeaveRequest | null;
  employees: Employee[];
}

export function LeaveForm({
  open,
  onClose,
  onSuccess,
  initialData,
  employees,
}: LeaveFormProps) {
  const isEdit = !!initialData;

  const [employeeId, setEmployeeId] = useState('');
  const [leaveType, setLeaveType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [daysRequested, setDaysRequested] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialData) {
      setEmployeeId(initialData.third_party_id);
      setLeaveType(initialData.leave_type);
      setStartDate(initialData.start_date?.split('T')[0] || '');
      setEndDate(initialData.end_date?.split('T')[0] || '');
      setDaysRequested(String(initialData.days_requested));
      setReason(initialData.reason || '');
    } else {
      setEmployeeId('');
      setLeaveType('');
      setStartDate('');
      setEndDate('');
      setDaysRequested('');
      setReason('');
    }
  }, [initialData, open]);

  const employeeOptions = employees.map((e) => ({ value: e.id, label: e.name }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!employeeId || !leaveType || !startDate || !endDate || !daysRequested) {
      toast.error('Completa todos los campos obligatorios');
      return;
    }

    const days = parseInt(daysRequested, 10);
    if (isNaN(days) || days < 1) {
      toast.error('Los dias solicitados deben ser al menos 1');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      toast.error('La fecha de inicio no puede ser posterior a la fecha fin');
      return;
    }

    setLoading(true);
    try {
      if (isEdit && initialData) {
        const data: EditLeaveDto = {
          leave_type: leaveType as LeaveType,
          start_date: startDate,
          end_date: endDate,
          days_requested: days,
          reason: reason || undefined,
        };
        await leavesService.update(initialData.id, data);
        toast.success('Solicitud actualizada');
      } else {
        const data: CreateLeaveDto = {
          third_party_id: employeeId,
          leave_type: leaveType as LeaveType,
          start_date: startDate,
          end_date: endDate,
          days_requested: days,
          reason: reason || undefined,
        };
        await leavesService.create(data);
        toast.success('Solicitud creada');
      }
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Solicitud' : 'Nueva Solicitud de Ausencia'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Empleado */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Empleado *
            </label>
            <Select
              options={employeeOptions}
              value={employeeId}
              onChange={setEmployeeId}
              placeholder="Seleccionar empleado"
              searchable
              disabled={isEdit}
            />
          </div>

          {/* Tipo de Ausencia */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Tipo de Ausencia *
            </label>
            <Select
              options={LEAVE_TYPE_OPTIONS}
              value={leaveType}
              onChange={setLeaveType}
              placeholder="Seleccionar tipo"
              searchable
            />
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Fecha Inicio *
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Fecha Fin *
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Dias Solicitados */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Dias Solicitados *
            </label>
            <Input
              type="number"
              min={1}
              value={daysRequested}
              onChange={(e) => setDaysRequested(e.target.value)}
              placeholder="Numero de dias habiles"
              required
            />
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
              Dias habiles (Lun-Sab, excluyendo domingos y festivos)
            </p>
          </div>

          {/* Razon */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Razon (opcional)
            </label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Motivo de la solicitud"
              rows={3}
            />
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : isEdit ? 'Actualizar' : 'Registrar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
