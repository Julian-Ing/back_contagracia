'use client';

import { useState, useEffect } from 'react';
import {
  Clock,
  MoreHorizontal,
  Pencil,
  LogIn,
  LogOut,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
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
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { useAttendance } from '../hooks/useAttendance';
import type { AttendanceRecord } from '../types';

interface AttendanceListProps {
  canEdit: boolean;
  canCheckin: boolean;
  canCheckout: boolean;
  onCheckin: () => void;
  onCheckout: () => void;
  onEdit?: (record: AttendanceRecord) => void;
}

const PAGE_SIZE = 20;

function LiveTimer({ checkIn }: { checkIn: string }) {
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    const update = () => {
      const diff = Date.now() - new Date(checkIn).getTime();
      if (diff < 0) { setElapsed('0:00:00'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setElapsed(`${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [checkIn]);

  return (
    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-mono animate-pulse">
      <Clock className="h-3 w-3" />
      {elapsed}
    </span>
  );
}

export function AttendanceList({
  canEdit,
  canCheckin,
  canCheckout,
  onCheckin,
  onCheckout,
  onEdit,
}: AttendanceListProps) {
  const [dateFrom, setDateFromValue] = useState('');
  const [dateTo, setDateToValue] = useState('');

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
    refetch,
  } = useAttendance({ limit: PAGE_SIZE });

  const handleDateFromChange = (val: string | null) => {
    setDateFromValue(val ?? '');
    setDateFrom(val || undefined);
  };

  const handleDateToChange = (val: string | null) => {
    setDateToValue(val ?? '');
    setDateTo(val || undefined);
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

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading && records.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto" />
          <p className="text-gray-500 dark:text-slate-400">Cargando asistencia...</p>
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

      {/* Botones de accion */}
      <div className="flex gap-2">
        {canCheckin && (
          <Button onClick={onCheckin} size="sm" variant="outline">
            <LogIn className="h-4 w-4 mr-2" />
            Marcar Entrada
          </Button>
        )}
        {canCheckout && (
          <Button onClick={onCheckout} size="sm" variant="outline">
            <LogOut className="h-4 w-4 mr-2" />
            Marcar Salida
          </Button>
        )}
      </div>

      {/* Tabla */}
      <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="text-gray-900 dark:text-white flex items-center gap-3 text-base">
              <span>Registros de Asistencia</span>
              <Badge variant="secondary">{total}</Badge>
            </CardTitle>
            <div className="flex gap-2 flex-1 md:max-w-xl">
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
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-200 dark:border-slate-700">
                  <TableHead className="text-gray-600 dark:text-slate-300">Empleado</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300">Fecha</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300">Entrada</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300">Salida</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300">Horas</TableHead>
                  {canEdit && (
                    <TableHead className="text-gray-600 dark:text-slate-300 text-right">Acciones</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={canEdit ? 6 : 5}
                      className="text-center py-12 text-gray-500 dark:text-slate-400"
                    >
                      No se encontraron registros de asistencia
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map((record) => (
                    <TableRow
                      key={record.id}
                      className="border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/40"
                    >
                      <TableCell>
                        <div className="flex items-start gap-3">
                          <div className="h-9 w-9 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                            <Clock className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 dark:text-white truncate">
                              {record.third_party?.name || '-'}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-slate-400">
                              {record.third_party?.identification_number || '-'}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-900 dark:text-white">
                        {formatDate(record.date)}
                      </TableCell>
                      <TableCell className="text-sm text-gray-900 dark:text-white font-mono">
                        {formatTime(record.check_in)}
                      </TableCell>
                      <TableCell className="text-sm text-gray-900 dark:text-white font-mono">
                        {formatTime(record.check_out)}
                      </TableCell>
                      <TableCell className="text-sm font-medium text-gray-900 dark:text-white">
                        {record.worked_hours != null
                          ? `${Number(record.worked_hours).toFixed(1)}h`
                          : record.check_in && !record.check_out
                            ? <LiveTimer checkIn={record.check_in} />
                            : '-'}
                      </TableCell>
                      {canEdit && (
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => onEdit?.(record)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      )}
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
          <p className="text-sm text-gray-500 dark:text-slate-400">
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
