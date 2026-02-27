'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  MapPin,
  Building2,
  Plus,
  Pencil,
  Trash2,
  MoreHorizontal,
  CalendarClock,
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  AlertCircle,
  RotateCcw,
  Info,
  Upload,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Badge } from '@/shared/components/ui/badge';
import { Switch } from '@/shared/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Select } from '@/shared/components/ui/select';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/shared/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/shared/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/shared/components/ui/dropdown-menu';
import { DatePicker } from '@/shared/components/ui/date-picker';
import { cn } from '@/shared/lib/utils';

import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import {
  format,
  parse,
  startOfWeek,
  getDay,
  addDays,
  isToday as dateIsToday,
  isSameDay,
  startOfDay,
} from 'date-fns';
import { es } from 'date-fns/locale';

import {
  useCommonAreas,
  useCondominiums,
  useUnits,
  residentsService,
  delinquentService,
} from '@/modules/ph';
import type { PhCommonArea, PhReservation } from '@/modules/ph';
import { useAuthStore } from '@/modules/auth';
import { usePermissions } from '@/shared/hooks/usePermissions';
import ImportCommonAreasModal from '@/modules/ph/components/ImportCommonAreasModal';

// ─── Calendar setup ───

const locales = { es };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

const calendarMessages = {
  allDay: 'Todo el dia',
  previous: 'Anterior',
  next: 'Siguiente',
  today: 'Hoy',
  month: 'Mes',
  week: 'Semana',
  day: 'Dia',
  agenda: 'Agenda',
  date: 'Fecha',
  time: 'Hora',
  event: 'Evento',
  noEventsInRange: 'No hay eventos en este rango.',
  showMore: (total: number) => `+ ${total} mas`,
};

const eventStyleGetter = (event: any) => {
  const status = event.resource?.status;
  const resDate = event.resource?.reservation_date;
  const isPast = resDate && new Date(resDate) < startOfDay(new Date());

  let bgColor = '#8b5cf6';
  let borderColor = '#7c3aed';

  if (status === 'pending') {
    bgColor = isPast ? '#ef4444' : '#f59e0b';
    borderColor = isPast ? '#dc2626' : '#d97706';
  } else if (status === 'confirmed') {
    bgColor = '#8b5cf6';
    borderColor = '#7c3aed';
  } else if (status === 'completed') {
    bgColor = '#10b981';
    borderColor = '#059669';
  } else if (status === 'cancelled') {
    bgColor = '#6b7280';
    borderColor = '#4b5563';
  }

  return {
    style: {
      backgroundColor: bgColor,
      borderLeft: `4px solid ${borderColor}`,
      borderRadius: '6px',
      color: 'white',
      fontSize: '12px',
      padding: '2px 6px',
    },
  };
};

// ─── Helpers ───

function formatCOP(value?: number | null): string {
  if (value == null) return '-';
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
}

function formatTime(time?: string | null): string {
  if (!time) return '-';
  return time.slice(0, 5);
}

const STATUS_SEMAFORO: Record<string, { label: string; dot: string; badge: string }> = {
  pending: {
    label: 'Pendiente',
    dot: 'bg-yellow-500',
    badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  },
  confirmed: {
    label: 'Confirmada',
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
  cancelled: {
    label: 'Cancelada',
    dot: 'bg-red-500',
    badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  },
  completed: {
    label: 'Completada',
    dot: 'bg-blue-500',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  },
};

function getStatusBadge(status: string) {
  const config = STATUS_SEMAFORO[status];
  if (!config) return <Badge variant="secondary">{status}</Badge>;
  return (
    <Badge className={config.badge}>
      <span className={cn('inline-block w-2 h-2 rounded-full mr-1.5', config.dot)} />
      {config.label}
    </Badge>
  );
}

function getDateLabel(dateStr: string): string {
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const tomorrowStr = format(addDays(new Date(), 1), 'yyyy-MM-dd');
  if (dateStr === todayStr) return 'Hoy';
  if (dateStr === tomorrowStr) return 'Manana';
  const d = parse(dateStr, 'yyyy-MM-dd', new Date());
  return format(d, "d 'de' MMM", { locale: es });
}

function formatDateStr(dateStr: string): string {
  const d = parse(dateStr, 'yyyy-MM-dd', new Date());
  return format(d, 'd/M/yyyy');
}

function getResDateStr(r: PhReservation): string {
  if (typeof r.reservation_date === 'string') return r.reservation_date.split('T')[0];
  return '';
}

const PAGE_SIZE = 20;

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => ({
  value: String(i).padStart(2, '0'),
  label: String(i).padStart(2, '0'),
}));
const MINUTE_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i * 5).padStart(2, '0'),
  label: String(i * 5).padStart(2, '0'),
}));

const DAY_OPTIONS = [
  { value: 0, label: 'Dom' },
  { value: 1, label: 'Lun' },
  { value: 2, label: 'Mar' },
  { value: 3, label: 'Mie' },
  { value: 4, label: 'Jue' },
  { value: 5, label: 'Vie' },
  { value: 6, label: 'Sab' },
];

const emptyAreaForm = {
  condominium_id: '',
  name: '',
  description: '',
  capacity: '',
  rental_fee: '',
  requires_deposit: false,
  deposit_amount: '',
  requires_approval: false,
  available_from_hour: '08',
  available_from_minute: '00',
  available_to_hour: '22',
  available_to_minute: '00',
  min_hours: '1',
  max_hours: '8',
  available_days: [0, 1, 2, 3, 4, 5, 6] as number[],
};

const emptyReservationForm = {
  condominium_id: '',
  common_area_id: '',
  unit_id: '',
  reservation_date: '',
  start_hour: '',
  start_minute: '',
  end_hour: '',
  end_minute: '',
  notes: '',
};

// ─── Component ───

