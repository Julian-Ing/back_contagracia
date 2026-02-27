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
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { Select } from '@/shared/components/ui/select';
import { SearchableSelect } from '@/shared/components/ui/searchable-select';
import { DatePicker } from '@/shared/components/ui/date-picker';
import toast from 'react-hot-toast';
import { attendanceService } from '../services/attendance.service';
import { OVERTIME_TYPE_LABELS } from '../types';
import type { OvertimeRecord, OvertimeType, CreateOvertimeDto, EditOvertimeDto } from '../types';

interface Employee {
  id: string;
  name: string;
}

interface CostCenter {
  id: string;
  name: string;
  consecutive: string;
}

interface OvertimeFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: OvertimeRecord | null;
  employees: Employee[];
  costCenters: CostCenter[];
  selfService?: boolean;
}

const OVERTIME_SURCHARGE: Record<string, number> = {
  HED: 25,
  HEN: 75,
  HEDDF: 100,
  HENDF: 150,
  HRN: 35,
  HRDDF: 75,
  HRNDF: 110,
};

const TYPE_OPTIONS = Object.entries(OVERTIME_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export function OvertimeForm({
  open,
  onClose,
  onSuccess,
  initialData,
  employees,
  costCenters,
  selfService = false,
}: OvertimeFormProps) {
  const isEdit = !!initialData;

  const [employeeId, setEmployeeId] = useState('');
  const [overtimeDate, setOvertimeDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [overtimeType, setOvertimeType] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [costCenterId, setCostCenterId] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialData) {
      setEmployeeId(initialData.third_party_id);
      setOvertimeDate(initialData.overtime_date?.split('T')[0] || '');
      setStartTime(initialData.start_time);
      setEndTime(initialData.end_time);
      setOvertimeType(initialData.overtime_type);
      setReason(initialData.reason);
      setNotes(initialData.notes || '');
      setCostCenterId(initialData.cost_center_id || '');
    } else {
      setEmployeeId('');
      setOvertimeDate('');
      setStartTime('');
      setEndTime('');
      setOvertimeType('');
      setReason('');
      setNotes('');
      setCostCenterId('');
    }
  }, [initialData, open]);

  const surcharge = overtimeType ? OVERTIME_SURCHARGE[overtimeType] : null;

  const employeeOptions = employees.map((e) => ({ value: e.id, label: e.name }));
  const costCenterOptions = [
    { value: '', label: 'Sin centro de costo' },
    ...costCenters.map((cc) => ({ value: cc.id, label: `${cc.consecutive} - ${cc.name}` })),
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if ((!selfService && !employeeId) || !overtimeDate || !startTime || !endTime || !overtimeType || !reason) {
      toast.error('Completa todos los campos obligatorios');
      return;
    }

    if (reason.length < 5) {
      toast.error('La justificacion debe tener al menos 5 caracteres');
      return;
    }

    setLoading(true);
    try {
      if (isEdit && initialData) {
        const data: EditOvertimeDto = {
          overtime_date: overtimeDate,
          start_time: startTime,
          end_time: endTime,
          overtime_type: overtimeType as OvertimeType,
          reason,
          notes: notes || undefined,
          cost_center_id: costCenterId || undefined,
        };
        await attendanceService.editOvertime(initialData.id, data);
        toast.success('Hora extra actualizada');
      } else {
        const data: CreateOvertimeDto = {
          overtime_date: overtimeDate,
          start_time: startTime,
          end_time: endTime,
          overtime_type: overtimeType as OvertimeType,
          reason,
          notes: notes || undefined,
          cost_center_id: costCenterId || undefined,
          ...(selfService ? {} : { third_party_id: employeeId }),
        };
        await attendanceService.createOvertime(data);
        toast.success(selfService ? 'Hora extra solicitada' : 'Hora extra registrada');
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
          <DialogTitle>{isEdit ? 'Editar Hora Extra' : selfService ? 'Solicitar Hora Extra' : 'Nueva Hora Extra'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Empleado (solo modo admin) */}
          {!selfService && (
            <div>
              <Label>Empleado *</Label>
              <SearchableSelect
                options={employeeOptions}
                value={employeeId}
                onChange={(v) => setEmployeeId(v ?? '')}
                emptyMessage="No se encontraron empleados"
                clearable={!isEdit}
              />
            </div>
          )}

          {/* Fecha */}
          <div>
            <Label>Fecha *</Label>
            <DatePicker
              value={overtimeDate}
              onChange={(v) => setOvertimeDate(v ?? '')}
              placeholder="Seleccionar fecha"
              usePortal
            />
          </div>

          {/* Horario */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Hora Inicio *</Label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>
            <div>
              <Label>Hora Fin *</Label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Tipo */}
          <div>
            <Label>Tipo de Hora Extra *</Label>
            <Select
              options={TYPE_OPTIONS}
              value={overtimeType}
              onChange={setOvertimeType}
              placeholder="Seleccionar tipo"
            />
            {surcharge !== null && (
              <p className="text-xs text-muted-foreground mt-1">
                Recargo: {surcharge}%
              </p>
            )}
          </div>

          {/* Justificacion */}
          <div>
            <Label>Justificacion *</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Motivo de la hora extra (minimo 5 caracteres)"
              rows={3}
            />
          </div>

          {/* Notas */}
          <div>
            <Label>Notas (opcional)</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas adicionales"
            />
          </div>

          {/* Centro de costo */}
          <div>
            <Label>Centro de Costo (opcional)</Label>
            <SearchableSelect
              options={costCenterOptions}
              value={costCenterId}
              onChange={(v) => setCostCenterId(v ?? '')}
              emptyMessage="No se encontraron centros de costo"
              clearable
            />
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : isEdit ? 'Actualizar' : selfService ? 'Solicitar' : 'Registrar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
