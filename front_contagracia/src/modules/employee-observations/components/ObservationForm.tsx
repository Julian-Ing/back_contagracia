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
import { DatePicker } from '@/shared/components/ui/date-picker';
import { Textarea } from '@/shared/components/ui/textarea';
import { Select } from '@/shared/components/ui/select';
import toast from 'react-hot-toast';
import { observationsService } from '../services/observations.service';
import type { Observation, CreateObservationDto, UpdateObservationDto } from '../types';

interface Employee {
  id: string;
  name: string;
}

interface ObservationFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Observation | null;
  employees: Employee[];
}

export function ObservationForm({
  open,
  onClose,
  onSuccess,
  initialData,
  employees,
}: ObservationFormProps) {
  const isEdit = !!initialData;

  const [employeeId, setEmployeeId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [observationDate, setObservationDate] = useState('');
  const [observationType, setObservationType] = useState('');
  const [severity, setSeverity] = useState('MEDIUM');
  const [actionRequired, setActionRequired] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialData) {
      setEmployeeId(initialData.third_party_id);
      setTitle(initialData.title);
      setDescription(initialData.description);
      setObservationDate(initialData.observation_date?.split('T')[0] || '');
      setObservationType(initialData.observation_type);
      setSeverity(initialData.severity);
      setActionRequired(initialData.action_required || '');
      setFollowUpDate(initialData.follow_up_date?.split('T')[0] || '');
      setStatus(initialData.status);
    } else {
      setEmployeeId('');
      setTitle('');
      setDescription('');
      setObservationDate(new Date().toISOString().split('T')[0]);
      setObservationType('');
      setSeverity('MEDIUM');
      setActionRequired('');
      setFollowUpDate('');
      setStatus('');
    }
  }, [initialData, open]);

  const employeeOptions = employees.map((e) => ({ value: e.id, label: e.name }));

  const typeOptions = [
    { value: 'RECOGNITION', label: 'Reconocimiento' },
    { value: 'FEEDBACK', label: 'Retroalimentación' },
    { value: 'INCIDENT', label: 'Incidente' },
    { value: 'WARNING', label: 'Amonestación' },
    { value: 'ACHIEVEMENT', label: 'Logro' },
    { value: 'CONCERN', label: 'Preocupación' },
  ];

  const severityOptions = [
    { value: 'LOW', label: 'Baja' },
    { value: 'MEDIUM', label: 'Media' },
    { value: 'HIGH', label: 'Alta' },
  ];

  const statusOptions = [
    { value: 'ACTIVE', label: 'Activa' },
    { value: 'RESOLVED', label: 'Resuelta' },
    { value: 'ARCHIVED', label: 'Archivada' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!employeeId || !title || !description || !observationDate || !observationType) {
      toast.error('Completa todos los campos obligatorios');
      return;
    }

    setLoading(true);
    try {
      if (isEdit && initialData) {
        const data: UpdateObservationDto = {
          title,
          description,
          observation_date: observationDate,
          observation_type: observationType as any,
          severity: severity as any,
          action_required: actionRequired || undefined,
          follow_up_date: followUpDate || undefined,
          status: status as any,
        };
        await observationsService.update(initialData.id, data);
        toast.success('Observación actualizada');
      } else {
        const data: CreateObservationDto = {
          third_party_id: employeeId,
          title,
          description,
          observation_date: observationDate,
          observation_type: observationType as any,
          severity: severity as any,
          action_required: actionRequired || undefined,
          follow_up_date: followUpDate || undefined,
        };
        await observationsService.create(data);
        toast.success('Observación creada');
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
          <DialogTitle>{isEdit ? 'Editar Observación' : 'Nueva Observación'}</DialogTitle>
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

          {/* Título */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Título *
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título de la observación"
              required
            />
          </div>

          {/* Tipo y Severidad */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Tipo *
              </label>
              <Select
                options={typeOptions}
                value={observationType}
                onChange={setObservationType}
                placeholder="Seleccionar tipo"
                searchable
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Severidad
              </label>
              <Select
                options={severityOptions}
                value={severity}
                onChange={setSeverity}
                placeholder="Seleccionar severidad"
              />
            </div>
          </div>

          {/* Fecha */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Fecha de Observación *
            </label>
            <DatePicker
              value={observationDate}
              onChange={setObservationDate}
              usePortal
            />
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Descripción *
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describa la observación en detalle..."
              rows={3}
              required
            />
          </div>

          {/* Acción requerida */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Acción Requerida (opcional)
            </label>
            <Textarea
              value={actionRequired}
              onChange={(e) => setActionRequired(e.target.value)}
              placeholder="Acciones a tomar..."
              rows={2}
            />
          </div>

          {/* Fecha de seguimiento */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Fecha de Seguimiento
              </label>
              <DatePicker
                value={followUpDate}
                onChange={setFollowUpDate}
                usePortal
                clearable
              />
            </div>
            {isEdit && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Estado
                </label>
                <Select
                  options={statusOptions}
                  value={status}
                  onChange={setStatus}
                  placeholder="Estado"
                />
              </div>
            )}
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