export default function CommonAreasPage() {
  const {
    areas,
    allReservations,
    loading,
    fetchAreas,
    createArea,
    updateArea,
    removeArea,
    fetchAllReservations,
    checkAvailability,
    createReservation,
    confirmReservation,
    cancelReservation,
    completeReservation,
    reactivateReservation,
  } = useCommonAreas();
  const { condominiums } = useCondominiums();
  const { units } = useUnits();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'areas');

  // ─── Filter state ───
  const [filterCondominium, setFilterCondominium] = useState('');

  // ─── Areas state ───
  const [isCreateAreaOpen, setIsCreateAreaOpen] = useState(false);
  const [isEditAreaOpen, setIsEditAreaOpen] = useState(false);
  const [isDeleteAreaOpen, setIsDeleteAreaOpen] = useState(false);
  const [selectedArea, setSelectedArea] = useState<PhCommonArea | null>(null);
  const [areaForm, setAreaForm] = useState(emptyAreaForm);
  const [areasPage, setAreasPage] = useState(1);

  // ─── Reservations state ───
  const [isCreateReservationOpen, setIsCreateReservationOpen] = useState(false);
  const [isCancelReservationOpen, setIsCancelReservationOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<PhReservation | null>(null);
  const [reservationForm, setReservationForm] = useState(emptyReservationForm);
  const [cancelReason, setCancelReason] = useState('');
  const [availabilityResult, setAvailabilityResult] = useState<{ available: boolean; message?: string } | null>(null);
  const [reservationsPage, setReservationsPage] = useState(1);

  // ─── Calendar state ───
  const [calendarView, setCalendarView] = useState<'month' | 'week' | 'day' | 'agenda'>('month');
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [calendarSidebarTab, setCalendarSidebarTab] = useState<'pending' | 'confirmed' | 'history'>('pending');

  const companyId = useAuthStore((s) => s.company?.id);
  const { can } = usePermissions();
  const canManageAreas = can('ph.common_areas.create');
  const canManageReservations = can('ph.reservations.confirm');

  const [importOpen, setImportOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ─── Unidades del residente logueado ───
  const [myUnits, setMyUnits] = useState<any[]>([]);

  useEffect(() => {
    if (!companyId || canManageAreas) return; // Solo para residentes
    residentsService.getMyUnits(companyId)
      .then((data) => setMyUnits(Array.isArray(data) ? data : []))
      .catch(() => setMyUnits([]));
  }, [companyId, canManageAreas]);

  const myUnitIds = useMemo(
    () => new Set(myUnits.map((r: any) => r.unit_id)),
    [myUnits],
  );
  const myCondominiumIds = useMemo(
    () => new Set(myUnits.map((r: any) => r.unit?.condominium_id).filter(Boolean)),
    [myUnits],
  );

  // ─── Delinquent units (morosos) ───
  const [delinquentUnitIds, setDelinquentUnitIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!companyId) return;
    delinquentService.getDelinquentUnits(companyId)
      .then((res) => setDelinquentUnitIds(new Set(res.unit_ids)))
      .catch(() => setDelinquentUnitIds(new Set()));
  }, [companyId]);

  const isUnitDelinquent = reservationForm.unit_id ? delinquentUnitIds.has(reservationForm.unit_id) : false;

  // ─── Reload allReservations when condo filter changes ───
  useEffect(() => {
    fetchAllReservations(filterCondominium ? { condominium_id: filterCondominium } : undefined);
  }, [fetchAllReservations, filterCondominium]);

  // ─── Computed: filtered areas by condominium ───
  const filteredAreas = useMemo(() => {
    let result = areas;
    // Residente: solo zonas de sus copropiedades
    if (!canManageAreas && myCondominiumIds.size > 0) {
      result = result.filter((a) => myCondominiumIds.has(a.condominium_id));
    }
    if (filterCondominium) {
      result = result.filter((a) => a.condominium_id === filterCondominium);
    }
    return result;
  }, [areas, filterCondominium, canManageAreas, myCondominiumIds]);

  // ─── Filtered areas/units for reservation form ───
  const formFilteredAreas = useMemo(() => {
    let result = areas;
    // Residente: solo zonas de sus copropiedades
    if (!canManageAreas && myCondominiumIds.size > 0) {
      result = result.filter((a) => myCondominiumIds.has(a.condominium_id));
    }
    if (reservationForm.condominium_id) {
      result = result.filter((a) => a.condominium_id === reservationForm.condominium_id);
    }
    return result;
  }, [areas, reservationForm.condominium_id, canManageAreas, myCondominiumIds]);

  const formFilteredUnits = useMemo(() => {
    // Residente: solo sus unidades
    if (!canManageAreas && myUnits.length > 0) {
      const resUnits = myUnits
        .filter((r: any) => r.unit)
        .map((r: any) => r.unit);
      if (reservationForm.condominium_id) {
        return resUnits.filter((u: any) => u.condominium_id === reservationForm.condominium_id);
      }
      return resUnits;
    }
    if (!reservationForm.condominium_id) return units;
    return units.filter((u) => u.condominium_id === reservationForm.condominium_id);
  }, [units, reservationForm.condominium_id, canManageAreas, myUnits]);

  // ─── Stats (usa filteredReservations para que residente vea solo las suyas) ───
  const stats = useMemo(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const weekLaterStr = format(addDays(new Date(), 7), 'yyyy-MM-dd');
    const source = !canManageReservations && myUnitIds.size > 0
      ? allReservations.filter((r) => r.unit_id && myUnitIds.has(r.unit_id))
      : allReservations;

    let total = 0, today = 0, thisWeek = 0, pending = 0, confirmed = 0;

    for (const r of source) {
      total++;
      const dateStr = getResDateStr(r);
      if (dateStr === todayStr) today++;
      if (dateStr >= todayStr && dateStr <= weekLaterStr) thisWeek++;
      if (r.status === 'pending') pending++;
      if (r.status === 'confirmed') confirmed++;
    }

    return { total, today, thisWeek, pending, confirmed };
  }, [allReservations, canManageReservations, myUnitIds]);

  // ─── Calendar events ───
  const calendarEvents = useMemo(() => {
    return allReservations
      .filter((r) => r.status !== 'cancelled')
      .map((r) => {
        const areaName = r.common_area?.name || 'Zona';
        const unitName = r.unit?.unit_number || '';
        const dateStr = getResDateStr(r);

        return {
          id: r.id,
          title: `${areaName}${unitName ? ` - Und. ${unitName}` : ''}`,
          start: new Date(`${dateStr}T${r.start_time}`),
          end: new Date(`${dateStr}T${r.end_time}`),
          resource: r,
        };
      });
  }, [allReservations]);

  // ─── Sidebar lists for calendar (string date comparison to avoid timezone bugs) ───
  // Residente: sidebar solo muestra SUS reservas; calendario muestra todas (para ver disponibilidad)
  const sidebarReservations = useMemo(() => {
    if (!canManageReservations && myUnitIds.size > 0) {
      return allReservations.filter((r) => r.unit_id && myUnitIds.has(r.unit_id));
    }
    return allReservations;
  }, [allReservations, canManageReservations, myUnitIds]);

  const upcomingPending = useMemo(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const weekLaterStr = format(addDays(new Date(), 7), 'yyyy-MM-dd');
    return sidebarReservations
      .filter((r) => {
        const d = getResDateStr(r);
        return r.status === 'pending' && d >= todayStr && d <= weekLaterStr;
      })
      .sort((a, b) => getResDateStr(a).localeCompare(getResDateStr(b)));
  }, [sidebarReservations]);

  const upcomingConfirmed = useMemo(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const weekLaterStr = format(addDays(new Date(), 7), 'yyyy-MM-dd');
    return sidebarReservations
      .filter((r) => {
        const d = getResDateStr(r);
        return r.status === 'confirmed' && d >= todayStr && d <= weekLaterStr;
      })
      .sort((a, b) => getResDateStr(a).localeCompare(getResDateStr(b)));
  }, [sidebarReservations]);

  const recentHistory = useMemo(() => {
    const weekAgoStr = format(addDays(new Date(), -7), 'yyyy-MM-dd');
    return sidebarReservations
      .filter((r) => {
        const d = getResDateStr(r);
        return (r.status === 'completed' || r.status === 'cancelled') && d >= weekAgoStr;
      })
      .sort((a, b) => getResDateStr(b).localeCompare(getResDateStr(a)));
  }, [sidebarReservations]);

  // ─── Pagination ───
  const paginatedAreas = filteredAreas.slice((areasPage - 1) * PAGE_SIZE, areasPage * PAGE_SIZE);
  const totalAreasPages = Math.ceil(filteredAreas.length / PAGE_SIZE);

  const filteredReservations = useMemo(() => {
    // Residente: solo reservas de sus unidades
    if (!canManageReservations && myUnitIds.size > 0) {
      return allReservations.filter((r) => r.unit_id && myUnitIds.has(r.unit_id));
    }
    return allReservations;
  }, [allReservations, canManageReservations, myUnitIds]);
  const paginatedReservations = filteredReservations.slice((reservationsPage - 1) * PAGE_SIZE, reservationsPage * PAGE_SIZE);
  const totalReservationsPages = Math.ceil(filteredReservations.length / PAGE_SIZE);

  // ─── Selected area data for reservation form ───
  const selectedAreaData = useMemo(() => {
    if (!reservationForm.common_area_id) return null;
    return areas.find((a) => a.id === reservationForm.common_area_id) || null;
  }, [areas, reservationForm.common_area_id]);

  const estimatedFee = useMemo(() => {
    if (!selectedAreaData?.rental_fee || !reservationForm.start_hour || !reservationForm.start_minute || !reservationForm.end_hour || !reservationForm.end_minute) return null;
    const sh = Number(reservationForm.start_hour);
    const sm = Number(reservationForm.start_minute);
    const eh = Number(reservationForm.end_hour);
    const em = Number(reservationForm.end_minute);
    const hours = (eh + em / 60) - (sh + sm / 60);
    if (hours <= 0) return null;
    return Math.round(Number(selectedAreaData.rental_fee) * hours * 100) / 100;
  }, [selectedAreaData, reservationForm.start_hour, reservationForm.start_minute, reservationForm.end_hour, reservationForm.end_minute]);

  // ─── Computed times (needed before validations) ───
  const startTime = reservationForm.start_hour && reservationForm.start_minute ? `${reservationForm.start_hour}:${reservationForm.start_minute}` : '';
  const endTime = reservationForm.end_hour && reservationForm.end_minute ? `${reservationForm.end_hour}:${reservationForm.end_minute}` : '';

  // ─── Reservation form validations ───
  const reservationWarnings = useMemo(() => {
    const warnings: string[] = [];
    if (!selectedAreaData || !startTime || !endTime) return warnings;

    // 1. Start < End
    if (startTime >= endTime) {
      warnings.push('La hora de inicio debe ser anterior a la hora de fin.');
    }

    // 2. Available days
    if (reservationForm.reservation_date && selectedAreaData.available_days?.length) {
      const dayOfWeek = new Date(reservationForm.reservation_date + 'T12:00:00').getDay();
      if (!selectedAreaData.available_days.includes(dayOfWeek)) {
        const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
        const allowedDays = selectedAreaData.available_days.map((d: number) => dayNames[d]).join(', ');
        warnings.push(`Esta zona no esta disponible el dia seleccionado. Dias permitidos: ${allowedDays}.`);
      }
    }

    // 3. Within available hours
    if (selectedAreaData.available_from && startTime < selectedAreaData.available_from) {
      warnings.push(`La hora de inicio no puede ser antes de las ${selectedAreaData.available_from} (hora de apertura).`);
    }
    if (selectedAreaData.available_to && endTime > selectedAreaData.available_to) {
      warnings.push(`La hora de fin no puede ser despues de las ${selectedAreaData.available_to} (hora de cierre).`);
    }

    // 4. Min/Max hours
    if (startTime < endTime) {
      const sh = Number(reservationForm.start_hour);
      const sm = Number(reservationForm.start_minute);
      const eh = Number(reservationForm.end_hour);
      const em = Number(reservationForm.end_minute);
      const hours = (eh + em / 60) - (sh + sm / 60);

      if (selectedAreaData.min_hours && hours < selectedAreaData.min_hours) {
        warnings.push(`La reserva debe ser de minimo ${selectedAreaData.min_hours} hora(s). Seleccionaste ${hours.toFixed(1)}h.`);
      }
      if (selectedAreaData.max_hours && hours > selectedAreaData.max_hours) {
        warnings.push(`La reserva no puede exceder ${selectedAreaData.max_hours} hora(s). Seleccionaste ${hours.toFixed(1)}h.`);
      }
    }

    return warnings;
  }, [selectedAreaData, reservationForm.reservation_date, reservationForm.start_hour, reservationForm.start_minute, reservationForm.end_hour, reservationForm.end_minute, startTime, endTime]);

  const hasReservationErrors = reservationWarnings.length > 0;

  // ─── Residente: puede cancelar sus propias reservas pendientes ───
  const canCancelOwn = useCallback(
    (r: PhReservation) => !canManageReservations && r.status === 'pending' && r.unit_id != null && myUnitIds.has(r.unit_id),
    [canManageReservations, myUnitIds],
  );

  // ─── Area handlers ───

  const handleCreateArea = async () => {
    try {
      setSubmitting(true);
      const availFrom = areaForm.available_from_hour && areaForm.available_from_minute ? `${areaForm.available_from_hour}:${areaForm.available_from_minute}` : undefined;
      const availTo = areaForm.available_to_hour && areaForm.available_to_minute ? `${areaForm.available_to_hour}:${areaForm.available_to_minute}` : undefined;
      await createArea({
        condominium_id: areaForm.condominium_id,
        name: areaForm.name,
        description: areaForm.description || undefined,
        capacity: areaForm.capacity ? Number(areaForm.capacity) : undefined,
        rental_fee: areaForm.rental_fee ? Number(areaForm.rental_fee) : undefined,
        requires_deposit: areaForm.requires_deposit,
        deposit_amount: areaForm.deposit_amount ? Number(areaForm.deposit_amount) : undefined,
        requires_approval: areaForm.requires_approval,
        available_from: availFrom,
        available_to: availTo,
        min_hours: areaForm.min_hours ? Number(areaForm.min_hours) : undefined,
        max_hours: areaForm.max_hours ? Number(areaForm.max_hours) : undefined,
        available_days: areaForm.available_days,
      });
      setIsCreateAreaOpen(false);
      setAreaForm(emptyAreaForm);
    } catch {
      // toast handled by hook
    } finally {
      setSubmitting(false);
    }
  };

  const openEditArea = (area: PhCommonArea) => {
    setSelectedArea(area);
    const [fromH, fromM] = (area.available_from || '08:00').split(':');
    const [toH, toM] = (area.available_to || '22:00').split(':');
    setAreaForm({
      condominium_id: area.condominium_id,
      name: area.name,
      description: area.description || '',
      capacity: area.capacity?.toString() || '',
      rental_fee: area.rental_fee?.toString() || '',
      requires_deposit: area.requires_deposit,
      deposit_amount: area.deposit_amount?.toString() || '',
      requires_approval: area.requires_approval,
      available_from_hour: fromH || '08',
      available_from_minute: fromM || '00',
      available_to_hour: toH || '22',
      available_to_minute: toM || '00',
      min_hours: area.min_hours?.toString() || '1',
      max_hours: area.max_hours?.toString() || '8',
      available_days: area.available_days ?? [0, 1, 2, 3, 4, 5, 6],
    });
    setIsEditAreaOpen(true);
  };

  const handleUpdateArea = async () => {
    if (!selectedArea) return;
    try {
      setSubmitting(true);
      const availFrom = areaForm.available_from_hour && areaForm.available_from_minute ? `${areaForm.available_from_hour}:${areaForm.available_from_minute}` : undefined;
      const availTo = areaForm.available_to_hour && areaForm.available_to_minute ? `${areaForm.available_to_hour}:${areaForm.available_to_minute}` : undefined;
      await updateArea(selectedArea.id, {
        condominium_id: areaForm.condominium_id,
        name: areaForm.name,
        description: areaForm.description || undefined,
        capacity: areaForm.capacity ? Number(areaForm.capacity) : undefined,
        rental_fee: areaForm.rental_fee ? Number(areaForm.rental_fee) : undefined,
        requires_deposit: areaForm.requires_deposit,
        deposit_amount: areaForm.deposit_amount ? Number(areaForm.deposit_amount) : undefined,
        requires_approval: areaForm.requires_approval,
        available_from: availFrom,
        available_to: availTo,
        min_hours: areaForm.min_hours ? Number(areaForm.min_hours) : undefined,
        max_hours: areaForm.max_hours ? Number(areaForm.max_hours) : undefined,
        available_days: areaForm.available_days,
      });
      setIsEditAreaOpen(false);
      setSelectedArea(null);
      setAreaForm(emptyAreaForm);
    } catch {
      // toast handled by hook
    } finally {
      setSubmitting(false);
    }
  };

  const openDeleteArea = (area: PhCommonArea) => {
    setSelectedArea(area);
    setIsDeleteAreaOpen(true);
  };

  const handleDeleteArea = async () => {
    if (!selectedArea) return;
    try {
      setSubmitting(true);
      await removeArea(selectedArea.id);
      setIsDeleteAreaOpen(false);
      setSelectedArea(null);
    } catch {
      // toast handled by hook
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Available days toggle ───
  const toggleDay = (day: number) => {
    const days = areaForm.available_days.includes(day)
      ? areaForm.available_days.filter((d) => d !== day)
      : [...areaForm.available_days, day].sort();
    setAreaForm({ ...areaForm, available_days: days });
  };

  // ─── Reservation handlers ───

  const handleCheckAvailability = async () => {
    if (!reservationForm.common_area_id || !reservationForm.reservation_date || !startTime || !endTime) return;
    try {
      const result = await checkAvailability(reservationForm.common_area_id, {
        date: reservationForm.reservation_date,
        start_time: startTime,
        end_time: endTime,
      });
      setAvailabilityResult(result);
    } catch {
      setAvailabilityResult({ available: false, message: 'Error al verificar disponibilidad' });
    }
  };

  const handleCreateReservation = async () => {
    if (!reservationForm.common_area_id || !startTime || !endTime || hasReservationErrors || !availabilityResult?.available) return;
    try {
      setSubmitting(true);
      await createReservation(reservationForm.common_area_id, {
        unit_id: reservationForm.unit_id || undefined,
        reservation_date: reservationForm.reservation_date,
        start_time: startTime,
        end_time: endTime,
        notes: reservationForm.notes || undefined,
      });
      setIsCreateReservationOpen(false);
      setReservationForm(emptyReservationForm);
      setAvailabilityResult(null);
    } catch {
      // toast handled by hook
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmReservation = async (reservation: PhReservation) => {
    try {
      await confirmReservation(reservation.common_area_id, reservation.id);
    } catch {
      // toast handled by hook
    }
  };

  const openCancelReservation = (reservation: PhReservation) => {
    setSelectedReservation(reservation);
    setCancelReason('');
    setIsCancelReservationOpen(true);
  };

  const handleCancelReservation = async () => {
    if (!selectedReservation) return;
    try {
      setSubmitting(true);
      await cancelReservation(selectedReservation.common_area_id, selectedReservation.id, cancelReason || undefined);
      setIsCancelReservationOpen(false);
      setSelectedReservation(null);
      setCancelReason('');
    } catch {
      // toast handled by hook
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteReservation = async (reservation: PhReservation) => {
    try {
      await completeReservation(reservation.common_area_id, reservation.id);
    } catch {
      // toast handled by hook
    }
  };

  const handleReactivateReservation = async (reservation: PhReservation) => {
    try {
      await reactivateReservation(reservation.common_area_id, reservation.id);
    } catch {
      // toast handled by hook
    }
  };

  // ─── Calendar handlers ───
  const handleSelectSlot = useCallback(({ start, end }: { start: Date; end: Date }) => {
    if (start < startOfDay(new Date())) return;
    setReservationForm({
      ...emptyReservationForm,
      reservation_date: format(start, 'yyyy-MM-dd'),
      start_hour: format(start, 'HH'),
      start_minute: format(start, 'mm'),
      end_hour: format(end, 'HH'),
      end_minute: format(end, 'mm'),
    });
    setAvailabilityResult(null);
    setIsCreateReservationOpen(true);
  }, []);

  const openNewReservation = () => {
    setReservationForm(emptyReservationForm);
    setAvailabilityResult(null);
    setIsCreateReservationOpen(true);
  };

  // ─── Area form fields ───
  const renderAreaFormFields = () => (
    <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-1">
      <div className="space-y-2">
        <Label>Copropiedad *</Label>
        <Select
          options={condominiums.map((c) => ({ value: c.id, label: c.name }))}
          value={areaForm.condominium_id}
          onChange={(v) => setAreaForm({ ...areaForm, condominium_id: v })}
          placeholder="Seleccionar copropiedad"
          searchable
        />
      </div>
      <div className="space-y-2">
        <Label>Nombre *</Label>
        <Input
          value={areaForm.name}
          onChange={(e) => setAreaForm({ ...areaForm, name: e.target.value })}
          placeholder="Ej: Salon Social, Piscina"
        />
      </div>
      <div className="space-y-2">
        <Label>Descripcion</Label>
        <Input
          value={areaForm.description}
          onChange={(e) => setAreaForm({ ...areaForm, description: e.target.value })}
          placeholder="Descripcion del area"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Capacidad (personas)</Label>
          <Input
            type="number"
            value={areaForm.capacity}
            onChange={(e) => setAreaForm({ ...areaForm, capacity: e.target.value })}
            placeholder="Ej: 50"
          />
        </div>
        <div className="space-y-2">
          <Label>Tarifa de uso (COP)</Label>
          <Input
            type="number"
            value={areaForm.rental_fee}
            onChange={(e) => setAreaForm({ ...areaForm, rental_fee: e.target.value })}
            placeholder="Ej: 150000"
          />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <Label>Requiere deposito</Label>
        <Switch
          checked={areaForm.requires_deposit}
          onCheckedChange={(v) => setAreaForm({ ...areaForm, requires_deposit: v })}
        />
      </div>
      {areaForm.requires_deposit && (
        <div className="space-y-2">
          <Label>Monto del deposito (COP)</Label>
          <Input
            type="number"
            value={areaForm.deposit_amount}
            onChange={(e) => setAreaForm({ ...areaForm, deposit_amount: e.target.value })}
            placeholder="Ej: 200000"
          />
        </div>
      )}
      <div className="flex items-center justify-between">
        <Label>Requiere aprobacion del administrador</Label>
        <Switch
          checked={areaForm.requires_approval}
          onCheckedChange={(v) => setAreaForm({ ...areaForm, requires_approval: v })}
        />
      </div>
      {areaForm.requires_approval && (
        <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded p-2">
          Las reservas de esta zona quedaran en estado &quot;Pendiente&quot; hasta que un administrador las apruebe.
        </p>
      )}
      <div className="space-y-2">
        <Label>Hora apertura</Label>
        <div className="grid grid-cols-2 gap-2">
          <Select
            options={HOUR_OPTIONS}
            value={areaForm.available_from_hour}
            onChange={(v) => setAreaForm({ ...areaForm, available_from_hour: v })}
            placeholder="Hora"
          />
          <Select
            options={MINUTE_OPTIONS}
            value={areaForm.available_from_minute}
            onChange={(v) => setAreaForm({ ...areaForm, available_from_minute: v })}
            placeholder="Min"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Hora cierre</Label>
        <div className="grid grid-cols-2 gap-2">
          <Select
            options={HOUR_OPTIONS}
            value={areaForm.available_to_hour}
            onChange={(v) => setAreaForm({ ...areaForm, available_to_hour: v })}
            placeholder="Hora"
          />
          <Select
            options={MINUTE_OPTIONS}
            value={areaForm.available_to_minute}
            onChange={(v) => setAreaForm({ ...areaForm, available_to_minute: v })}
            placeholder="Min"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Minimo de horas</Label>
          <Input
            type="number"
            value={areaForm.min_hours}
            onChange={(e) => setAreaForm({ ...areaForm, min_hours: e.target.value })}
            placeholder="Ej: 1"
          />
        </div>
        <div className="space-y-2">
          <Label>Maximo de horas</Label>
          <Input
            type="number"
            value={areaForm.max_hours}
            onChange={(e) => setAreaForm({ ...areaForm, max_hours: e.target.value })}
            placeholder="Ej: 8"
          />
        </div>
      </div>
      {/* Dias disponibles */}
      <div className="space-y-2">
        <Label>Dias disponibles</Label>
        <div className="flex gap-2">
          {DAY_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => toggleDay(value)}
              className={cn(
                'h-9 w-9 rounded-full text-xs font-medium transition-colors',
                areaForm.available_days.includes(value)
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // ─── Reservation sidebar card ───
  const renderReservationCard = (r: PhReservation, showActions = canManageReservations) => {
    const statusColor = r.status === 'pending' ? 'border-l-amber-500' :
      r.status === 'confirmed' ? 'border-l-purple-500' :
        r.status === 'completed' ? 'border-l-emerald-500' : 'border-l-gray-400';

    const showCancelOwn = canCancelOwn(r);

    return (
      <div
        key={r.id}
        className={cn(
          'border-l-4 rounded-lg bg-white dark:bg-slate-800 p-3 shadow-sm space-y-1.5 transition-colors',
          statusColor,
        )}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-gray-500 dark:text-slate-400">
            {formatTime(r.start_time)} - {formatTime(r.end_time)}
          </span>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {getDateLabel(getResDateStr(r))}
          </Badge>
        </div>
        <p className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-1">
          {r.common_area?.name || 'Zona'}
        </p>
        {r.unit && (
          <p className="text-xs text-gray-500 dark:text-slate-400">
            Und. {r.unit.unit_number}
          </p>
        )}
        <div className="flex items-center gap-2">
          {getStatusBadge(r.status)}
          {r.total_fee != null && r.total_fee > 0 && (
            <Badge variant="secondary" className="text-[10px]">{formatCOP(r.total_fee)}</Badge>
          )}
        </div>
        {/* Admin: acciones completas */}
        {showActions && (
          <div className="flex gap-1 pt-1">
            {r.status === 'pending' && (
              <>
                <Button size="sm" variant="ghost" className="h-7 px-2 text-emerald-600" onClick={() => handleConfirmReservation(r)}>
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Confirmar
                </Button>
                <Button size="sm" variant="ghost" className="h-7 px-2 text-red-600" onClick={() => openCancelReservation(r)}>
                  <XCircle className="h-3.5 w-3.5 mr-1" /> Rechazar
                </Button>
              </>
            )}
            {r.status === 'confirmed' && (
              <Button size="sm" variant="ghost" className="h-7 px-2 text-red-600" onClick={() => openCancelReservation(r)}>
                <XCircle className="h-3.5 w-3.5 mr-1" /> Cancelar
              </Button>
            )}
            {r.status === 'cancelled' && (
              <Button size="sm" variant="ghost" className="h-7 px-2 text-blue-600" onClick={() => handleReactivateReservation(r)}>
                <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reactivar
              </Button>
            )}
          </div>
        )}
        {/* Residente: solo cancelar sus pendientes */}
        {showCancelOwn && (
          <div className="flex gap-1 pt-1">
            <Button size="sm" variant="ghost" className="h-7 px-2 text-red-600" onClick={() => openCancelReservation(r)}>
              <XCircle className="h-3.5 w-3.5 mr-1" /> Cancelar
            </Button>
          </div>
        )}
      </div>
    );
  };

  // ─── Loading state ───
  if (loading && areas.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto" />
          <p className="text-gray-500 dark:text-slate-400">Cargando areas comunes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* ═══════════════════ HEADER ═══════════════════ */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <MapPin className="h-7 w-7 text-purple-600 dark:text-purple-400" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Zonas Comunes</h1>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              {canManageAreas ? 'Gestion de espacios y reservas' : 'Consulta zonas disponibles y crea reservas'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Filtro copropiedad: residente solo ve las suyas */}
          {(canManageAreas || myCondominiumIds.size > 1) && (
            <div className="w-56">
              <Select
                options={[
                  { value: '', label: 'Todas las copropiedades' },
                  ...(canManageAreas
                    ? condominiums
                    : condominiums.filter((c) => myCondominiumIds.has(c.id))
                  ).map((c) => ({ value: c.id, label: c.name })),
                ]}
                value={filterCondominium}
                onChange={(v) => { setFilterCondominium(v); setAreasPage(1); setReservationsPage(1); }}
                placeholder="Filtrar copropiedad"
                searchable
              />
            </div>
          )}
          <Button onClick={openNewReservation}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Reserva
          </Button>
        </div>
      </div>

      {/* ═══════════════════ STATS CARDS ═══════════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <CalendarIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">Total Reservas</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
              <Clock className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.today}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">Hoy</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <CalendarClock className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.thisWeek}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">Esta Semana</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pending}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">Pendientes</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.confirmed}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">Confirmadas</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ═══════════════════ TABS ═══════════════════ */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-lg grid-cols-3">
          <TabsTrigger value="areas" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Zonas
          </TabsTrigger>
          <TabsTrigger value="reservations" className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4" />
            Lista Reservas
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            Calendario
          </TabsTrigger>
        </TabsList>

        {/* ═══════════════════ TAB: ZONAS ═══════════════════ */}
        <TabsContent value="areas" className="mt-6 space-y-6">
          {canManageAreas && (
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setImportOpen(true)} className="gap-2 border-gray-200 dark:border-slate-700">
                <Upload className="h-4 w-4" />
                Importar Excel
              </Button>
              <Button onClick={() => { setAreaForm(emptyAreaForm); setIsCreateAreaOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Nueva Zona
              </Button>
            </div>
          )}

          <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white flex items-center justify-between">
                <span>Zonas Comunes</span>
                <Badge variant="secondary">{filteredAreas.length} zonas</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-200 dark:border-slate-700">
                      <TableHead className="text-gray-600 dark:text-slate-300">Nombre</TableHead>
                      <TableHead className="text-gray-600 dark:text-slate-300">Copropiedad</TableHead>
                      <TableHead className="text-gray-600 dark:text-slate-300">Capacidad</TableHead>
                      <TableHead className="text-gray-600 dark:text-slate-300">Tarifa</TableHead>
                      <TableHead className="text-gray-600 dark:text-slate-300">Horario</TableHead>
                      <TableHead className="text-gray-600 dark:text-slate-300">Estado</TableHead>
                      {canManageAreas && <TableHead className="text-gray-600 dark:text-slate-300 text-right">Acciones</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedAreas.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-gray-500 dark:text-slate-400">
                          No hay zonas comunes registradas
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedAreas.map((area) => (
                        <TableRow
                          key={area.id}
                          className="border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/40"
                        >
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium text-gray-900 dark:text-white">{area.name}</span>
                              {area.description && (
                                <span className="text-xs text-gray-500 dark:text-slate-400 truncate max-w-[200px]">
                                  {area.description}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-600 dark:text-slate-400">
                            {area.condominium?.name || condominiums.find((c) => c.id === area.condominium_id)?.name || '-'}
                          </TableCell>
                          <TableCell className="text-gray-600 dark:text-slate-400">
                            {area.capacity ?? '-'}
                          </TableCell>
                          <TableCell className="text-gray-600 dark:text-slate-400">
                            {area.rental_fee ? formatCOP(area.rental_fee) : <span className="text-emerald-600 dark:text-emerald-400">Gratis</span>}
                          </TableCell>
                          <TableCell className="text-gray-600 dark:text-slate-400">
                            {area.available_from && area.available_to
                              ? `${formatTime(area.available_from)} - ${formatTime(area.available_to)}`
                              : '-'}
                          </TableCell>
                          <TableCell>
                            {area.is_active ? (
                              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                Activa
                              </Badge>
                            ) : (
                              <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                Inactiva
                              </Badge>
                            )}
                          </TableCell>
                          {canManageAreas && (
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => openEditArea(area)}>
                                    <Pencil className="h-4 w-4 mr-2" />
                                    Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => openDeleteArea(area)}
                                    className="text-red-600 dark:text-red-400"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Eliminar
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

          {totalAreasPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500 dark:text-slate-400">
                Pagina {areasPage} de {totalAreasPages} ({filteredAreas.length} zonas)
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setAreasPage((p) => Math.max(1, p - 1))} disabled={areasPage === 1}>
                  Anterior
                </Button>
                <Button variant="outline" size="sm" onClick={() => setAreasPage((p) => Math.min(totalAreasPages, p + 1))} disabled={areasPage === totalAreasPages}>
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ═══════════════════ TAB: LISTA RESERVAS ═══════════════════ */}
        <TabsContent value="reservations" className="mt-6 space-y-6">
          <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white flex items-center justify-between">
                <span>{canManageReservations ? 'Todas las Reservas' : 'Mis Reservas'}</span>
                <Badge variant="secondary">{filteredReservations.length} reservas</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-200 dark:border-slate-700">
                      <TableHead className="text-gray-600 dark:text-slate-300">Zona</TableHead>
                      <TableHead className="text-gray-600 dark:text-slate-300">Unidad</TableHead>
                      <TableHead className="text-gray-600 dark:text-slate-300">Fecha</TableHead>
                      <TableHead className="text-gray-600 dark:text-slate-300">Horario</TableHead>
                      <TableHead className="text-gray-600 dark:text-slate-300">Tarifa</TableHead>
                      <TableHead className="text-gray-600 dark:text-slate-300">Estado</TableHead>
                      <TableHead className="text-gray-600 dark:text-slate-300 text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedReservations.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-gray-500 dark:text-slate-400">
                          {canManageReservations ? 'No hay reservas registradas' : 'No tienes reservas'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedReservations.map((res) => (
                        <TableRow
                          key={res.id}
                          className={cn(
                            'border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/40',
                            res.status === 'pending' && 'border-l-4 border-l-yellow-500',
                            res.status === 'confirmed' && 'border-l-4 border-l-emerald-500',
                            res.status === 'cancelled' && 'border-l-4 border-l-red-500',
                            res.status === 'completed' && 'border-l-4 border-l-blue-500',
                          )}
                        >
                          <TableCell className="font-medium text-gray-900 dark:text-white">
                            {res.common_area?.name || areas.find((a) => a.id === res.common_area_id)?.name || '-'}
                          </TableCell>
                          <TableCell className="text-gray-600 dark:text-slate-400">
                            {res.unit?.unit_number || '-'}
                          </TableCell>
                          <TableCell className="text-gray-600 dark:text-slate-400">
                            {res.reservation_date
                              ? formatDateStr(getResDateStr(res))
                              : '-'}
                          </TableCell>
                          <TableCell className="text-gray-600 dark:text-slate-400">
                            {formatTime(res.start_time)} - {formatTime(res.end_time)}
                          </TableCell>
                          <TableCell className="text-gray-600 dark:text-slate-400">
                            {formatCOP(res.total_fee)}
                          </TableCell>
                          <TableCell>{getStatusBadge(res.status)}</TableCell>
                          <TableCell className="text-right">
                            {/* Admin: gestión completa */}
                            {canManageReservations && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {res.status === 'pending' && (
                                    <DropdownMenuItem onClick={() => handleConfirmReservation(res)}>
                                      <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-600" />
                                      Confirmar
                                    </DropdownMenuItem>
                                  )}
                                  {res.status === 'confirmed' && (
                                    <DropdownMenuItem onClick={() => handleCompleteReservation(res)}>
                                      <CheckCircle2 className="h-4 w-4 mr-2 text-blue-600" />
                                      Completar
                                    </DropdownMenuItem>
                                  )}
                                  {(res.status === 'pending' || res.status === 'confirmed') && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        onClick={() => openCancelReservation(res)}
                                        className="text-red-600 dark:text-red-400"
                                      >
                                        <XCircle className="h-4 w-4 mr-2" />
                                        Cancelar
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                  {res.status === 'cancelled' && (
                                    <DropdownMenuItem onClick={() => handleReactivateReservation(res)}>
                                      <RotateCcw className="h-4 w-4 mr-2 text-blue-600" />
                                      Reactivar
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                            {/* Residente: solo cancelar sus pendientes */}
                            {canCancelOwn(res) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 dark:text-red-400"
                                onClick={() => openCancelReservation(res)}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Cancelar
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {totalReservationsPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500 dark:text-slate-400">
                Pagina {reservationsPage} de {totalReservationsPages} ({filteredReservations.length} reservas)
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setReservationsPage((p) => Math.max(1, p - 1))} disabled={reservationsPage === 1}>
                  Anterior
                </Button>
                <Button variant="outline" size="sm" onClick={() => setReservationsPage((p) => Math.min(totalReservationsPages, p + 1))} disabled={reservationsPage === totalReservationsPages}>
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ═══════════════════ TAB: CALENDARIO ═══════════════════ */}
        <TabsContent value="calendar" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
            {/* Calendar */}
            <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
              <CardContent className="p-4">
                <div style={{ height: 650 }}>
                  <Calendar
                    localizer={localizer}
                    events={calendarEvents}
                    startAccessor="start"
                    endAccessor="end"
                    views={['month', 'week', 'day', 'agenda']}
                    view={calendarView}
                    onView={(v) => setCalendarView(v as 'month' | 'week' | 'day' | 'agenda')}
                    date={calendarDate}
                    onNavigate={(d) => setCalendarDate(d)}
                    min={new Date(2000, 0, 1, 6, 0)}
                    max={new Date(2000, 0, 1, 22, 0)}
                    step={30}
                    timeslots={2}
                    selectable
                    popup
                    onSelectSlot={handleSelectSlot}
                    eventPropGetter={eventStyleGetter}
                    messages={calendarMessages}
                    culture="es"
                    style={{ height: '100%' }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Sidebar */}
            <div className="space-y-4">
              <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-gray-900 dark:text-white">{canManageReservations ? 'Reservas' : 'Mis Reservas'}</CardTitle>
                </CardHeader>
                <CardContent className="p-3">
                  {/* Sub-tabs */}
                  <div className="flex gap-1 mb-3">
                    <Button
                      size="sm"
                      variant={calendarSidebarTab === 'pending' ? 'default' : 'ghost'}
                      className="h-7 text-xs flex-1"
                      onClick={() => setCalendarSidebarTab('pending')}
                    >
                      Pendientes
                      {upcomingPending.length > 0 && (
                        <Badge className="ml-1 h-4 px-1 text-[10px] bg-amber-500">{upcomingPending.length}</Badge>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant={calendarSidebarTab === 'confirmed' ? 'default' : 'ghost'}
                      className="h-7 text-xs flex-1"
                      onClick={() => setCalendarSidebarTab('confirmed')}
                    >
                      Confirmadas
                      {upcomingConfirmed.length > 0 && (
                        <Badge className="ml-1 h-4 px-1 text-[10px] bg-purple-500">{upcomingConfirmed.length}</Badge>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant={calendarSidebarTab === 'history' ? 'default' : 'ghost'}
                      className="h-7 text-xs flex-1"
                      onClick={() => setCalendarSidebarTab('history')}
                    >
                      Historial
                    </Button>
                  </div>

                  {/* Sub-tab content */}
                  <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                    {calendarSidebarTab === 'pending' && (
                      upcomingPending.length === 0 ? (
                        <p className="text-xs text-gray-400 dark:text-slate-500 text-center py-4">No hay reservas pendientes esta semana</p>
                      ) : upcomingPending.map((r) => renderReservationCard(r))
                    )}
                    {calendarSidebarTab === 'confirmed' && (
                      upcomingConfirmed.length === 0 ? (
                        <p className="text-xs text-gray-400 dark:text-slate-500 text-center py-4">No hay reservas confirmadas esta semana</p>
                      ) : upcomingConfirmed.map((r) => renderReservationCard(r))
                    )}
                    {calendarSidebarTab === 'history' && (
                      recentHistory.length === 0 ? (
                        <p className="text-xs text-gray-400 dark:text-slate-500 text-center py-4">No hay historial reciente</p>
                      ) : recentHistory.map((r) => renderReservationCard(r, false))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ═══════════════════ DIALOGS ═══════════════════ */}

      {/* Create Area Dialog */}
      <Dialog open={isCreateAreaOpen} onOpenChange={setIsCreateAreaOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva Zona Comun</DialogTitle>
          </DialogHeader>
          {renderAreaFormFields()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateAreaOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreateArea}
              disabled={submitting || !areaForm.condominium_id || !areaForm.name}
            >
              {submitting ? 'Creando...' : 'Crear Zona'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Area Dialog */}
      <Dialog open={isEditAreaOpen} onOpenChange={setIsEditAreaOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Zona Comun</DialogTitle>
          </DialogHeader>
          {renderAreaFormFields()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditAreaOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleUpdateArea}
              disabled={submitting || !areaForm.condominium_id || !areaForm.name}
            >
              {submitting ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Area Dialog */}
      <Dialog open={isDeleteAreaOpen} onOpenChange={setIsDeleteAreaOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Zona Comun</DialogTitle>
          </DialogHeader>
          <p className="text-gray-600 dark:text-slate-400">
            Estas seguro de que deseas eliminar la zona <strong>{selectedArea?.name}</strong>?
          </p>
          <p className="text-sm text-gray-500 dark:text-slate-500">
            Esta accion no se puede deshacer. Se eliminaran tambien las reservas asociadas.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteAreaOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteArea} disabled={submitting}>
              {submitting ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Reservation Dialog */}
      <Dialog open={isCreateReservationOpen} onOpenChange={(open) => { setIsCreateReservationOpen(open); if (!open) setAvailabilityResult(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva Reserva</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Copropiedad</Label>
                <Select
                  options={[
                    { value: '', label: 'Todas' },
                    ...(canManageAreas
                      ? condominiums
                      : condominiums.filter((c) => myCondominiumIds.has(c.id))
                    ).map((c) => ({ value: c.id, label: c.name })),
                  ]}
                  value={reservationForm.condominium_id}
                  onChange={(v) => setReservationForm({ ...reservationForm, condominium_id: v, common_area_id: '', unit_id: '' })}
                  placeholder="Filtrar por copropiedad"
                  searchable
                />
              </div>
              <div className="space-y-2">
                <Label>Zona Comun *</Label>
                <Select
                  options={formFilteredAreas.map((a) => ({ value: a.id, label: a.name }))}
                  value={reservationForm.common_area_id}
                  onChange={(v) => {
                    const area = areas.find((a) => a.id === v);
                    const [fromH, fromM] = (area?.available_from || '').split(':');
                    const [toH, toM] = (area?.available_to || '').split(':');
                    setReservationForm({
                      ...reservationForm,
                      common_area_id: v,
                      start_hour: fromH || reservationForm.start_hour,
                      start_minute: fromM || reservationForm.start_minute,
                      end_hour: toH || reservationForm.end_hour,
                      end_minute: toM || reservationForm.end_minute,
                    });
                    setAvailabilityResult(null);
                  }}
                  placeholder="Seleccionar zona"
                  searchable
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Unidad</Label>
              <Select
                options={formFilteredUnits.map((u) => ({ value: u.id, label: `${u.unit_number}${u.condominium?.name ? ` - ${u.condominium.name}` : ''}` }))}
                value={reservationForm.unit_id}
                onChange={(v) => setReservationForm({ ...reservationForm, unit_id: v })}
                placeholder="Seleccionar unidad (opcional)"
                searchable
              />
              {isUnitDelinquent && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>Esta unidad tiene cuotas vencidas. No se pueden crear reservas hasta ponerse al dia.</span>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Fecha de reserva *</Label>
              <DatePicker
                value={reservationForm.reservation_date}
                onChange={(v) => { setReservationForm({ ...reservationForm, reservation_date: v }); setAvailabilityResult(null); }}
                placeholder="Seleccionar fecha"
                minDate={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>
            <div className="space-y-2">
              <Label>Hora inicio *</Label>
              <div className="grid grid-cols-2 gap-2">
                <Select
                  options={HOUR_OPTIONS}
                  value={reservationForm.start_hour}
                  onChange={(v) => { setReservationForm({ ...reservationForm, start_hour: v }); setAvailabilityResult(null); }}
                  placeholder="Hora"
                />
                <Select
                  options={MINUTE_OPTIONS}
                  value={reservationForm.start_minute}
                  onChange={(v) => { setReservationForm({ ...reservationForm, start_minute: v }); setAvailabilityResult(null); }}
                  placeholder="Min"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Hora fin *</Label>
              <div className="grid grid-cols-2 gap-2">
                <Select
                  options={HOUR_OPTIONS}
                  value={reservationForm.end_hour}
                  onChange={(v) => { setReservationForm({ ...reservationForm, end_hour: v }); setAvailabilityResult(null); }}
                  placeholder="Hora"
                />
                <Select
                  options={MINUTE_OPTIONS}
                  value={reservationForm.end_minute}
                  onChange={(v) => { setReservationForm({ ...reservationForm, end_minute: v }); setAvailabilityResult(null); }}
                  placeholder="Min"
                />
              </div>
            </div>

            {/* Pricing display */}
            {selectedAreaData?.rental_fee != null && Number(selectedAreaData.rental_fee) > 0 && (
              <div className="flex items-start gap-2 rounded-md border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-3">
                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                <div className="text-xs text-blue-700 dark:text-blue-300">
                  <p>Tarifa por hora: {formatCOP(Number(selectedAreaData.rental_fee))}</p>
                  {estimatedFee != null && (
                    <p className="font-semibold mt-0.5">Total estimado: {formatCOP(estimatedFee)}</p>
                  )}
                </div>
              </div>
            )}

            {/* Approval notice */}
            {selectedAreaData?.requires_approval && (
              <div className="flex items-start gap-2 rounded-md border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3">
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  Esta zona requiere que un administrador apruebe la reserva antes de confirmarla.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Notas</Label>
              <Input
                value={reservationForm.notes}
                onChange={(e) => setReservationForm({ ...reservationForm, notes: e.target.value })}
                placeholder="Evento, numero de invitados, etc."
              />
            </div>

            {/* Validation warnings */}
            {reservationWarnings.length > 0 && (
              <div className="rounded-md border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3 space-y-1">
                {reservationWarnings.map((w, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-red-700 dark:text-red-300">{w}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Check availability */}
            <Button
              variant="outline"
              className="w-full"
              onClick={handleCheckAvailability}
              disabled={hasReservationErrors || !reservationForm.common_area_id || !reservationForm.reservation_date || !startTime || !endTime}
            >
              <Search className="h-4 w-4 mr-2" />
              Verificar Disponibilidad
            </Button>

            {availabilityResult && (
              <Card className={availabilityResult.available
                ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
              }>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    {availabilityResult.available ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                    )}
                    <span className={availabilityResult.available
                      ? 'text-sm text-emerald-700 dark:text-emerald-400'
                      : 'text-sm text-red-700 dark:text-red-400'
                    }>
                      {availabilityResult.available ? 'Horario disponible' : (availabilityResult.message || 'Horario no disponible - Ya existe una reserva en este horario')}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
          {/* Reminder: must check availability first */}
          {!availabilityResult && !hasReservationErrors && reservationForm.common_area_id && reservationForm.reservation_date && startTime && endTime && (
            <p className="text-xs text-amber-600 dark:text-amber-400 text-center">
              Debes verificar disponibilidad antes de crear la reserva.
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateReservationOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreateReservation}
              disabled={submitting || hasReservationErrors || isUnitDelinquent || !reservationForm.common_area_id || !reservationForm.reservation_date || !startTime || !endTime || !availabilityResult?.available}
            >
              {submitting ? 'Creando...' : 'Crear Reserva'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Reservation Dialog */}
      <Dialog open={isCancelReservationOpen} onOpenChange={setIsCancelReservationOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar Reserva</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-gray-600 dark:text-slate-400">
              Estas seguro de que deseas cancelar esta reserva?
            </p>
            <div className="space-y-2">
              <Label>Razon de cancelacion (opcional)</Label>
              <Input
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Motivo de la cancelacion"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCancelReservationOpen(false)}>
              Volver
            </Button>
            <Button variant="destructive" onClick={handleCancelReservation} disabled={submitting}>
              {submitting ? 'Cancelando...' : 'Cancelar Reserva'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Common Areas from Excel */}
      <ImportCommonAreasModal
        open={importOpen}
        onOpenChange={setImportOpen}
        onSuccess={() => fetchAreas()}
        condominiums={condominiums}
      />
    </div>
  );
}
