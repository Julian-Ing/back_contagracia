'use client';

import { useState } from 'react';
import {
  Timer,
  MoreHorizontal,
  Pencil,
  Trash2,
  Check,
  X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { FormattedNumber } from '@/shared/components/ui/formatted-number';
import { DatePicker } from '@/shared/components/ui/date-picker';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/shared/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { Select } from '@/shared/components/ui/select';
import { useOvertime } from '../hooks/useOvertime';
import {
  OVERTIME_TYPE_LABELS,
  OVERTIME_TYPE_COLORS,
  OVERTIME_STATUS_LABELS,
  OVERTIME_STATUS_COLORS,
} from '../types';
import type { OvertimeRecord, OvertimeStatus, OvertimeType } from '../types';

interface OvertimeListProps {
  canEdit: boolean;
  canDelete: boolean;
  canApprove: boolean;
  canReject: boolean;
  onEdit: (record: OvertimeRecord) => void;
  onDelete: (record: OvertimeRecord) => void;
  onApprove: (record: OvertimeRecord) => void;
  onReject: (record: OvertimeRecord) => void;
}

const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos los estados' },
  { value: 'REQUESTED', label: 'Solicitada' },
  { value: 'APPROVED', label: 'Aprobada' },
  { value: 'REJECTED', label: 'Rechazada' },
  { value: 'AUTO_APPROVED', label: 'Auto-Aprobada' },
];

const TYPE_OPTIONS = [
  { value: 'all', label: 'Todos los tipos' },
  { value: 'HED', label: 'HE Diurna (25%)' },
  { value: 'HEN', label: 'HE Nocturna (75%)' },
  { value: 'HEDDF', label: 'HE Diurna Dom/Fest (100%)' },
  { value: 'HENDF', label: 'HE Nocturna Dom/Fest (150%)' },
  { value: 'HRN', label: 'Recargo Nocturno (35%)' },
  { value: 'HRDDF', label: 'Recargo Dom Diurno (75%)' },
  { value: 'HRNDF', label: 'Recargo Dom Nocturno (110%)' },
];

export function OvertimeList({
  canEdit,
  canDelete,
  canApprove,
  canReject,
  onEdit,
  onDelete,
  onApprove,
  onReject,
}: OvertimeListProps) {
  const [dateFrom, setDateFromValue] = useState('');
  const [dateTo, setDateToValue] = useState('');
  const [statusValue, setStatusValue] = useState('all');
  const [typeValue, setTypeValue] = useState('all');

  const {
    records,
    total,
    page,
    totalPages,
    loading,
    error,
    setPage,
    setDateFrom,
    setDateTo,
    setStatusFilter,
    setTypeFilter,
  } = useOvertime({ limit: PAGE_SIZE });

  const handleDateFromChange = (val: string | null) => {
    setDateFromValue(val ?? '');
    setDateFrom(val || undefined);
  };

  const handleDateToChange = (val: string | null) => {
    setDateToValue(val ?? '');
    setDateTo(val || undefined);
  };

  const handleStatusChange = (value: string) => {
    setStatusValue(value);
    setStatusFilter(value === 'all' ? undefined : (value as OvertimeStatus));
  };

  const handleTypeChange = (value: string) => {
    setTypeValue(value);
    setTypeFilter(value === 'all' ? undefined : (value as OvertimeType));
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const [y, m, d] = dateStr.split('T')[0].split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading && records.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto" />
          <p className="text-muted-foreground">Cargando horas extras...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <CardContent className="p-4 text-red-600 dark:text-red-400">{error}</CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-3 text-base">
              <span>Registros de Horas Extras</span>
              <Badge variant="secondary">{total}</Badge>
            </CardTitle>
            <div className="flex gap-2 flex-wrap flex-1 md:max-w-2xl">
              <DatePicker
                value={dateFrom}
                onChange={handleDateFromChange}
                placeholder="Desde"
                clearable
                usePortal
              />
              <DatePicker
                value={dateTo}
                onChange={handleDateToChange}
                placeholder="Hasta"
                clearable
                usePortal
              />
              <Select
                options={TYPE_OPTIONS}
                value={typeValue}
                onChange={handleTypeChange}
                placeholder="Tipo"
                className="w-[200px]"
              />
              <Select
                options={STATUS_OPTIONS}
                value={statusValue}
                onChange={handleStatusChange}
                placeholder="Estado"
                className="w-[160px]"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Horario</TableHead>
                  <TableHead>Horas</TableHead>
                  <TableHead>Recargo</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="text-center py-12 text-muted-foreground"
                    >
                      No se encontraron registros de horas extras
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <div className="flex items-start gap-3">
                          <div className="h-9 w-9 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                            <Timer className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate">
                              {record.third_party?.name || '-'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {record.third_party?.identification_number || '-'}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(record.overtime_date)}
                      </TableCell>
                      <TableCell>
                        <Badge className={OVERTIME_TYPE_COLORS[record.overtime_type]}>
                          {record.payroll_code}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm font-mono">
                        {record.start_time} - {record.end_time}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {Number(record.total_hours).toFixed(1)}h
                      </TableCell>
                      <TableCell className="text-sm">
                        {Number(record.surcharge_pct)}%
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        <FormattedNumber value={record.calculated_amount ?? 0} type="currency" />
                      </TableCell>
                      <TableCell>
                        <Badge className={OVERTIME_STATUS_COLORS[record.status]}>
                          {OVERTIME_STATUS_LABELS[record.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {canEdit && record.status === 'REQUESTED' && (
                              <DropdownMenuItem onClick={() => onEdit(record)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                            )}
                            {canApprove && record.status === 'REQUESTED' && (
                              <DropdownMenuItem onClick={() => onApprove(record)}>
                                <Check className="h-4 w-4 mr-2" />
                                Aprobar
                              </DropdownMenuItem>
                            )}
                            {canReject && record.status === 'REQUESTED' && (
                              <DropdownMenuItem onClick={() => onReject(record)}>
                                <X className="h-4 w-4 mr-2" />
                                Rechazar
                              </DropdownMenuItem>
                            )}
                            {canDelete && record.status === 'REQUESTED' && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => onDelete(record)}
                                  className="text-red-600 focus:text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Eliminar
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Paginacion */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Pagina {page} de {totalPages} ({total} registros)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page - 1)}
              disabled={page === 1 || loading}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={page === totalPages || loading}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
