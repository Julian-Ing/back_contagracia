'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  Check,
  ChevronsUpDown,
  History,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Badge } from '@/shared/components/ui/badge';
import { Textarea } from '@/shared/components/ui/textarea';
import { Switch } from '@/shared/components/ui/switch';
import { Select } from '@/shared/components/ui/select';
import { ThirdPartySelect } from '@/shared/components/ui/third-party-select';
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';

import { useAuthStore } from '@/modules/auth';
import { usePermissions } from '@/shared/hooks/usePermissions';
import { useResidents, useCondominiums, towersService, unitsService, delinquentService } from '@/modules/ph';
import type { PhResident, PhTower, PhUnit } from '@/modules/ph';
import { companyClient } from '@/shared/services/api/apiClient';
import { residentsService } from '@/modules/ph/services/ph.service';
import toast from 'react-hot-toast';

const PAGE_SIZE = 20;

const residentTypeOptions = [
  { value: '', label: 'Todos los tipos' },
  { value: 'owner', label: 'Propietario' },
  { value: 'tenant', label: 'Arrendatario' },
];

const residentTypeFormOptions = [
  { value: 'owner', label: 'Propietario' },
  { value: 'tenant', label: 'Arrendatario' },
];

function formatDate(dateString?: string | null) {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

const emptyForm = {
  unit_id: '',
  tercero_id: '',
  resident_type: 'owner' as 'owner' | 'tenant',
  is_primary: false,
  move_in_date: new Date().toISOString().split('T')[0],
  notes: '',
};

export default function ResidentsPage() {
  const companyId = useAuthStore((s) => s.company?.id);
  const { can } = usePermissions();
  const canManage = can('ph.residents.create');
  const { residents, total, loading, error, fetchResidents, createResident, updateResident, removeResident } =
    useResidents();
  const { condominiums } = useCondominiums();

  // ── Filters ──
  const [filterCondominiumId, setFilterCondominiumId] = useState('');
  const [filterUnitId, setFilterUnitId] = useState('');
  const [filterResidentType, setFilterResidentType] = useState('');

  // ── Filter units (loaded based on filter copropiedad) ──
  const [filterUnits, setFilterUnits] = useState<PhUnit[]>([]);

  // ── Pagination ──
  const [currentPage, setCurrentPage] = useState(1);

  // ── Dialogs ──
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [selectedResident, setSelectedResident] = useState<PhResident | null>(null);
  const [formData, setFormData] = useState({ ...emptyForm });
  const [submitting, setSubmitting] = useState(false);

  // ── Form-specific filtering (copropiedad → torre → unidad) ──
  const [formCondominiumId, setFormCondominiumId] = useState('');
  const [formTowerId, setFormTowerId] = useState('');
  const [formTowers, setFormTowers] = useState<PhTower[]>([]);
  const [formUnits, setFormUnits] = useState<PhUnit[]>([]);

  // ── Tercero name lookup for table ──
  const [terceroMap, setTerceroMap] = useState<Map<string, { name: string; identification_number: string }>>(
    new Map(),
  );

  // ── Delinquent units (morosos) ──
  const [delinquentUnitIds, setDelinquentUnitIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!companyId) return;
    delinquentService.getDelinquentUnits(companyId)
      .then((res) => setDelinquentUnitIds(new Set(res.unit_ids)))
      .catch(() => setDelinquentUnitIds(new Set()));
  }, [companyId]);

  // ── Agrupación por tercero (padre-hijo) ──
  const [expandedTerceros, setExpandedTerceros] = useState<Set<string>>(new Set());

  const toggleTercero = useCallback((terceroId: string) => {
    setExpandedTerceros((prev) => {
      const next = new Set(prev);
      if (next.has(terceroId)) next.delete(terceroId);
      else next.add(terceroId);
      return next;
    });
  }, []);

  const groupedResidents = useMemo(() => {
    const map = new Map<string, PhResident[]>();
    for (const r of residents) {
      const key = r.tercero_id;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return Array.from(map.entries()); // [terceroId, residents[]]
  }, [residents]);

  // Limpiar expandidos al cambiar de página
  useEffect(() => {
    setExpandedTerceros(new Set());
  }, [currentPage]);

  // ── Load filter units when copropiedad filter changes ──
  useEffect(() => {
    if (!companyId) return;
    const params: Record<string, unknown> = {};
    if (filterCondominiumId) params.condominium_id = filterCondominiumId;
    unitsService
      .getAll(companyId, params)
      .then((res: any) => setFilterUnits(Array.isArray(res) ? res : res.data ?? []))
      .catch(() => setFilterUnits([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterCondominiumId, companyId]);

  // ── Refetch residents on filter changes ──
  useEffect(() => {
    const params: Record<string, unknown> = {};
    if (filterCondominiumId) params.condominium_id = filterCondominiumId;
    if (filterUnitId) params.unit_id = filterUnitId;
    if (filterResidentType) params.resident_type = filterResidentType;
    params.skip = (currentPage - 1) * PAGE_SIZE;
    params.take = PAGE_SIZE;
    fetchResidents(params);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterCondominiumId, filterUnitId, filterResidentType, currentPage]);

  // ── Load tercero names for table display ──
  useEffect(() => {
    if (residents.length === 0) return;
    companyClient
      .get('/third-parties', { params: { limit: '500', is_active: 'true' } })
      .then((res) => {
        const map = new Map<string, { name: string; identification_number: string }>();
        (res.data?.data || []).forEach((tp: any) => {
          map.set(tp.id, {
            name: tp.name || `${tp.first_name || ''} ${tp.first_surname || ''}`.trim(),
            identification_number: tp.identification_number || '',
          });
        });
        setTerceroMap(map);
      })
      .catch(console.error);
  }, [residents]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // ── Select options (filters) ──
  const condominiumOptions = useMemo(
    () => [
      { value: '', label: 'Todas las copropiedades' },
      ...condominiums.map((c) => ({ value: c.id, label: c.name })),
    ],
    [condominiums],
  );

  const unitFilterOptions = useMemo(
    () => [
      { value: '', label: 'Todas las unidades' },
      ...filterUnits.map((u) => ({
        value: u.id,
        label: `${u.unit_number}${u.tower?.name ? ` - ${u.tower.name}` : ''}${u.condominium?.name ? ` (${u.condominium.name})` : ''}`,
      })),
    ],
    [filterUnits],
  );

  // ── Select options (form) ──
  const formCondominiumOptions = useMemo(
    () => condominiums.map((c) => ({ value: c.id, label: c.name })),
    [condominiums],
  );

  const formTowerOptions = useMemo(
    () => [
      { value: '', label: 'Todas las torres' },
      ...formTowers.map((t) => ({ value: t.id, label: t.name })),
    ],
    [formTowers],
  );

  const formUnitOptions = useMemo(
    () =>
      formUnits.map((u) => ({
        value: u.id,
        label: `${u.unit_number}${u.tower?.name ? ` - ${u.tower.name}` : ''}`,
      })),
    [formUnits],
  );

  // ── Tercero label helper ──
  const terceroLabel = useCallback(
    (id: string) => {
      const t = terceroMap.get(id);
      return t ? `${t.identification_number} - ${t.name}` : undefined;
    },
    [terceroMap],
  );

  // ── Form copropiedad/tower change handlers ──
  const handleFormCondominiumChange = useCallback(
    async (condId: string) => {
      setFormCondominiumId(condId);
      setFormTowerId('');
      setFormData((prev) => ({ ...prev, unit_id: '' }));
      if (!condId || !companyId) {
        setFormTowers([]);
        setFormUnits([]);
        return;
      }
      try {
        const [towersRes, unitsRes] = await Promise.all([
          towersService.getAll(companyId, condId),
          unitsService.getAll(companyId, { condominium_id: condId }),
        ]);
        setFormTowers(Array.isArray(towersRes) ? towersRes : (towersRes as any).data ?? []);
        setFormUnits(Array.isArray(unitsRes) ? unitsRes : (unitsRes as any).data ?? []);
      } catch {
        setFormTowers([]);
        setFormUnits([]);
      }
    },
    [companyId],
  );

  const handleFormTowerChange = useCallback(
    async (towerId: string) => {
      setFormTowerId(towerId);
      setFormData((prev) => ({ ...prev, unit_id: '' }));
      if (!companyId || !formCondominiumId) return;
      const params: Record<string, unknown> = { condominium_id: formCondominiumId };
      if (towerId) params.tower_id = towerId;
      try {
        const res = await unitsService.getAll(companyId, params);
        setFormUnits(Array.isArray(res) ? res : (res as any).data ?? []);
      } catch {
        setFormUnits([]);
      }
    },
    [companyId, formCondominiumId],
  );

  // ── Handlers ──
  const resetForm = () => setFormData({ ...emptyForm });

  const handleOpenCreate = useCallback(async () => {
    setFormData({ ...emptyForm });
    setSelectedResident(null);
    const defaultCond = condominiums.length > 0 ? condominiums[0].id : '';
    setFormCondominiumId(defaultCond);
    setFormTowerId('');
    if (defaultCond && companyId) {
      try {
        const [towersRes, unitsRes] = await Promise.all([
          towersService.getAll(companyId, defaultCond),
          unitsService.getAll(companyId, { condominium_id: defaultCond }),
        ]);
        setFormTowers(Array.isArray(towersRes) ? towersRes : (towersRes as any).data ?? []);
        setFormUnits(Array.isArray(unitsRes) ? unitsRes : (unitsRes as any).data ?? []);
      } catch {
        setFormTowers([]);
        setFormUnits([]);
      }
    } else {
      setFormTowers([]);
      setFormUnits([]);
    }
    setIsCreateOpen(true);
  }, [companyId, condominiums]);

  const handleOpenEdit = useCallback(
    async (resident: PhResident) => {
      setSelectedResident(resident);
      const condId = resident.unit?.condominium_id || '';
      setFormCondominiumId(condId);
      setFormTowerId('');
      if (condId && companyId) {
        try {
          const [towersRes, unitsRes] = await Promise.all([
            towersService.getAll(companyId, condId),
            unitsService.getAll(companyId, { condominium_id: condId }),
          ]);
          setFormTowers(Array.isArray(towersRes) ? towersRes : (towersRes as any).data ?? []);
          setFormUnits(Array.isArray(unitsRes) ? unitsRes : (unitsRes as any).data ?? []);
        } catch {
          setFormTowers([]);
          setFormUnits([]);
        }
      } else {
        setFormTowers([]);
        setFormUnits([]);
      }
      setFormData({
        unit_id: resident.unit_id || '',
        tercero_id: resident.tercero_id || '',
        resident_type: resident.resident_type,
        is_primary: resident.is_primary,
        move_in_date: resident.move_in_date ? resident.move_in_date.split('T')[0] : '',
        notes: resident.notes || '',
      });
      setIsEditOpen(true);
    },
    [companyId],
  );

  const handleOpenDelete = (resident: PhResident) => {
    setSelectedResident(resident);
    setIsDeleteOpen(true);
  };

  const handleOpenHistory = async (resident: PhResident) => {
    if (!companyId) return;
    setSelectedResident(resident);
    setIsHistoryOpen(true);
    setHistoryLoading(true);
    try {
      const data = await residentsService.getHistory(companyId, resident.id);
      setHistoryData(data);
    } catch {
      toast.error('Error al cargar historial');
      setHistoryData([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const buildPayload = () => {
    const payload: Record<string, unknown> = {
      unit_id: formData.unit_id,
      tercero_id: formData.tercero_id,
      resident_type: formData.resident_type,
      is_primary: formData.is_primary,
    };
    if (formData.move_in_date) payload.move_in_date = formData.move_in_date;
    else payload.move_in_date = null;
    if (formData.notes) payload.notes = formData.notes;
    else payload.notes = null;
    return payload;
  };

  // Ensure tercero has the appropriate role (CO_OWNER / TENANT) without duplicating
  const ensureTerceroRole = async (terceroId: string, residentType: 'owner' | 'tenant') => {
    const role = residentType === 'owner' ? 'CO_OWNER' : 'TENANT';
    try {
      const res = await companyClient.get(`/third-parties/${terceroId}`);
      const tercero = res.data;
      const currentRoles: string[] = tercero?.roles || [];
      if (!currentRoles.includes(role)) {
        await companyClient.put(`/third-parties/${terceroId}`, {
          name: tercero.name,
          roles: [...currentRoles, role],
        });
      }
    } catch (err: any) {
      console.error('Error ensuring tercero role:', err?.response?.data || err);
    }
  };

  const handleCreate = async () => {
    try {
      setSubmitting(true);
      await createResident(buildPayload());
      await ensureTerceroRole(formData.tercero_id, formData.resident_type);
      setIsCreateOpen(false);
      resetForm();
    } catch {
      // toast handled by hook
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedResident) return;
    try {
      setSubmitting(true);
      await updateResident(selectedResident.id, buildPayload());
      await ensureTerceroRole(formData.tercero_id, formData.resident_type);
      setIsEditOpen(false);
      setSelectedResident(null);
      resetForm();
    } catch {
      // toast handled by hook
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedResident) return;
    try {
      setSubmitting(true);
      await removeResident(selectedResident.id);
      setIsDeleteOpen(false);
      setSelectedResident(null);
    } catch {
      // toast handled by hook
    } finally {
      setSubmitting(false);
    }
  };

  // ── Shared form fields (used in create & edit dialogs) ──
  const renderFormFields = () => (
    <div className="space-y-4 py-4">
      {/* Copropiedad */}
      <div className="space-y-2">
        <Label>Copropiedad</Label>
        <Select
          options={formCondominiumOptions}
          value={formCondominiumId}
          onChange={handleFormCondominiumChange}
          placeholder="Seleccionar copropiedad"
          searchable
        />
      </div>

      {/* Torre/Bloque (solo si hay torres) */}
      {formTowers.length > 0 && (
        <div className="space-y-2">
          <Label>Torre/Bloque</Label>
          <Select
            options={formTowerOptions}
            value={formTowerId}
            onChange={handleFormTowerChange}
            placeholder="Todas las torres"
            searchable
          />
        </div>
      )}

      {/* Unidad */}
      <div className="space-y-2">
        <Label>Unidad *</Label>
        <Select
          options={formUnitOptions}
          value={formData.unit_id}
          onChange={(val) => setFormData({ ...formData, unit_id: val })}
          placeholder="Seleccionar unidad"
          searchable
          disabled={!formCondominiumId}
        />
      </div>

      {/* Copropietario/Arrendatario (ThirdPartySelect) */}
      <div className="space-y-2">
        <Label>Copropietario/Arrendatario *</Label>
        <ThirdPartySelect
          value={formData.tercero_id}
          valueLabel={terceroLabel(formData.tercero_id)}
          onChange={(id) => setFormData({ ...formData, tercero_id: id })}
          placeholder="Seleccionar copropietario/arrendatario..."
        />
      </div>

      {/* Tipo de Residente + Fecha de Ingreso */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Tipo de Residente</Label>
          <Select
            options={residentTypeFormOptions}
            value={formData.resident_type}
            onChange={(val) => setFormData({ ...formData, resident_type: val as 'owner' | 'tenant' })}
            placeholder="Seleccionar tipo"
          />
        </div>
        <div className="space-y-2">
          <Label>Fecha de Ingreso</Label>
          <DatePicker
            value={formData.move_in_date}
            onChange={(val) => setFormData({ ...formData, move_in_date: val })}
            placeholder="Seleccionar fecha"
            usePortal
          />
        </div>
      </div>

      {/* Responsable principal de pagos */}
      <div className="flex items-center gap-3">
        <Switch
          checked={formData.is_primary}
          onCheckedChange={(checked) => setFormData({ ...formData, is_primary: checked })}
        />
        <Label>Responsable principal de pagos</Label>
      </div>

      {/* Notas */}
      <div className="space-y-2">
        <Label>Notas</Label>
        <Textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Observaciones..."
          rows={2}
        />
      </div>
    </div>
  );

  // ── Loading ──
  if (loading && residents.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto" />
          <p className="text-gray-500 dark:text-slate-400">Cargando residentes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-7 w-7 text-blue-600 dark:text-blue-400" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {canManage ? 'Residentes' : 'Vecinos'}
            </h1>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              {canManage ? 'Gestiona los copropietarios y arrendatarios de las unidades' : 'Residentes de tu copropiedad'}
            </p>
          </div>
        </div>
        {canManage && (
          <Button onClick={handleOpenCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Residente
          </Button>
        )}
      </div>

      {/* ── Filters (admin only) ── */}
      {canManage && (
      <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select
              options={condominiumOptions}
              value={filterCondominiumId}
              onChange={(val) => {
                setFilterCondominiumId(val);
                setFilterUnitId('');
                setCurrentPage(1);
              }}
              placeholder="Todas las copropiedades"
              searchable
            />
            <Select
              options={unitFilterOptions}
              value={filterUnitId}
              onChange={(val) => {
                setFilterUnitId(val);
                setCurrentPage(1);
              }}
              placeholder="Todas las unidades"
              searchable
            />
            <Select
              options={residentTypeOptions}
              value={filterResidentType}
              onChange={(val) => {
                setFilterResidentType(val);
                setCurrentPage(1);
              }}
              placeholder="Todos los tipos"
            />
          </div>
        </CardContent>
      </Card>
      )}

      {/* ── Error ── */}
      {error && (
        <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <CardContent className="p-4 text-red-600 dark:text-red-400">{error}</CardContent>
        </Card>
      )}

      {/* ── Table ── */}
      <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white flex items-center justify-between">
            <span>{canManage ? 'Lista de Residentes' : 'Vecinos'}</span>
            <div className="flex items-center gap-2">
              {groupedResidents.some(([, items]) => items.length > 1) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-gray-500 dark:text-slate-400"
                  onClick={() => {
                    const multiGroups = groupedResidents
                      .filter(([, items]) => items.length > 1)
                      .map(([id]) => id);
                    const allExpanded = multiGroups.every((id) => expandedTerceros.has(id));
                    setExpandedTerceros(allExpanded ? new Set() : new Set(multiGroups));
                  }}
                >
                  <ChevronsUpDown className="h-3.5 w-3.5 mr-1" />
                  {groupedResidents
                    .filter(([, items]) => items.length > 1)
                    .every(([id]) => expandedTerceros.has(id))
                    ? 'Colapsar todo'
                    : 'Expandir todo'}
                </Button>
              )}
              <Badge variant="secondary">{total} {canManage ? 'residentes' : 'vecinos'}</Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-200 dark:border-slate-700">
                  <TableHead className="w-8 px-2" />
                  <TableHead className="text-gray-600 dark:text-slate-300">{canManage ? 'Copropietario' : 'Vecino'}</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300">Unidad</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300">Copropiedad</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300">Tipo</TableHead>
                  {canManage && <TableHead className="text-gray-600 dark:text-slate-300">Principal</TableHead>}
                  {canManage && <TableHead className="text-gray-600 dark:text-slate-300">Fecha Ingreso</TableHead>}
                  {canManage && <TableHead className="text-gray-600 dark:text-slate-300">Estado</TableHead>}
                  {canManage && <TableHead className="text-gray-600 dark:text-slate-300 text-right">Acciones</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {residents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canManage ? 9 : 5} className="text-center py-12">
                      <div className="flex flex-col items-center gap-3">
                        <UserCheck className="h-12 w-12 text-gray-300 dark:text-slate-600" />
                        <p className="text-gray-500 dark:text-slate-400 text-lg font-medium">
                          {canManage ? 'No se encontraron residentes' : 'No se encontraron vecinos'}
                        </p>
                        <p className="text-gray-400 dark:text-slate-500 text-sm">
                          {canManage ? 'Asigna un nuevo residente o ajusta los filtros' : 'No hay vecinos registrados en tu copropiedad'}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  groupedResidents.map(([terceroId, items]) => {
                    const tercero = terceroMap.get(terceroId);
                    const isMulti = items.length > 1;

                    return (
                      <ExpandableTableGroup
                        key={terceroId}
                        items={items}
                        groupKey={terceroId}
                        isExpanded={expandedTerceros.has(terceroId)}
                        onToggle={() => toggleTercero(terceroId)}
                        colCount={canManage ? 9 : 5}
                        renderParentCells={() => (
                          <>
                            {/* Copropietario */}
                            <TableCell className="font-medium text-gray-900 dark:text-white">
                              {tercero ? (
                                <div>
                                  <p className="font-medium">{tercero.name}</p>
                                  {canManage && (
                                    <p className="text-xs text-gray-500 dark:text-slate-400">
                                      {tercero.identification_number}
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-400 dark:text-slate-500 text-xs font-mono">
                                  {canManage ? `${terceroId.slice(0, 12)}...` : '—'}
                                </span>
                              )}
                            </TableCell>

                            {isMulti ? (
                              <>
                                {/* Multi-unidad: badge con cantidad */}
                                <TableCell className="text-gray-600 dark:text-slate-400">
                                  <Badge variant="secondary" className="text-xs">
                                    {items.length} unidades
                                  </Badge>
                                </TableCell>
                                <TableCell />
                                <TableCell />
                                {canManage && <TableCell />}
                                {canManage && <TableCell />}
                                {canManage && <TableCell />}
                                {canManage && <TableCell />}
                              </>
                            ) : (
                              <>
                                {/* Single-unidad: datos inline */}
                                <TableCell className="text-gray-600 dark:text-slate-400">
                                  {items[0].unit?.unit_number || '-'}
                                </TableCell>
                                <TableCell className="text-gray-600 dark:text-slate-400">
                                  {items[0].unit?.condominium?.name || '-'}
                                </TableCell>
                                <TableCell>
                                  {items[0].resident_type === 'owner' ? (
                                    <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                      Propietario
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                                      Arrendatario
                                    </Badge>
                                  )}
                                </TableCell>
                                {canManage && (
                                  <TableCell>
                                    {items[0].is_primary ? (
                                      <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                        <Check className="h-3 w-3 mr-1" />
                                        Si
                                      </Badge>
                                    ) : (
                                      <span className="text-gray-400 dark:text-slate-500">No</span>
                                    )}
                                  </TableCell>
                                )}
                                {canManage && (
                                  <TableCell className="text-gray-600 dark:text-slate-400">
                                    {formatDate(items[0].move_in_date)}
                                  </TableCell>
                                )}
                                {canManage && (
                                  <TableCell>
                                    <div className="flex items-center gap-1.5">
                                      {items[0].is_active ? (
                                        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                          Activo
                                        </Badge>
                                      ) : (
                                        <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                          Inactivo
                                        </Badge>
                                      )}
                                      {items[0].unit_id && delinquentUnitIds.has(items[0].unit_id) && (
                                        <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                          Moroso
                                        </Badge>
                                      )}
                                    </div>
                                  </TableCell>
                                )}
                                {canManage && (
                                  <TableCell className="text-right">
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                                          <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => handleOpenHistory(items[0])}>
                                          <History className="h-4 w-4 mr-2" />
                                          Historial
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleOpenEdit(items[0])}>
                                          <Pencil className="h-4 w-4 mr-2" />
                                          Editar
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onClick={() => handleOpenDelete(items[0])}
                                          className="text-red-600 dark:text-red-400"
                                        >
                                          <Trash2 className="h-4 w-4 mr-2" />
                                          Eliminar
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </TableCell>
                                )}
                              </>
                            )}
                          </>
                        )}
                        renderChildRow={(resident) => (
                          <>
                            {/* Celda vacía para chevron */}
                            <TableCell className="w-8 px-2" />
                            {/* Nombre vacío (ya está en padre) */}
                            <TableCell />
                            <TableCell className="text-gray-600 dark:text-slate-400">
                              {resident.unit?.unit_number || '-'}
                            </TableCell>
                            <TableCell className="text-gray-600 dark:text-slate-400">
                              {resident.unit?.condominium?.name || '-'}
                            </TableCell>
                            <TableCell>
                              {resident.resident_type === 'owner' ? (
                                <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                  Propietario
                                </Badge>
                              ) : (
                                <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                                  Arrendatario
                                </Badge>
                              )}
                            </TableCell>
                            {canManage && (
                              <TableCell>
                                {resident.is_primary ? (
                                  <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                    <Check className="h-3 w-3 mr-1" />
                                    Si
                                  </Badge>
                                ) : (
                                  <span className="text-gray-400 dark:text-slate-500">No</span>
                                )}
                              </TableCell>
                            )}
                            {canManage && (
                              <TableCell className="text-gray-600 dark:text-slate-400">
                                {formatDate(resident.move_in_date)}
                              </TableCell>
                            )}
                            {canManage && (
                              <TableCell>
                                <div className="flex items-center gap-1.5">
                                  {resident.is_active ? (
                                    <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                      Activo
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                      Inactivo
                                    </Badge>
                                  )}
                                  {resident.unit_id && delinquentUnitIds.has(resident.unit_id) && (
                                    <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                      Moroso
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                            )}
                            {canManage && (
                              <TableCell className="text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleOpenHistory(resident)}>
                                      <History className="h-4 w-4 mr-2" />
                                      Historial
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleOpenEdit(resident)}>
                                      <Pencil className="h-4 w-4 mr-2" />
                                      Editar
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => handleOpenDelete(resident)}
                                      className="text-red-600 dark:text-red-400"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Eliminar
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            )}
                          </>
                        )}
                      />
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Pagina {currentPage} de {totalPages} ({total} residentes)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Siguiente
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Create Dialog ── */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuevo Residente</DialogTitle>
            <DialogDescription>Asigna un copropietario o arrendatario a una unidad</DialogDescription>
          </DialogHeader>
          {renderFormFields()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={submitting || !formData.unit_id || !formData.tercero_id}>
              {submitting ? 'Asignando...' : 'Asignar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Dialog ── */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Residente</DialogTitle>
            <DialogDescription>Modifica los datos del residente</DialogDescription>
          </DialogHeader>
          {renderFormFields()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdate} disabled={submitting || !formData.unit_id || !formData.tercero_id}>
              {submitting ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Dialog ── */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Residente</DialogTitle>
          </DialogHeader>
          <p className="text-gray-600 dark:text-slate-400">
            ¿Estas seguro de que deseas eliminar este residente?
            {selectedResident && terceroMap.get(selectedResident.tercero_id) && (
              <>
                {' '}
                Tercero: <strong>{terceroMap.get(selectedResident.tercero_id)?.name}</strong>,
              </>
            )}
            {selectedResident && (
              <>
                {' '}
                Unidad: <strong>{selectedResident.unit?.unit_number || selectedResident.unit_id}</strong>
              </>
            )}
          </p>
          <p className="text-sm text-gray-500 dark:text-slate-500">Esta accion no se puede deshacer.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
              {submitting ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── History Dialog ── */}
      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Historial — {selectedResident?.unit?.unit_number || 'Residente'}
            </DialogTitle>
          </DialogHeader>
          {historyLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
            </div>
          ) : historyData.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-slate-400 py-8">
              No hay cambios registrados para este residente.
            </p>
          ) : (
            <div className="space-y-3 py-2">
              {historyData.map((entry: any) => {
                const actionKey = entry.action_key;

                const badgeConfig: Record<string, { label: string; className: string }> = {
                  'unit.resident_added': {
                    label: 'Residente agregado',
                    className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
                  },
                  'unit.resident_type_changed': {
                    label: 'Cambio tipo residente',
                    className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                  },
                  'unit.resident_removed': {
                    label: 'Residente eliminado',
                    className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                  },
                  'unit.owner_changed': {
                    label: 'Cambio de copropietario',
                    className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
                  },
                  'unit.resident_unit_changed': {
                    label: 'Cambio de unidad',
                    className: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
                  },
                  'unit.resident_condominium_changed': {
                    label: 'Cambio de copropiedad',
                    className: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
                  },
                  'unit.resident_tower_changed': {
                    label: 'Cambio de torre',
                    className: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
                  },
                };

                const badge = badgeConfig[actionKey] || {
                  label: 'Cambio',
                  className: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
                };

                const renderContent = () => {
                  if (actionKey === 'unit.resident_added') {
                    const name = entry.new_values?.resident_name ?? '';
                    const type = entry.new_values?.resident_type ?? '';
                    return (
                      <div className="text-sm">
                        <span className="font-medium text-gray-900 dark:text-white">{name}</span>
                        {type && (
                          <span className="text-gray-500 dark:text-slate-400"> — {type}</span>
                        )}
                      </div>
                    );
                  }
                  if (actionKey === 'unit.resident_type_changed') {
                    const name = entry.old_values?.resident_name ?? '';
                    const oldType = entry.old_values?.resident_type ?? '';
                    const newType = entry.new_values?.resident_type ?? '';
                    return (
                      <div className="text-sm">
                        <span className="font-medium text-gray-900 dark:text-white">{name}: </span>
                        <span className="text-red-500 line-through">{oldType}</span>
                        {' '}
                        <span className="text-gray-400 dark:text-slate-500">&rarr;</span>
                        {' '}
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">{newType}</span>
                      </div>
                    );
                  }
                  if (actionKey === 'unit.resident_removed') {
                    const name = entry.old_values?.resident_name ?? '';
                    const type = entry.old_values?.resident_type ?? '';
                    return (
                      <div className="text-sm">
                        <span className="font-medium text-gray-900 dark:text-white">{name}</span>
                        {type && (
                          <span className="text-gray-500 dark:text-slate-400"> — {type}</span>
                        )}
                      </div>
                    );
                  }
                  if (actionKey === 'unit.owner_changed') {
                    const oldOwner = entry.old_values?.owner_name ?? '';
                    const newOwner = entry.new_values?.owner_name ?? '';
                    return (
                      <div className="text-sm">
                        <span className="text-red-500 line-through">{oldOwner}</span>
                        {' '}
                        <span className="text-gray-400 dark:text-slate-500">&rarr;</span>
                        {' '}
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">{newOwner}</span>
                      </div>
                    );
                  }
                  if (actionKey === 'unit.resident_unit_changed') {
                    const oldUnit = entry.old_values?.unit_name ?? '';
                    const newUnit = entry.new_values?.unit_name ?? '';
                    return (
                      <div className="text-sm">
                        <span className="text-red-500 line-through">{oldUnit}</span>
                        {' '}
                        <span className="text-gray-400 dark:text-slate-500">&rarr;</span>
                        {' '}
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">{newUnit}</span>
                      </div>
                    );
                  }
                  if (actionKey === 'unit.resident_condominium_changed') {
                    const oldCondo = entry.old_values?.condominium_name ?? '';
                    const newCondo = entry.new_values?.condominium_name ?? '';
                    return (
                      <div className="text-sm">
                        <span className="text-red-500 line-through">{oldCondo}</span>
                        {' '}
                        <span className="text-gray-400 dark:text-slate-500">&rarr;</span>
                        {' '}
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">{newCondo}</span>
                      </div>
                    );
                  }
                  if (actionKey === 'unit.resident_tower_changed') {
                    const oldTower = entry.old_values?.tower_name ?? '';
                    const newTower = entry.new_values?.tower_name ?? '';
                    return (
                      <div className="text-sm">
                        <span className="text-red-500 line-through">{oldTower}</span>
                        {' '}
                        <span className="text-gray-400 dark:text-slate-500">&rarr;</span>
                        {' '}
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">{newTower}</span>
                      </div>
                    );
                  }
                  return null;
                };

                return (
                  <div
                    key={entry.id}
                    className="border border-gray-200 dark:border-slate-700 rounded-lg p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <Badge className={badge.className}>
                        {badge.label}
                      </Badge>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 dark:text-slate-400">
                          {new Date(entry.performed_at).toLocaleString('es-CO', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {canManage && (
                          <button
                            type="button"
                            className="text-gray-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 transition-colors"
                            title="Eliminar registro"
                            onClick={async () => {
                              if (!companyId || !selectedResident) return;
                              try {
                                await residentsService.deleteHistory(companyId, selectedResident.id, entry.id);
                                setHistoryData((prev) => prev.filter((e: any) => e.id !== entry.id));
                                toast.success('Registro eliminado');
                              } catch {
                                toast.error('Error al eliminar registro');
                              }
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {entry.email && (
                      <p className="text-xs text-gray-500 dark:text-slate-400">
                        Por: {entry.email}
                      </p>
                    )}

                    {renderContent()}
                  </div>
                );
              })}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsHistoryOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
