'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Badge } from '@/shared/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { FormattedNumber } from '@/shared/components/ui/formatted-number';
import { DatePicker } from '@/shared/components/ui/date-picker';
import { TimePicker } from '@/shared/components/ui/time-picker';
import { SearchableSelect } from '@/shared/components/ui/searchable-select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { Clock, Plus, List, Loader2, MoreHorizontal, CheckCircle, XCircle, Trash2, Split } from 'lucide-react';
import { timeAttendanceService } from '../../../services/time-attendance.service';
import {
  OVERTIME_TYPE_LABELS,
  OVERTIME_TYPE_SHORT,
  OVERTIME_STATUS_LABELS,
  OVERTIME_STATUS_COLORS,
} from '../../../types/time-attendance';
import type {
  OvertimeType,
  OvertimeRecord,
  OvertimeStatus,
  Holiday,
  CreateOvertimeDto,
} from '../../../types/time-attendance';
import type { PayrollSettlement, PayrollSettlementDetailSummary } from '../../../types';
import toast from 'react-hot-toast';

interface OvertimeModalProps {
  open: boolean;
  onClose: () => void;
  settlement: PayrollSettlement;
  employees: PayrollSettlementDetailSummary[];
  initialEmployeeId?: string | null;
}

const OVERTIME_TYPES: OvertimeType[] = ['HED', 'HEN', 'HEDDF', 'HENDF', 'HRN', 'HRDDF', 'HRNDF'];

// Limites jornada colombiana
const NIGHT_START = 21 * 60; // 21:00 en minutos
const DAY_START = 6 * 60;    // 06:00 en minutos

