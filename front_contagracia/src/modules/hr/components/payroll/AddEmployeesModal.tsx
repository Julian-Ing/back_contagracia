'use client';

import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Search, Users, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { employeesService } from '../../services/employees.service';
import { payrollSettlementsService } from '../../services/payroll-settlements.service';
import { EmployeeListItem } from './create-settlement/EmployeeListItem';
import toast from 'react-hot-toast';

interface AddEmployeesModalProps {
  open: boolean;
  onClose: () => void;
  settlementId: string;
  existingEmployeeIds: string[];
  onSuccess: () => void;
}

export function AddEmployeesModal({ open, onClose, settlementId, existingEmployeeIds, onSuccess }: AddEmployeesModalProps) {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const loadEmployees = () => {
    setLoading(true);
    setError(null);
    employeesService.getAll({ status: 'ACTIVE' as any, limit: 200 })
      .then((res) => setEmployees(res.data))
      .catch((err) => {
        console.error('[AddEmployeesModal] Error cargando empleados:', err);
        setError(err?.response?.data?.message || err?.message || 'Error al cargar empleados');
        setEmployees([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!open) return;
    setSelectedIds(new Set());
    setSearch('');
    loadEmployees();
  }, [open]);

  const existingSet = useMemo(() => new Set(existingEmployeeIds), [existingEmployeeIds]);

  const filteredEmployees = useMemo(() => {
    const available = employees.filter((e) => !existingSet.has(e.id));
    if (!search.trim()) return available;
    const term = search.toLowerCase();
    return available.filter(
      (e) =>
        (e.name ?? '').toLowerCase().includes(term) ||
        (e.identification_number ?? '').includes(term),
    );
  }, [employees, existingSet, search]);

  const toggleEmployee = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === filteredEmployees.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredEmployees.map((e) => e.id)));
    }
  };

  const handleSubmit = async () => {
    if (selectedIds.size === 0) return;
    setSubmitting(true);
    try {
      const result = await payrollSettlementsService.addEmployees(settlementId, Array.from(selectedIds));
      toast.success(`${result.added} empleados agregados`);
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al agregar empleados');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Agregar Empleados
          </DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o documento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-red-400" />
            <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>
            <Button variant="outline" size="sm" onClick={loadEmployees} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Reintentar
            </Button>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p>{employees.length === 0 ? 'No hay empleados activos' : 'No se encontraron empleados'}</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 py-2 border-b">
              <Checkbox
                checked={selectedIds.size === filteredEmployees.length && filteredEmployees.length > 0}
                onCheckedChange={toggleAll}
              />
              <span className="text-sm text-muted-foreground">
                {selectedIds.size > 0 ? `${selectedIds.size} seleccionados` : 'Seleccionar todos'}
              </span>
            </div>
            <div className="max-h-[400px] overflow-y-auto space-y-1 p-1">
              {filteredEmployees.map((emp) => (
                <EmployeeListItem
                  key={emp.id}
                  employee={emp}
                  selected={selectedIds.has(emp.id)}
                  onToggle={toggleEmployee}
                />
              ))}
            </div>
          </>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={submitting || selectedIds.size === 0}>
            {submitting ? 'Agregando...' : `Agregar (${selectedIds.size})`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
