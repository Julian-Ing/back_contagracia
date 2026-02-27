'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Search, Users, Loader2, UserCheck, AlertCircle, RefreshCw, Palmtree } from 'lucide-react';
import { employeesService } from '../../../services/employees.service';
import { EmployeeListItem } from './EmployeeListItem';
import type { SettlementType } from '../../../types';

interface EmployeeSelectionCardProps {
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  settlementType: SettlementType;
  startDate?: string;
  endDate?: string;
}

export function EmployeeSelectionCard({
  selectedIds,
  onSelectionChange,
  settlementType,
  startDate,
  endDate,
}: EmployeeSelectionCardProps) {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const loadEmployees = useCallback(() => {
    setLoading(true);
    setError(null);
    employeesService.getAll({ status: 'ACTIVE' as any, limit: 200 })
      .then((res) => {
        setEmployees(res.data);
      })
      .catch((err) => {
        console.error('[EmployeeSelectionCard] Error cargando empleados:', err);
        const msg = err?.response?.data?.message
          || err?.message
          || 'Error al cargar empleados';
        setError(msg);
        setEmployees([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  const isSingleSelect = settlementType === 'TERMINACION';

  // Filter employees based on settlement type and date range
  const typeFiltered = useMemo(() => {
    if (settlementType === 'TERMINACION') {
      // Only show employees with contract_end_date within range
      return employees.filter((emp) => {
        const endDateStr = emp.current_contract?.end_date
          || emp.current_contract?.termination_date;
        if (!endDateStr) return false;
        if (!startDate || !endDate) return true; // Show all with end date if no range yet
        return endDateStr >= startDate && endDateStr <= endDate;
      });
    }

    if (startDate && endDate && settlementType !== 'VACACIONES') {
      // Filter out employees hired after end of period
      return employees.filter((emp) => {
        const hireDate = emp.current_contract?.start_date;
        if (hireDate && hireDate > endDate) return false;
        // Filter out employees whose contract ended before period start
        const contractEnd = emp.current_contract?.end_date || emp.current_contract?.termination_date;
        if (contractEnd && contractEnd < startDate) return false;
        return true;
      });
    }

    return employees;
  }, [employees, settlementType, startDate, endDate]);

  // Then apply search filter
  const filtered = useMemo(() => {
    if (!search.trim()) return typeFiltered;
    const term = search.toLowerCase();
    return typeFiltered.filter(
      (e) =>
        (e.name ?? '').toLowerCase().includes(term) ||
        (e.identification_number ?? '').includes(term),
    );
  }, [typeFiltered, search]);

  const toggleEmployee = (id: string) => {
    if (isSingleSelect) {
      // Toggle single select: if already selected, deselect; otherwise select only this one
      if (selectedIds.has(id)) {
        onSelectionChange(new Set());
      } else {
        onSelectionChange(new Set([id]));
      }
      return;
    }

    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectionChange(next);
  };

  const toggleAll = () => {
    if (selectedIds.size === filtered.length && filtered.length > 0) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(filtered.map((e) => e.id)));
    }
  };

  const allSelected = filtered.length > 0 && selectedIds.size === filtered.length;

  // Description based on type
  const typeDescription = useMemo(() => {
    switch (settlementType) {
      case 'TERMINACION':
        return startDate && endDate
          ? 'Solo empleados con fecha de terminacion de contrato en el rango seleccionado. Seleccion individual.'
          : 'Selecciona las fechas del periodo para filtrar empleados con terminacion de contrato.';
      case 'VACACIONES':
        return 'Se muestran todos los empleados activos. Solo se liquidaran vacaciones a quienes tengan permisos aprobados.';
      default:
        return 'Selecciona los empleados a incluir. Puedes agregarlos despues tambien.';
    }
  }, [settlementType, startDate, endDate]);

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-indigo-500" />
              Seleccionar Empleados
            </CardTitle>
            <CardDescription>{typeDescription}</CardDescription>
          </div>
          {selectedIds.size > 0 && (
            <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 gap-1">
              <UserCheck className="h-3 w-3" />
              {selectedIds.size} seleccionado{selectedIds.size !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Toolbar */}
        <div className="flex items-center gap-3 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o documento..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          {!isSingleSelect && (
            <Button
              variant="outline"
              size="sm"
              onClick={toggleAll}
              disabled={loading || !!error || filtered.length === 0}
            >
              {allSelected ? 'Deseleccionar' : 'Seleccionar Todos'}
            </Button>
          )}
        </div>

        {/* Employee count */}
        {!loading && !error && typeFiltered.length > 0 && (
          <p className="text-xs text-muted-foreground mb-2">
            {filtered.length} empleado{filtered.length !== 1 ? 's' : ''}
            {search && ` encontrado${filtered.length !== 1 ? 's' : ''}`}
            {' de '}{typeFiltered.length} disponibles
          </p>
        )}

        {/* Vacation info */}
        {settlementType === 'VACACIONES' && !loading && !error && (
          <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
            <Palmtree className="h-3.5 w-3.5 text-green-600 shrink-0" />
            <p className="text-xs text-green-700 dark:text-green-300">
              Solo se liquidaran vacaciones a empleados con permisos aprobados.
            </p>
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <AlertCircle className="h-10 w-10 mx-auto mb-3 text-red-400" />
            <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>
            <Button variant="outline" size="sm" onClick={loadEmployees} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Reintentar
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>
              {typeFiltered.length === 0
                ? settlementType === 'TERMINACION'
                  ? 'No hay empleados con terminacion de contrato en el rango seleccionado'
                  : 'No hay empleados activos'
                : 'No se encontraron empleados'}
            </p>
          </div>
        ) : (
          <div className="max-h-[400px] overflow-y-auto space-y-1 border rounded-lg p-2">
            {filtered.map((emp) => {
              const contractEnd = emp.current_contract?.end_date
                || emp.current_contract?.termination_date;

              return (
                <div key={emp.id} className="relative">
                  <EmployeeListItem
                    employee={emp}
                    selected={selectedIds.has(emp.id)}
                    onToggle={toggleEmployee}
                  />
                  {settlementType === 'TERMINACION' && contractEnd && (
                    <Badge
                      variant="destructive"
                      className="absolute top-2 right-2 text-[10px] px-1.5 py-0.5"
                    >
                      Fin: {contractEnd}
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