interface OvertimeSplit {
  start_time: string;
  end_time: string;
  hours: number;
  overtimeType: OvertimeType;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes: number): string {
  const normalized = ((minutes % (24 * 60)) + (24 * 60)) % (24 * 60);
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Divide las horas extras en segmentos diurno/nocturno segun los limites de jornada colombiana.
 * 06:00-21:00 = diurna, 21:00-06:00 = nocturna.
 * Si la fecha es domingo o festivo, usa tipos dom/fest.
 */
function splitOvertimeByShift(
  startTime: string,
  endTime: string,
  date: string,
  holidays: Holiday[],
): OvertimeSplit[] {
  if (!startTime || !endTime || !date) return [];

  const isHoliday = holidays.some((h) => h.date === date);
  const dayOfWeek = new Date(date + 'T12:00:00').getDay();
  const isSundayOrHoliday = dayOfWeek === 0 || isHoliday;

  let startMin = timeToMinutes(startTime);
  let endMin = timeToMinutes(endTime);
  if (endMin <= startMin) endMin += 24 * 60; // cruza medianoche

  // Recopilar todos los limites relevantes en el rango
  const boundaries: number[] = [];
  for (let offset = 0; offset <= 24 * 60; offset += 24 * 60) {
    const ds = DAY_START + offset;   // 06:00, 30:00
    const ns = NIGHT_START + offset; // 21:00, 45:00
    if (ds > startMin && ds < endMin) boundaries.push(ds);
    if (ns > startMin && ns < endMin) boundaries.push(ns);
  }
  boundaries.sort((a, b) => a - b);

  const points = [startMin, ...boundaries, endMin];
  const splits: OvertimeSplit[] = [];

  for (let i = 0; i < points.length - 1; i++) {
    const segStart = points[i];
    const segEnd = points[i + 1];
    const hours = Math.round(((segEnd - segStart) / 60) * 100) / 100;
    if (hours <= 0) continue;

    // Determinar si el segmento es nocturno
    const normalizedStart = segStart % (24 * 60);
    const isNocturnal = normalizedStart >= NIGHT_START || normalizedStart < DAY_START;

    let overtimeType: OvertimeType;
    if (isSundayOrHoliday) {
      overtimeType = isNocturnal ? 'HENDF' : 'HEDDF';
    } else {
      overtimeType = isNocturnal ? 'HEN' : 'HED';
    }

    splits.push({
      start_time: minutesToTime(segStart),
      end_time: minutesToTime(segEnd),
      hours,
      overtimeType,
    });
  }

  return splits;
}

export function OvertimeModal({ open, onClose, settlement, employees, initialEmployeeId }: OvertimeModalProps) {
  const [tab, setTab] = useState('register');

  // Register form state
  const [employeeId, setEmployeeId] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Splits auto-calculados
  const [splits, setSplits] = useState<OvertimeSplit[]>([]);

  // Existing records state
  const [records, setRecords] = useState<OvertimeRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);

  // Holidays
  const [holidays, setHolidays] = useState<Holiday[]>([]);

  // Pre-select employee when opening from an employee card
  useEffect(() => {
    if (open && initialEmployeeId) {
      setEmployeeId(initialEmployeeId);
    }
  }, [open, initialEmployeeId]);

  // Load holidays
  useEffect(() => {
    if (!open) return;
    timeAttendanceService.getHolidays(settlement.year).then(setHolidays).catch(() => {});
  }, [open, settlement.year]);

  // Load existing records
  const loadRecords = useCallback(() => {
    setLoadingRecords(true);
    timeAttendanceService
      .getOvertime({
        date_from: settlement.start_date,
        date_to: settlement.end_date,
        limit: 100,
      })
      .then((res) => setRecords(res.data))
      .catch(() => toast.error('Error al cargar horas extras'))
      .finally(() => setLoadingRecords(false));
  }, [settlement.start_date, settlement.end_date]);

  useEffect(() => {
    if (open) loadRecords();
  }, [open, loadRecords]);

  // Auto-calcular splits cuando cambian hora/fecha
  useEffect(() => {
    const newSplits = splitOvertimeByShift(startTime, endTime, date, holidays);
    setSplits(newSplits);
  }, [startTime, endTime, date, holidays]);

  const totalHours = useMemo(() => splits.reduce((sum, s) => sum + s.hours, 0), [splits]);

  const updateSplitType = (index: number, newType: OvertimeType) => {
    setSplits((prev) => prev.map((s, i) => (i === index ? { ...s, overtimeType: newType } : s)));
  };

  const resetForm = () => {
    setEmployeeId('');
    setDate('');
    setStartTime('');
    setEndTime('');
    setSplits([]);
    setReason('');
  };

  const handleSubmit = async () => {
    if (!employeeId || !date || splits.length === 0 || !reason) {
      toast.error('Completa todos los campos obligatorios');
      return;
    }
    if (reason.length < 5) {
      toast.error('La razon debe tener al menos 5 caracteres');
      return;
    }
    setSubmitting(true);
    try {
      // Crear un registro por cada segmento
      for (const split of splits) {
        const dto: CreateOvertimeDto = {
          third_party_id: employeeId,
          overtime_date: date,
          start_time: split.start_time,
          end_time: split.end_time,
          overtime_type: split.overtimeType,
          reason,
          auto_approve: true,
        };
        await timeAttendanceService.createOvertime(dto);
      }
      toast.success(
        splits.length > 1
          ? `${splits.length} horas extras registradas y aprobadas`
          : 'Hora extra registrada y aprobada',
      );
      resetForm();
      loadRecords();
      setTab('existing');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al registrar hora extra');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await timeAttendanceService.approveOvertime(id);
      toast.success('Hora extra aprobada');
      loadRecords();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al aprobar');
    }
  };

  const handleReject = async (id: string) => {
    const rejectReason = prompt('Razon del rechazo:');
    if (!rejectReason) return;
    try {
      await timeAttendanceService.rejectOvertime(id, rejectReason);
      toast.success('Hora extra rechazada');
      loadRecords();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al rechazar');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await timeAttendanceService.deleteOvertime(id);
      toast.success('Hora extra eliminada');
      loadRecords();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al eliminar');
    }
  };

  // Filter records to show only those belonging to settlement employees
  const employeeIds = useMemo(() => new Set(employees.map((e) => e.third_party_id)), [employees]);
  const filteredRecords = useMemo(
    () => records.filter((r) => employeeIds.has(r.third_party_id)),
    [records, employeeIds],
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-indigo-500" />
            Horas Extras - {settlement.settlement_name}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full">
            <TabsTrigger value="register" className="flex-1 gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Registrar
            </TabsTrigger>
            <TabsTrigger value="existing" className="flex-1 gap-1.5">
              <List className="h-3.5 w-3.5" />
              Existentes ({filteredRecords.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="register" className="space-y-4 mt-4">
            {/* Employee select */}
            <div>
              <Label>Empleado *</Label>
              <SearchableSelect
                value={employeeId}
                onChange={(v) => setEmployeeId(v ?? '')}
                emptyMessage="No se encontraron empleados"
                options={employees.map((emp) => ({
                  value: emp.third_party_id,
                  label: `${emp.employee_name} - ${emp.employee_document ?? ''}`,
                }))}
              />
            </div>

            {/* Date */}
            <div>
              <Label>Fecha *</Label>
              <DatePicker
                value={date}
                onChange={(v) => setDate(v ?? '')}
                minDate={settlement.start_date?.split('T')[0]}
                maxDate={settlement.end_date?.split('T')[0]}
                usePortal
              />
            </div>

            {/* Time range */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Hora Inicio *</Label>
                <TimePicker
                  value={startTime}
                  onChange={setStartTime}
                  placeholder="Hora inicio"
                  clearable={false}
                  usePortal
                />
              </div>
              <div>
                <Label>Hora Fin *</Label>
                <TimePicker
                  value={endTime}
                  onChange={setEndTime}
                  placeholder="Hora fin"
                  clearable={false}
                  usePortal
                />
              </div>
            </div>

            {/* Split preview */}
            {splits.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">
                    {splits.length > 1 ? (
                      <span className="flex items-center gap-1.5">
                        <Split className="h-3.5 w-3.5 text-amber-500" />
                        Division automatica ({splits.length} registros - {totalHours}h total)
                      </span>
                    ) : (
                      <span>Tipo detectado ({totalHours}h total)</span>
                    )}
                  </Label>
                </div>
                <div className="border rounded-lg divide-y">
                  {splits.map((split, idx) => (
                    <div key={idx} className="flex items-center gap-3 px-3 py-2">
                      <span className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                        {split.start_time} - {split.end_time}
                      </span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {split.hours}h
                      </span>
                      <div className="flex-1 min-w-0">
                        <SearchableSelect
                          value={split.overtimeType}
                          onChange={(v) => updateSplitType(idx, (v ?? 'HED') as OvertimeType)}
                          emptyMessage="No se encontraron tipos"
                          options={OVERTIME_TYPES.map((type) => ({
                            value: type,
                            label: OVERTIME_TYPE_LABELS[type],
                          }))}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reason */}
            <div>
              <Label>Razon *</Label>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Justificacion de la hora extra (min 5 caracteres)"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={resetForm}>Limpiar</Button>
              <Button onClick={handleSubmit} disabled={submitting || splits.length === 0}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    Registrando...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-1" />
                    Registrar{splits.length > 1 ? ` (${splits.length})` : ''}
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="existing" className="mt-4">
            {loadingRecords ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p>No hay horas extras registradas para este periodo.</p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empleado</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-center">Horas</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="text-sm font-medium">
                          {record.third_party?.name ?? record.third_party_id.slice(0, 8)}
                        </TableCell>
                        <TableCell className="text-sm">{record.overtime_date}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {OVERTIME_TYPE_SHORT[record.overtime_type as OvertimeType] ?? record.overtime_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center text-sm">{record.total_hours}</TableCell>
                        <TableCell className="text-right">
                          <FormattedNumber value={record.calculated_amount ?? 0} type="currency" className="text-sm" />
                        </TableCell>
                        <TableCell>
                          <Badge className={`text-xs ${OVERTIME_STATUS_COLORS[record.status as OvertimeStatus]}`}>
                            {OVERTIME_STATUS_LABELS[record.status as OvertimeStatus] ?? record.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {record.status === 'REQUESTED' && (
                                <>
                                  <DropdownMenuItem onClick={() => handleApprove(record.id)}>
                                    <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                                    Aprobar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleReject(record.id)}>
                                    <XCircle className="h-4 w-4 mr-2 text-red-600" />
                                    Rechazar
                                  </DropdownMenuItem>
                                </>
                              )}
                              {(record.status === 'REQUESTED' || record.status === 'REJECTED') && (
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onClick={() => handleDelete(record.id)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Eliminar
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
