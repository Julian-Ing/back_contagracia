'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  Key,
  Plus,
  Loader2,
  MoreHorizontal,
  LogOut,
  XCircle,
  Eye,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Info,
  FileDown,
  ChevronsUpDown,
} from 'lucide-react';
import { useRentals, useUnits, useUnitTypes, useCondominiums } from '@/modules/ph';
import { rentalsService } from '@/modules/ph/services/ph.service';
import { useAuthStore } from '@/modules/auth';
import type { PhRental, RentalStatus } from '@/modules/ph';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { Select } from '@/shared/components/ui/select';
import { DatePicker } from '@/shared/components/ui/date-picker';
import { ExpandableTableGroup } from '@/shared/components/ui/expandable-table-group';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/shared/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/shared/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/shared/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';

// ─── Helpers ───

const PAGE_SIZE = 15;

function formatCOP(value?: number | null): string {
  if (value == null) return '-';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value);
}

function formatDateTime(dateStr?: string | null): string {
  if (!dateStr) return '-';
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr));
}

function formatMinutes(mins?: number | null): string {
  if (mins == null) return '-';
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function getStatusBadge(status: RentalStatus) {
  switch (status) {
    case 'active':
      return (
        <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-transparent">
          Activo
        </Badge>
      );
    case 'completed':
      return (
        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-transparent">
          Completado
        </Badge>
      );
    case 'cancelled':
      return (
        <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-transparent">
          Cancelado
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function getRentalFeeTypeLabel(type?: string | null): string {
  switch (type) {
    case 'fixed':
      return ' fijo';
    case 'per_hour':
      return '/hora';
    case 'per_day':
      return '/dia';
    default:
      return '';
  }
}

/** Combine date (yyyy-MM-dd) + hour + minute into ISO string */
function buildISOFromDateAndTime(date: string, hour: string, minute: string): string {
  if (!date || !hour || !minute) return '';
  return new Date(`${date}T${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:00`).toISOString();
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function nowHour(): string {
  return String(new Date().getHours()).padStart(2, '0');
}

function nowMinute(): string {
  const m = new Date().getMinutes();
  // Round down to nearest 5
  return String(Math.floor(m / 5) * 5).padStart(2, '0');
}

// Hour/minute options
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => ({
  value: String(i).padStart(2, '0'),
  label: String(i).padStart(2, '0'),
}));
const MINUTE_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i * 5).padStart(2, '0'),
  label: String(i * 5).padStart(2, '0'),
}));

// ─── Component ───

