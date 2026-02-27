'use client';

import { Calendar } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { Select } from '@/shared/components/ui/select';
import { Label } from '@/shared/components/ui/label';
import { usePortalLeaves } from '../../hooks/useEmployeePortal';
import {
  LEAVE_TYPE_LABELS,
  LEAVE_STATUS_LABELS,
  LEAVE_STATUS_COLORS,
  LEAVE_TYPE_COLORS,
} from '@/modules/leaves/types';

const STATUS_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'PENDING', label: 'Pendiente' },
  { value: 'APPROVED', label: 'Aprobada' },
  { value: 'REJECTED', label: 'Rechazada' },
  { value: 'CANCELLED', label: 'Cancelada' },
];

const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => {
  const y = new Date().getFullYear() - i;
  return { value: String(y), label: String(y) };
});

export function PortalLeavesTab() {
  const { data, total, loading, error, setStatusFilter, setYearFilter } = usePortalLeaves();

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="w-40">
          <Label className="text-xs mb-1 block">Estado</Label>
          <Select
            options={STATUS_OPTIONS}
            placeholder="Todos"
            onChange={(v) => setStatusFilter(v || undefined)}
          />
        </div>
        <div className="w-32">
          <Label className="text-xs mb-1 block">Año</Label>
          <Select
            options={[{ value: '', label: 'Todos' }, ...YEAR_OPTIONS]}
            placeholder="Todos"
            onChange={(v) => setYearFilter(v ? Number(v) : undefined)}
          />
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 text-red-800 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
          Cargando ausencias...
        </div>
      ) : data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
          <Calendar className="h-10 w-10 opacity-30" />
          <p className="text-sm">No tienes solicitudes de ausencia registradas</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Desde</TableHead>
                <TableHead>Hasta</TableHead>
                <TableHead className="text-center">Días</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Motivo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((leave) => (
                <TableRow key={leave.id}>
                  <TableCell>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${LEAVE_TYPE_COLORS[leave.leave_type as keyof typeof LEAVE_TYPE_COLORS] ?? 'bg-gray-100 text-gray-700'}`}>
                      {LEAVE_TYPE_LABELS[leave.leave_type as keyof typeof LEAVE_TYPE_LABELS] ?? leave.leave_type}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">{new Date(leave.start_date + 'T12:00:00').toLocaleDateString('es-CO')}</TableCell>
                  <TableCell className="text-sm">{new Date(leave.end_date + 'T12:00:00').toLocaleDateString('es-CO')}</TableCell>
                  <TableCell className="text-center text-sm font-medium">{leave.days}</TableCell>
                  <TableCell>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${LEAVE_STATUS_COLORS[leave.status as keyof typeof LEAVE_STATUS_COLORS] ?? 'bg-gray-100 text-gray-700'}`}>
                      {LEAVE_STATUS_LABELS[leave.status as keyof typeof LEAVE_STATUS_LABELS] ?? leave.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{leave.reason ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {total > 0 && (
        <p className="text-xs text-muted-foreground text-right">{total} solicitud{total !== 1 ? 'es' : ''} en total</p>
      )}
    </div>
  );
}
