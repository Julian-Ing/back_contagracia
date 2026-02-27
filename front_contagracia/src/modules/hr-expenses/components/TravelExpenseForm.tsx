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
import { hrExpensesService } from '../services/hr-expenses.service';
import { EXPENSE_CATEGORY_OPTIONS } from '../types';
import type { TravelExpense, TravelExpenseCategory, CreateTravelExpenseDto, EditTravelExpenseDto } from '../types';

interface Employee {
  id: string;
  name: string;
}

interface CostCenter {
  id: string;
  name: string;
}

interface TravelExpenseFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: TravelExpense | null;
  employees: Employee[];
  costCenters?: CostCenter[];
}

export function TravelExpenseForm({
  open,
  onClose,
  onSuccess,
  initialData,
  employees,
  costCenters = [],
}: TravelExpenseFormProps) {
  const isEdit = !!initialData;

  const [employeeId, setEmployeeId] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('');
  const [travelPurpose, setTravelPurpose] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [assignedAmount, setAssignedAmount] = useState('');
  const [costCenterId, setCostCenterId] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialData) {
      setEmployeeId(initialData.third_party_id);
      setExpenseCategory(initialData.expense_category);
      setTravelPurpose(initialData.travel_purpose);
      setDestination(initialData.destination);
      setStartDate(initialData.start_date?.split('T')[0] || '');
      setEndDate(initialData.end_date?.split('T')[0] || '');
      setAssignedAmount(String(initialData.assigned_amount));
      setCostCenterId('');
      setNotes(initialData.notes || '');
    } else {
      setEmployeeId('');
      setExpenseCategory('');
      setTravelPurpose('');
      setDestination('');
      setStartDate('');
      setEndDate('');
      setAssignedAmount('');
      setCostCenterId('');
      setNotes('');
    }
  }, [initialData, open]);

  const employeeOptions = employees.map((e) => ({ value: e.id, label: e.name }));
  const costCenterOptions = [
    { value: '', label: 'Sin centro de costo' },
    ...costCenters.map((cc) => ({ value: cc.id, label: cc.name })),
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!employeeId || !expenseCategory || !travelPurpose || !destination || !startDate || !endDate || !assignedAmount) {
      toast.error('Completa todos los campos obligatorios');
      return;
    }

    const amount = parseFloat(assignedAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('El monto asignado debe ser mayor a 0');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      toast.error('La fecha de inicio no puede ser posterior a la fecha fin');
      return;
    }

    setLoading(true);
    try {
      if (isEdit && initialData) {
        const data: EditTravelExpenseDto = {
          expense_category: expenseCategory as TravelExpenseCategory,
          travel_purpose: travelPurpose,
          destination,
          start_date: startDate,
          end_date: endDate,
          assigned_amount: amount,
          cost_center_id: costCenterId || undefined,
          notes: notes || undefined,
        };
        await hrExpensesService.update(initialData.id, data);
        toast.success('Viatico actualizado');
      } else {
        const data: CreateTravelExpenseDto = {
          third_party_id: employeeId,
          expense_category: expenseCategory as TravelExpenseCategory,
          travel_purpose: travelPurpose,
          destination,
          start_date: startDate,
          end_date: endDate,
          assigned_amount: amount,
          cost_center_id: costCenterId || undefined,
          notes: notes || undefined,
        };
        await hrExpensesService.create(data);
        toast.success('Viatico creado');
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
          <DialogTitle>{isEdit ? 'Editar Viatico' : 'Nuevo Gasto de Viatico'}</DialogTitle>
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

          {/* Categoria */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Categoria *
            </label>
            <Select
              options={EXPENSE_CATEGORY_OPTIONS}
              value={expenseCategory}
              onChange={setExpenseCategory}
              placeholder="Seleccionar categoria"
              searchable
            />
          </div>

          {/* Motivo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Motivo del Viaje *
            </label>
            <Input
              value={travelPurpose}
              onChange={(e) => setTravelPurpose(e.target.value)}
              placeholder="Descripcion del motivo"
              required
            />
          </div>

          {/* Destino */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Destino *
            </label>
            <Input
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Ciudad o lugar de destino"
              required
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

          {/* Monto Asignado */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Monto Asignado (Anticipo) *
            </label>
            <Input
              type="number"
              min={1}
              step="0.01"
              value={assignedAmount}
              onChange={(e) => setAssignedAmount(e.target.value)}
              placeholder="Monto en COP"
              required
            />
          </div>

          {/* Centro de Costo */}
          {costCenters.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Centro de Costo (opcional)
              </label>
              <Select
                options={costCenterOptions}
                value={costCenterId}
                onChange={setCostCenterId}
                placeholder="Seleccionar centro de costo"
                searchable
              />
            </div>
          )}

          {/* Notas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Notas (opcional)
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas adicionales"
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