export default function RentalsPage() {
  const companyId = useAuthStore((s) => s.company?.id);
  const { rentals, loading, fetchRentals, createRental, checkoutRental, cancelRental } =
    useRentals();
  const { units } = useUnits();
  const { unitTypes } = useUnitTypes();
  const { condominiums } = useCondominiums();

  // Rentable type IDs
  const rentableTypeIds = useMemo(
    () => new Set(unitTypes.filter((ut) => ut.is_rentable).map((ut) => ut.id)),
    [unitTypes],
  );

  // Filters
  const [filterCondominium, setFilterCondominium] = useState('');
  const [filterUnit, setFilterUnit] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Pagination
  const [page, setPage] = useState(1);

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    condominium_id: '',
    unit_id: '',
    renter_unit_id: '',
    start_date: '',
    start_hour: '',
    start_minute: '',
    end_date: '',
    end_hour: '',
    end_minute: '',
    notes: '',
  });

  // Detail dialog
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailRental, setDetailRental] = useState<PhRental | null>(null);

  // Checkout confirmation
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutTarget, setCheckoutTarget] = useState<PhRental | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // Cancel confirmation
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<PhRental | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  // ─── Filter logic ───

  const filteredRentals = useMemo(() => {
    let list = rentals;
    if (filterCondominium) {
      list = list.filter((r) => r.condominium_id === filterCondominium);
    }
    if (filterUnit) {
      list = list.filter((r) => r.unit_id === filterUnit || r.renter_unit_id === filterUnit);
    }
    if (filterStatus) {
      list = list.filter((r) => r.status === filterStatus);
    }
    return list;
  }, [rentals, filterCondominium, filterUnit, filterStatus]);

  const totalFiltered = filteredRentals.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));
  const paginatedRentals = filteredRentals.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ── Agrupación por renter_unit (Alquilado por) ──
  const [expandedRenters, setExpandedRenters] = useState<Set<string>>(new Set());

  const toggleRenter = useCallback((renterUnitId: string) => {
    setExpandedRenters((prev) => {
      const next = new Set(prev);
      if (next.has(renterUnitId)) next.delete(renterUnitId);
      else next.add(renterUnitId);
      return next;
    });
  }, []);

  const groupedRentals = useMemo(() => {
    const map = new Map<string, PhRental[]>();
    for (const r of paginatedRentals) {
      const key = r.renter_unit_id;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return Array.from(map.entries());
  }, [paginatedRentals]);

  // Units filtered by selected condominium in create form
  const filteredUnitsForCreate = useMemo(() => {
    if (!createForm.condominium_id) return [];
    return units.filter((u) => u.condominium_id === createForm.condominium_id && u.is_active);
  }, [units, createForm.condominium_id]);

  // Rentable units only (for "Unidad a alquilar")
  const rentableUnits = useMemo(
    () => filteredUnitsForCreate.filter((u) => u.unit_type_id && rentableTypeIds.has(u.unit_type_id)),
    [filteredUnitsForCreate, rentableTypeIds],
  );

  // All units minus the selected one (for "Unidad que alquila")
  const renterUnitOptions = useMemo(
    () => filteredUnitsForCreate.filter((u) => u.id !== createForm.unit_id),
    [filteredUnitsForCreate, createForm.unit_id],
  );

  // Selected unit rental config info
  const selectedUnitConfig = useMemo(() => {
    if (!createForm.unit_id) return null;
    const unit = units.find((u) => u.id === createForm.unit_id);
    if (!unit?.unit_type_id) return null;
    const unitType = unitTypes.find((ut) => ut.id === unit.unit_type_id);
    if (!unitType) return null;
    return {
      name: unitType.name,
      freeMinutes: unitType.free_minutes ?? 0,
      rentalFee: unitType.rental_fee,
      rentalFeeType: unitType.rental_fee_type,
    };
  }, [createForm.unit_id, units, unitTypes]);

  // Can create?
  const startTimeISO = buildISOFromDateAndTime(
    createForm.start_date,
    createForm.start_hour,
    createForm.start_minute,
  );
  const endTimeISO = createForm.end_date
    ? buildISOFromDateAndTime(createForm.end_date, createForm.end_hour, createForm.end_minute)
    : '';

  const canCreate =
    !!createForm.condominium_id &&
    !!createForm.unit_id &&
    !!createForm.renter_unit_id &&
    !!startTimeISO;

  // ─── Handlers ───

  function handleApplyFilters() {
    setPage(1);
    const params: Record<string, unknown> = {};
    if (filterCondominium) params.condominium_id = filterCondominium;
    if (filterUnit) params.unit_id = filterUnit;
    if (filterStatus) params.status = filterStatus;
    fetchRentals(params);
  }

  function handleClearFilters() {
    setFilterCondominium('');
    setFilterUnit('');
    setFilterStatus('');
    setPage(1);
    fetchRentals();
  }

  function openCreate() {
    setCreateForm({
      condominium_id: '',
      unit_id: '',
      renter_unit_id: '',
      start_date: todayStr(),
      start_hour: nowHour(),
      start_minute: nowMinute(),
      end_date: '',
      end_hour: '',
      end_minute: '',
      notes: '',
    });
    setCreateOpen(true);
  }

  async function handleCreate() {
    if (!canCreate) return;
    setCreating(true);
    try {
      const data: Record<string, unknown> = {
        condominium_id: createForm.condominium_id,
        unit_id: createForm.unit_id,
        renter_unit_id: createForm.renter_unit_id,
        start_time: startTimeISO,
        notes: createForm.notes || undefined,
      };
      if (endTimeISO) {
        data.end_time = endTimeISO;
      }
      await createRental(data);
      setCreateOpen(false);
    } catch {
      // toast is handled by the hook
    } finally {
      setCreating(false);
    }
  }

  function openDetail(rental: PhRental) {
    setDetailRental(rental);
    setDetailOpen(true);
  }

  function openCheckout(rental: PhRental) {
    setCheckoutTarget(rental);
    setCheckoutOpen(true);
  }

  async function handleCheckout() {
    if (!checkoutTarget) return;
    setCheckoutLoading(true);
    try {
      await checkoutRental(checkoutTarget.id);
      setCheckoutOpen(false);
      setCheckoutTarget(null);
    } catch {
      // toast is handled by the hook
    } finally {
      setCheckoutLoading(false);
    }
  }

  function openCancel(rental: PhRental) {
    setCancelTarget(rental);
    setCancelOpen(true);
  }

  async function handleCancel() {
    if (!cancelTarget) return;
    setCancelLoading(true);
    try {
      await cancelRental(cancelTarget.id);
      setCancelOpen(false);
      setCancelTarget(null);
    } catch {
      // toast is handled by the hook
    } finally {
      setCancelLoading(false);
    }
  }

  async function handleDownloadReceipt(rentalId: string) {
    if (!companyId) return;
    try {
      const blob = await rentalsService.downloadReceipt(companyId, rentalId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `soporte-alquiler-${rentalId.slice(0, 8)}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      // silently fail
    }
  }

  // ─── Unit name helper ───

  function getUnitLabel(unitId?: string) {
    if (!unitId) return '-';
    const u = units.find((u) => u.id === unitId);
    return u ? `${u.unit_number}${u.tower ? ` - ${u.tower.name}` : ''}` : unitId.slice(0, 8);
  }

  function getCondominiumName(condId?: string) {
    if (!condId) return '-';
    const c = condominiums.find((c) => c.id === condId);
    return c?.name ?? condId.slice(0, 8);
  }

  // ─── Render ───

  return (
    <main className="py-6 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Key className="h-8 w-8 text-cyan-600 dark:text-cyan-400" />
            Alquileres
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Gestiona los alquileres de unidades entre copropietarios.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Alquiler
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 min-w-[180px]">
              <Label className="mb-1.5 block">Copropiedad</Label>
              <Select
                options={[
                  { value: '', label: 'Todas' },
                  ...condominiums.map((c) => ({ value: c.id, label: c.name })),
                ]}
                value={filterCondominium}
                onChange={setFilterCondominium}
                placeholder="Todas las copropiedades"
              />
            </div>
            <div className="flex-1 min-w-[180px]">
              <Label className="mb-1.5 block">Unidad</Label>
              <Select
                searchable
                options={[
                  { value: '', label: 'Todas' },
                  ...units.map((u) => ({
                    value: u.id,
                    label: `${u.unit_number}${u.tower ? ` - ${u.tower.name}` : ''}`,
                  })),
                ]}
                value={filterUnit}
                onChange={setFilterUnit}
                placeholder="Todas las unidades"
              />
            </div>
            <div className="flex-1 min-w-[160px]">
              <Label className="mb-1.5 block">Estado</Label>
              <Select
                options={[
                  { value: '', label: 'Todos' },
                  { value: 'active', label: 'Activo' },
                  { value: 'completed', label: 'Completado' },
                  { value: 'cancelled', label: 'Cancelado' },
                ]}
                value={filterStatus}
                onChange={setFilterStatus}
                placeholder="Todos los estados"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleApplyFilters} size="sm">
                Filtrar
              </Button>
              <Button onClick={handleClearFilters} variant="outline" size="sm">
                Limpiar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">
            Listado de Alquileres
          </CardTitle>
          <div className="flex items-center gap-2">
            {groupedRentals.some(([, items]) => items.length > 1) && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-gray-500 dark:text-gray-400"
                onClick={() => {
                  const multiGroups = groupedRentals
                    .filter(([, items]) => items.length > 1)
                    .map(([id]) => id);
                  const allExpanded = multiGroups.every((id) => expandedRenters.has(id));
                  setExpandedRenters(allExpanded ? new Set() : new Set(multiGroups));
                }}
              >
                <ChevronsUpDown className="h-3.5 w-3.5 mr-1" />
                {groupedRentals
                  .filter(([, items]) => items.length > 1)
                  .every(([id]) => expandedRenters.has(id))
                  ? 'Colapsar todo'
                  : 'Expandir todo'}
              </Button>
            )}
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {totalFiltered} registro{totalFiltered !== 1 ? 's' : ''}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
            </div>
          ) : paginatedRentals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500 dark:text-gray-400">
              <Inbox className="h-12 w-12 mb-3 text-gray-300 dark:text-gray-600" />
              <p className="text-lg font-medium">No hay alquileres</p>
              <p className="text-sm mt-1">
                {filterCondominium || filterUnit || filterStatus
                  ? 'No se encontraron registros con los filtros aplicados.'
                  : 'Crea el primer alquiler para empezar.'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-200 dark:border-gray-700">
                      <TableHead className="w-8 px-2" />
                      <TableHead className="text-gray-600 dark:text-gray-400">Alquilado por</TableHead>
                      <TableHead className="text-gray-600 dark:text-gray-400">Unidad</TableHead>
                      <TableHead className="text-gray-600 dark:text-gray-400">Tipo</TableHead>
                      <TableHead className="text-gray-600 dark:text-gray-400">Entrada</TableHead>
                      <TableHead className="text-gray-600 dark:text-gray-400">Salida</TableHead>
                      <TableHead className="text-gray-600 dark:text-gray-400">Duracion</TableHead>
                      <TableHead className="text-gray-600 dark:text-gray-400 text-right">Cobro</TableHead>
                      <TableHead className="text-gray-600 dark:text-gray-400">Estado</TableHead>
                      <TableHead className="text-gray-600 dark:text-gray-400 text-center">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupedRentals.map(([renterUnitId, items]) => {
                      const isMulti = items.length > 1;
                      const renterLabel = items[0].renter_unit?.unit_number ?? getUnitLabel(renterUnitId);

                      return (
                        <ExpandableTableGroup
                          key={renterUnitId}
                          items={items}
                          groupKey={renterUnitId}
                          isExpanded={expandedRenters.has(renterUnitId)}
                          onToggle={() => toggleRenter(renterUnitId)}
                          colCount={10}
                          renderParentCells={() => {
                            if (isMulti) {
                              return (
                                <>
                                  <TableCell className="font-medium text-gray-900 dark:text-gray-100">
                                    {renterLabel}
                                  </TableCell>
                                  <TableCell className="text-gray-600 dark:text-gray-400">
                                    <Badge variant="secondary" className="text-xs">
                                      {items.length} alquileres
                                    </Badge>
                                  </TableCell>
                                  <TableCell />
                                  <TableCell />
                                  <TableCell />
                                  <TableCell />
                                  <TableCell />
                                  <TableCell />
                                  <TableCell />
                                </>
                              );
                            }

                            const rental = items[0];
                            const unitType = rental.unit?.unit_type_id
                              ? unitTypes.find((ut) => ut.id === rental.unit!.unit_type_id)
                              : null;
                            return (
                              <>
                                <TableCell className="font-medium text-gray-900 dark:text-gray-100">
                                  {renterLabel}
                                </TableCell>
                                <TableCell className="text-gray-900 dark:text-gray-100 font-medium">
                                  {rental.unit?.unit_number ?? getUnitLabel(rental.unit_id)}
                                </TableCell>
                                <TableCell className="text-gray-700 dark:text-gray-300">
                                  {unitType?.name || '-'}
                                </TableCell>
                                <TableCell className="text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                  {formatDateTime(rental.start_time)}
                                </TableCell>
                                <TableCell className="text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                  {formatDateTime(rental.end_time)}
                                </TableCell>
                                <TableCell className="text-gray-700 dark:text-gray-300">
                                  {formatMinutes(rental.total_minutes)}
                                </TableCell>
                                <TableCell className="text-gray-700 dark:text-gray-300 text-right font-medium">
                                  {formatCOP(rental.amount)}
                                </TableCell>
                                <TableCell>
                                  {getStatusBadge(rental.status)}
                                </TableCell>
                                <TableCell className="text-center">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => openDetail(rental)}>
                                        <Eye className="h-4 w-4 mr-2" />
                                        Ver detalle
                                      </DropdownMenuItem>
                                      {rental.status === 'completed' && (
                                        <DropdownMenuItem onClick={() => handleDownloadReceipt(rental.id)}>
                                          <FileDown className="h-4 w-4 mr-2" />
                                          Descargar Soporte
                                        </DropdownMenuItem>
                                      )}
                                      {rental.status === 'active' && (
                                        <>
                                          <DropdownMenuItem onClick={() => openCheckout(rental)}>
                                            <LogOut className="h-4 w-4 mr-2" />
                                            Registrar salida
                                          </DropdownMenuItem>
                                          <DropdownMenuItem
                                            onClick={() => openCancel(rental)}
                                            className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                                          >
                                            <XCircle className="h-4 w-4 mr-2" />
                                            Cancelar
                                          </DropdownMenuItem>
                                        </>
                                      )}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                              </>
                            );
                          }}
                          renderChildRow={(rental) => {
                            const unitType = rental.unit?.unit_type_id
                              ? unitTypes.find((ut) => ut.id === rental.unit!.unit_type_id)
                              : null;
                            return (
                              <>
                                <TableCell className="w-8 px-2" />
                                {/* Alquilado por vacío (ya está en padre) */}
                                <TableCell />
                                <TableCell className="text-gray-900 dark:text-gray-100 font-medium">
                                  {rental.unit?.unit_number ?? getUnitLabel(rental.unit_id)}
                                </TableCell>
                                <TableCell className="text-gray-700 dark:text-gray-300">
                                  {unitType?.name || '-'}
                                </TableCell>
                                <TableCell className="text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                  {formatDateTime(rental.start_time)}
                                </TableCell>
                                <TableCell className="text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                  {formatDateTime(rental.end_time)}
                                </TableCell>
                                <TableCell className="text-gray-700 dark:text-gray-300">
                                  {formatMinutes(rental.total_minutes)}
                                </TableCell>
                                <TableCell className="text-gray-700 dark:text-gray-300 text-right font-medium">
                                  {formatCOP(rental.amount)}
                                </TableCell>
                                <TableCell>
                                  {getStatusBadge(rental.status)}
                                </TableCell>
                                <TableCell className="text-center">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => openDetail(rental)}>
                                        <Eye className="h-4 w-4 mr-2" />
                                        Ver detalle
                                      </DropdownMenuItem>
                                      {rental.status === 'completed' && (
                                        <DropdownMenuItem onClick={() => handleDownloadReceipt(rental.id)}>
                                          <FileDown className="h-4 w-4 mr-2" />
                                          Descargar Soporte
                                        </DropdownMenuItem>
                                      )}
                                      {rental.status === 'active' && (
                                        <>
                                          <DropdownMenuItem onClick={() => openCheckout(rental)}>
                                            <LogOut className="h-4 w-4 mr-2" />
                                            Registrar salida
                                          </DropdownMenuItem>
                                          <DropdownMenuItem
                                            onClick={() => openCancel(rental)}
                                            className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                                          >
                                            <XCircle className="h-4 w-4 mr-2" />
                                            Cancelar
                                          </DropdownMenuItem>
                                        </>
                                      )}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                              </>
                            );
                          }}
                        />
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700 mt-4">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Mostrando {(page - 1) * PAGE_SIZE + 1}-
                    {Math.min(page * PAGE_SIZE, totalFiltered)} de {totalFiltered}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-gray-700 dark:text-gray-300 min-w-[80px] text-center">
                      {page} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* ─── Create Dialog ─── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-gray-100">Nuevo Alquiler</DialogTitle>
            <DialogDescription>
              Registra un nuevo alquiler de unidad entre copropietarios.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Copropiedad */}
            <div className="space-y-1.5">
              <Label>Copropiedad *</Label>
              <Select
                searchable
                options={condominiums.map((c) => ({ value: c.id, label: c.name }))}
                value={createForm.condominium_id}
                onChange={(v) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    condominium_id: v,
                    unit_id: '',
                    renter_unit_id: '',
                  }))
                }
                placeholder="Selecciona copropiedad"
              />
            </div>

            {/* Unidad a alquilar (rentable units only) */}
            <div className="space-y-1.5">
              <Label>Unidad a alquilar *</Label>
              <Select
                searchable
                options={rentableUnits.map((u) => ({
                  value: u.id,
                  label: `${u.unit_number}${u.tower ? ` - ${u.tower.name}` : ''}${u.unit_type?.name ? ` (${u.unit_type.name})` : ''}`,
                }))}
                value={createForm.unit_id}
                onChange={(v) => setCreateForm((prev) => ({ ...prev, unit_id: v }))}
                placeholder="Selecciona unidad"
                disabled={!createForm.condominium_id}
              />
              {createForm.condominium_id && rentableUnits.length === 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  No hay unidades de tipo alquilable en esta copropiedad. Configura tipos alquilables en Ajustes.
                </p>
              )}
              {/* Rental config info */}
              {selectedUnitConfig && (
                <div className="flex items-start gap-2 rounded-md border border-cyan-200 dark:border-cyan-800 bg-cyan-50 dark:bg-cyan-950/30 p-2.5">
                  <Info className="h-4 w-4 text-cyan-600 dark:text-cyan-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-cyan-800 dark:text-cyan-300">
                    <strong>{selectedUnitConfig.name}</strong>
                    {' — '}
                    {selectedUnitConfig.freeMinutes} min gratis
                    {selectedUnitConfig.rentalFee != null && (
                      <>, luego {formatCOP(selectedUnitConfig.rentalFee)}
                        {getRentalFeeTypeLabel(selectedUnitConfig.rentalFeeType)}
                      </>
                    )}
                  </p>
                </div>
              )}
            </div>

            {/* Unidad arrendataria */}
            <div className="space-y-1.5">
              <Label>Unidad que alquila *</Label>
              <Select
                searchable
                options={renterUnitOptions.map((u) => ({
                  value: u.id,
                  label: `${u.unit_number}${u.tower ? ` - ${u.tower.name}` : ''}`,
                }))}
                value={createForm.renter_unit_id}
                onChange={(v) => setCreateForm((prev) => ({ ...prev, renter_unit_id: v }))}
                placeholder="Selecciona unidad arrendataria"
                disabled={!createForm.condominium_id}
              />
            </div>

            {/* Fecha/hora de entrada */}
            <div className="space-y-1.5">
              <Label>Hora de entrada *</Label>
              <div className="flex gap-2 items-center">
                <div className="flex-1">
                  <DatePicker
                    value={createForm.start_date}
                    onChange={(v) => setCreateForm((prev) => ({ ...prev, start_date: v }))}
                    placeholder="Fecha"
                    usePortal
                  />
                </div>
                <div className="w-[72px]">
                  <Select
                    options={HOUR_OPTIONS}
                    value={createForm.start_hour}
                    onChange={(v) => setCreateForm((prev) => ({ ...prev, start_hour: v }))}
                    placeholder="HH"
                  />
                </div>
                <span className="text-gray-500 dark:text-gray-400 font-bold">:</span>
                <div className="w-[72px]">
                  <Select
                    options={MINUTE_OPTIONS}
                    value={createForm.start_minute}
                    onChange={(v) => setCreateForm((prev) => ({ ...prev, start_minute: v }))}
                    placeholder="MM"
                  />
                </div>
              </div>
            </div>

            {/* Fecha/hora de salida (opcional) */}
            <div className="space-y-1.5">
              <Label>Hora de salida <span className="text-gray-400 font-normal">(opcional)</span></Label>
              <div className="flex gap-2 items-center">
                <div className="flex-1">
                  <DatePicker
                    value={createForm.end_date}
                    onChange={(v) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        end_date: v,
                        end_hour: v && !prev.end_hour ? nowHour() : prev.end_hour,
                        end_minute: v && !prev.end_minute ? nowMinute() : prev.end_minute,
                      }))
                    }
                    placeholder="Fecha"
                    clearable
                    minDate={createForm.start_date || undefined}
                    usePortal
                  />
                </div>
                <div className="w-[72px]">
                  <Select
                    options={HOUR_OPTIONS}
                    value={createForm.end_hour}
                    onChange={(v) => setCreateForm((prev) => ({ ...prev, end_hour: v }))}
                    placeholder="HH"
                    disabled={!createForm.end_date}
                  />
                </div>
                <span className="text-gray-500 dark:text-gray-400 font-bold">:</span>
                <div className="w-[72px]">
                  <Select
                    options={MINUTE_OPTIONS}
                    value={createForm.end_minute}
                    onChange={(v) => setCreateForm((prev) => ({ ...prev, end_minute: v }))}
                    placeholder="MM"
                    disabled={!createForm.end_date}
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Deja vacio si aun no conoces la hora de salida. Podras registrarla despues con &quot;Registrar salida&quot;.
              </p>
            </div>

            {/* Notas */}
            <div className="space-y-1.5">
              <Label>Notas</Label>
              <Textarea
                value={createForm.notes}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Notas opcionales..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={creating || !canCreate}>
              {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Crear Alquiler
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Detail Dialog ─── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-gray-100">Detalle del Alquiler</DialogTitle>
            <DialogDescription>
              Informacion completa del alquiler seleccionado.
            </DialogDescription>
          </DialogHeader>
          {detailRental && (
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500 dark:text-gray-400 block">Unidad</span>
                  <span className="text-gray-900 dark:text-gray-100 font-medium">
                    {detailRental.unit?.unit_number ?? getUnitLabel(detailRental.unit_id)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400 block">Alquilado por</span>
                  <span className="text-gray-900 dark:text-gray-100 font-medium">
                    {detailRental.renter_unit?.unit_number ?? getUnitLabel(detailRental.renter_unit_id)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400 block">Copropiedad</span>
                  <span className="text-gray-900 dark:text-gray-100 font-medium">
                    {detailRental.condominium?.name ?? getCondominiumName(detailRental.condominium_id)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400 block">Estado</span>
                  {getStatusBadge(detailRental.status)}
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400 block">Entrada</span>
                  <span className="text-gray-900 dark:text-gray-100">
                    {formatDateTime(detailRental.start_time)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400 block">Salida</span>
                  <span className="text-gray-900 dark:text-gray-100">
                    {formatDateTime(detailRental.end_time)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400 block">Duracion Total</span>
                  <span className="text-gray-900 dark:text-gray-100">
                    {formatMinutes(detailRental.total_minutes)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400 block">Min. Facturables</span>
                  <span className="text-gray-900 dark:text-gray-100">
                    {formatMinutes(detailRental.billable_minutes)}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500 dark:text-gray-400 block">Monto</span>
                  <span className="text-gray-900 dark:text-gray-100 font-semibold text-lg">
                    {formatCOP(detailRental.amount)}
                  </span>
                </div>
                {detailRental.notes && (
                  <div className="col-span-2">
                    <span className="text-gray-500 dark:text-gray-400 block">Notas</span>
                    <span className="text-gray-900 dark:text-gray-100">{detailRental.notes}</span>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            {detailRental?.status === 'completed' && (
              <Button
                variant="outline"
                onClick={() => detailRental && handleDownloadReceipt(detailRental.id)}
              >
                <FileDown className="h-4 w-4 mr-2" />
                Descargar Soporte
              </Button>
            )}
            <Button variant="outline" onClick={() => setDetailOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Checkout Confirmation ─── */}
      <AlertDialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Registrar Salida</AlertDialogTitle>
            <AlertDialogDescription>
              Se registrara la salida de la unidad{' '}
              <strong>
                {checkoutTarget?.unit?.unit_number ?? getUnitLabel(checkoutTarget?.unit_id)}
              </strong>
              . Se calcularan los minutos y el monto a cobrar. Esta accion no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={checkoutLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleCheckout} disabled={checkoutLoading}>
              {checkoutLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmar Salida
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Cancel Confirmation ─── */}
      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar Alquiler</AlertDialogTitle>
            <AlertDialogDescription>
              Se cancelara el alquiler de la unidad{' '}
              <strong>
                {cancelTarget?.unit?.unit_number ?? getUnitLabel(cancelTarget?.unit_id)}
              </strong>
              . Esta accion no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelLoading}>Volver</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={cancelLoading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {cancelLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Si, Cancelar Alquiler
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
