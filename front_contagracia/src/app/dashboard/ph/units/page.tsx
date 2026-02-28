'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Building2,
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Eye,
  Trash2,
  Home,
  ChevronLeft,
  ChevronRight,
  FileText,
  History,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Badge } from '@/shared/components/ui/badge';
import { Textarea } from '@/shared/components/ui/textarea';
import { Select } from '@/shared/components/ui/select';
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
} from '@/shared/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';

import { useUnits, useCondominiums, useUnitTypes } from '@/modules/ph';
import type { PhUnit } from '@/modules/ph';
import { unitStatementService, unitsService } from '@/modules/ph/services/ph.service';
import { useAuthStore } from '@/modules/auth';
import { usePermissions } from '@/shared/hooks/usePermissions';
import toast from 'react-hot-toast';

const PAGE_SIZE = 20;

const emptyForm = {
  condominium_id: '',
  tower_id: '',
  unit_type_id: '',
  unit_number: '',
  floor: '',
  area_m2: '',
  coefficient: '',
  parent_unit_id: '',
  notes: '',
};

export default function UnitsPage() {
  const { units, total, loading, error, fetchUnits, createUnit, updateUnit, removeUnit } = useUnits();
  const { condominiums, towers, fetchTowers } = useCondominiums();
  const { unitTypes } = useUnitTypes();
  const companyId = useAuthStore((s) => s.company?.id);
  const { can } = usePermissions();
  const canManage = can('ph.units.create');

  // ── Filters ──
  const [filterCondominiumId, setFilterCondominiumId] = useState('');
  const [filterTowerId, setFilterTowerId] = useState('');
  const [filterUnitTypeId, setFilterUnitTypeId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // ── Pagination ──
  const [currentPage, setCurrentPage] = useState(1);

  // ── Dialogs ──
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [selectedUnit, setSelectedUnit] = useState<PhUnit | null>(null);
  const [formData, setFormData] = useState({ ...emptyForm });
  const [submitting, setSubmitting] = useState(false);

  // ── Coefficient sum for form indicator ──
  const [condoCoeffSum, setCondoCoeffSum] = useState<number | null>(null);

  const fetchCoeffSum = useCallback(async (condoId: string, excludeId?: string) => {
    if (!companyId || !condoId) { setCondoCoeffSum(null); return; }
    try {
      const res = await unitsService.getCoefficientSum(companyId, condoId, excludeId);
      setCondoCoeffSum(res.sum);
    } catch { setCondoCoeffSum(null); }
  }, [companyId]);

  useEffect(() => {
    if (formData.condominium_id && (isCreateOpen || isEditOpen)) {
      fetchCoeffSum(formData.condominium_id, selectedUnit?.id);
    } else {
      setCondoCoeffSum(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.condominium_id, isCreateOpen, isEditOpen]);

  // ── Filter towers for filter bar ──
  const [filterTowers, setFilterTowers] = useState<typeof towers>([]);

  useEffect(() => {
    if (filterCondominiumId) {
      fetchTowers(filterCondominiumId);
    } else {
      setFilterTowers([]);
      setFilterTowerId('');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterCondominiumId]);

  // Keep local filter towers in sync with the hook towers
  useEffect(() => {
    if (filterCondominiumId) {
      setFilterTowers(towers);
    }
  }, [towers, filterCondominiumId]);

  // ── Form towers (for create/edit dialog) ──
  const [formTowers, setFormTowers] = useState<typeof towers>([]);

  useEffect(() => {
    if (formData.condominium_id) {
      fetchTowers(formData.condominium_id);
    } else {
      setFormTowers([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.condominium_id]);

  useEffect(() => {
    if (formData.condominium_id) {
      setFormTowers(towers);
    }
  }, [towers, formData.condominium_id]);

  // ── Refetch on filter changes ──
  useEffect(() => {
    const params: Record<string, unknown> = {};
    if (filterCondominiumId) params.condominium_id = filterCondominiumId;
    if (filterTowerId) params.tower_id = filterTowerId;
    if (filterUnitTypeId) params.unit_type_id = filterUnitTypeId;
    if (searchTerm) params.search = searchTerm;
    params.skip = (currentPage - 1) * PAGE_SIZE;
    params.take = PAGE_SIZE;
    fetchUnits(params);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterCondominiumId, filterTowerId, filterUnitTypeId, searchTerm, currentPage]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // ── Condominium / Tower select options ──
  const condominiumOptions = useMemo(
    () => [{ value: '', label: 'Todas las copropiedades' }, ...condominiums.map((c) => ({ value: c.id, label: c.name }))],
    [condominiums],
  );

  const towerFilterOptions = useMemo(
    () => [{ value: '', label: 'Todas las torres' }, ...filterTowers.map((t) => ({ value: t.id, label: t.name }))],
    [filterTowers],
  );

  const unitTypeFilterOptions = useMemo(
    () => [{ value: '', label: 'Todos los tipos' }, ...unitTypes.map((ut) => ({ value: ut.id, label: ut.name }))],
    [unitTypes],
  );

  // ── Form select options ──
  const formCondominiumOptions = useMemo(
    () => condominiums.map((c) => ({ value: c.id, label: c.name })),
    [condominiums],
  );

  const formTowerOptions = useMemo(
    () => [{ value: '', label: 'Sin torre' }, ...formTowers.map((t) => ({ value: t.id, label: t.name }))],
    [formTowers],
  );

  const formUnitTypeOptions = useMemo(
    () => [{ value: '', label: 'Sin tipo' }, ...unitTypes.map((ut) => ({ value: ut.id, label: ut.name }))],
    [unitTypes],
  );

  // ── Max floor based on selected tower ──
  const selectedFormTower = useMemo(
    () => formTowers.find((t) => t.id === formData.tower_id),
    [formTowers, formData.tower_id],
  );
  const maxFloor = selectedFormTower?.total_floors ?? undefined;

  // ── Form coefficient projected total ──
  const formCoeffValue = formData.coefficient ? Number(formData.coefficient) : 0;
  const projectedCoeffTotal = condoCoeffSum != null ? condoCoeffSum + formCoeffValue : null;
  const coeffRemaining = condoCoeffSum != null ? Math.max(0, 100 - condoCoeffSum) : null;

  // ── Coefficient sum for visible units ──
  const coefficientSum = useMemo(
    () => units.reduce((sum, u) => sum + (u.coefficient != null ? Number(u.coefficient) : 0), 0),
    [units],
  );

  const parentUnitOptions = useMemo(
    () => [
      { value: '', label: 'Sin unidad padre' },
      ...units
        .filter((u) => !selectedUnit || u.id !== selectedUnit.id)
        .map((u) => ({
          value: u.id,
          label: `${u.unit_number}${u.tower?.name ? ` - ${u.tower.name}` : ''}`,
        })),
    ],
    [units, selectedUnit],
  );

  // ── Handlers ──
  const resetForm = () => setFormData({ ...emptyForm });

  const handleOpenCreate = () => {
    resetForm();
    setSelectedUnit(null);
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (unit: PhUnit) => {
    setSelectedUnit(unit);
    setFormData({
      condominium_id: unit.condominium_id || '',
      tower_id: unit.tower_id || '',
      unit_type_id: unit.unit_type_id || '',
      unit_number: unit.unit_number,
      floor: unit.floor != null ? String(unit.floor) : '',
      area_m2: unit.area_m2 != null ? String(unit.area_m2) : '',
      coefficient: unit.coefficient != null ? String(unit.coefficient) : '',
      parent_unit_id: unit.parent_unit_id || '',
      notes: unit.notes || '',
    });
    setIsEditOpen(true);
  };

  const handleOpenDetail = (unit: PhUnit) => {
    setSelectedUnit(unit);
    setIsDetailOpen(true);
  };

  const handleOpenDelete = (unit: PhUnit) => {
    setSelectedUnit(unit);
    setIsDeleteOpen(true);
  };

  const buildPayload = () => {
    const payload: Record<string, unknown> = {
      condominium_id: formData.condominium_id,
      unit_number: formData.unit_number,
    };
    if (formData.tower_id) payload.tower_id = formData.tower_id;
    else payload.tower_id = null;
    if (formData.unit_type_id) payload.unit_type_id = formData.unit_type_id;
    else payload.unit_type_id = null;
    if (formData.floor) payload.floor = Number(formData.floor);
    else payload.floor = null;
    if (formData.area_m2) payload.area_m2 = Number(formData.area_m2);
    else payload.area_m2 = null;
    if (formData.coefficient) payload.coefficient = Number(formData.coefficient);
    else payload.coefficient = null;
    if (formData.parent_unit_id) payload.parent_unit_id = formData.parent_unit_id;
    else payload.parent_unit_id = null;
    if (formData.notes) payload.notes = formData.notes;
    else payload.notes = null;
    return payload;
  };

  const handleCreate = async () => {
    try {
      setSubmitting(true);
      await createUnit(buildPayload());
      setIsCreateOpen(false);
      resetForm();
    } catch {
      // toast handled by hook
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedUnit) return;
    try {
      setSubmitting(true);
      await updateUnit(selectedUnit.id, buildPayload());
      setIsEditOpen(false);
      setSelectedUnit(null);
      resetForm();
    } catch {
      // toast handled by hook
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedUnit) return;
    try {
      setSubmitting(true);
      await removeUnit(selectedUnit.id);
      setIsDeleteOpen(false);
      setSelectedUnit(null);
    } catch {
      // toast handled by hook
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadStatement = async (unit: PhUnit) => {
    if (!companyId) return;
    try {
      const blob = await unitStatementService.downloadPdf(companyId, unit.id);
      const url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `estado-cuenta-${unit.unit_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Estado de cuenta descargado');
    } catch {
      toast.error('Error al descargar estado de cuenta');
    }
  };

  const handleOpenHistory = async (unit: PhUnit) => {
    if (!companyId) return;
    setSelectedUnit(unit);
    setIsHistoryOpen(true);
    setHistoryLoading(true);
    try {
      const data = await unitsService.getHistory(companyId, unit.id);
      setHistoryData(data);
    } catch {
      toast.error('Error al cargar historial');
      setHistoryData([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  // ── Loading ──
  if (loading && units.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto" />
          <p className="text-gray-500 dark:text-slate-400">Cargando unidades...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Home className="h-7 w-7 text-blue-600 dark:text-blue-400" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {canManage ? 'Unidades' : 'Mis Unidades'}
            </h1>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              {canManage
                ? 'Gestiona las unidades de las copropiedades'
                : 'Consulta tus unidades y estado de cuenta'}
            </p>
          </div>
        </div>
        {canManage && (
          <Button onClick={handleOpenCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Unidad
          </Button>
        )}
      </div>

      {/* ── Filters (solo admin) ── */}
      {canManage && (
        <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Select
                options={condominiumOptions}
                value={filterCondominiumId}
                onChange={(val) => {
                  setFilterCondominiumId(val);
                  setFilterTowerId('');
                  setCurrentPage(1);
                }}
                placeholder="Todas las copropiedades"
                searchable
              />
              <Select
                options={towerFilterOptions}
                value={filterTowerId}
                onChange={(val) => {
                  setFilterTowerId(val);
                  setCurrentPage(1);
                }}
                placeholder="Todas las torres"
                disabled={!filterCondominiumId}
                searchable
              />
              <Select
                options={unitTypeFilterOptions}
                value={filterUnitTypeId}
                onChange={(val) => {
                  setFilterUnitTypeId(val);
                  setCurrentPage(1);
                }}
                placeholder="Todos los tipos"
                searchable
              />
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por # unidad..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10"
                />
              </div>
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
            <span>{canManage ? 'Lista de Unidades' : 'Mis Unidades'}</span>
            <div className="flex items-center gap-2">
              {canManage && filterCondominiumId && (
                <Badge
                  className={
                    Math.abs(coefficientSum - 100) < 0.01
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                  }
                >
                  Coef: {coefficientSum.toFixed(4)}%
                </Badge>
              )}
              <Badge variant="secondary">{total} {total === 1 ? 'unidad' : 'unidades'}</Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-200 dark:border-slate-700">
                  <TableHead className="text-gray-600 dark:text-slate-300"># Unidad</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300">Piso</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300">Copropiedad</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300">Torre</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300">Tipo</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300">Area m2</TableHead>
                  {canManage && <TableHead className="text-gray-600 dark:text-slate-300">Coef. %</TableHead>}
                  {canManage && <TableHead className="text-gray-600 dark:text-slate-300">Residentes</TableHead>}
                  {canManage && <TableHead className="text-gray-600 dark:text-slate-300">Estado</TableHead>}
                  <TableHead className="text-gray-600 dark:text-slate-300 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {units.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canManage ? 10 : 7} className="text-center py-12">
                      <div className="flex flex-col items-center gap-3">
                        <Building2 className="h-12 w-12 text-gray-300 dark:text-slate-600" />
                        <p className="text-gray-500 dark:text-slate-400 text-lg font-medium">
                          {canManage ? 'No se encontraron unidades' : 'No tienes unidades asignadas'}
                        </p>
                        <p className="text-gray-400 dark:text-slate-500 text-sm">
                          {canManage
                            ? 'Crea una nueva unidad o ajusta los filtros de busqueda'
                            : 'Contacta al administrador si crees que es un error'}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  units.map((unit) => (
                    <TableRow
                      key={unit.id}
                      className="border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/40"
                    >
                      <TableCell className="font-medium text-gray-900 dark:text-white">
                        {unit.unit_number}
                      </TableCell>
                      <TableCell className="text-gray-600 dark:text-slate-400">
                        {unit.floor != null ? unit.floor : '-'}
                      </TableCell>
                      <TableCell className="text-gray-600 dark:text-slate-400">
                        {unit.condominium?.name || '-'}
                      </TableCell>
                      <TableCell className="text-gray-600 dark:text-slate-400">
                        {unit.tower?.name || '-'}
                      </TableCell>
                      <TableCell>
                        {unit.unit_type ? (
                          <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                            {unit.unit_type.name}
                          </Badge>
                        ) : (
                          <span className="text-gray-400 dark:text-slate-500">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-gray-600 dark:text-slate-400">
                        {unit.area_m2 != null ? Number(unit.area_m2).toLocaleString('es-CO') : '-'}
                      </TableCell>
                      {canManage && (
                        <TableCell className="text-gray-600 dark:text-slate-400">
                          {unit.coefficient != null ? `${Number(unit.coefficient)}%` : '-'}
                        </TableCell>
                      )}
                      {canManage && (
                        <TableCell>
                          <Badge variant="outline">
                            {unit._count?.residents ?? unit.residents?.length ?? 0}
                          </Badge>
                        </TableCell>
                      )}
                      {canManage && (
                        <TableCell>
                          {unit.is_active ? (
                            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                              Activo
                            </Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                              Inactivo
                            </Badge>
                          )}
                        </TableCell>
                      )}
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenDetail(unit)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Ver Detalle
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleOpenHistory(unit)}>
                              <History className="h-4 w-4 mr-2" />
                              Historial
                            </DropdownMenuItem>
                            {canManage && (
                              <DropdownMenuItem onClick={() => handleOpenEdit(unit)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handleDownloadStatement(unit)}>
                              <FileText className="h-4 w-4 mr-2" />
                              Estado de Cuenta PDF
                            </DropdownMenuItem>
                            {canManage && (
                              <DropdownMenuItem
                                onClick={() => handleOpenDelete(unit)}
                                className="text-red-600 dark:text-red-400"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Eliminar
                              </DropdownMenuItem>
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

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Pagina {currentPage} de {totalPages} ({total} unidades)
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva Unidad</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Copropiedad *</Label>
                <Select
                  options={formCondominiumOptions}
                  value={formData.condominium_id}
                  onChange={(val) =>
                    setFormData({ ...formData, condominium_id: val, tower_id: '' })
                  }
                  placeholder="Seleccionar copropiedad"
                  searchable
                />
              </div>
              <div className="space-y-2">
                <Label>Torre</Label>
                <Select
                  options={formTowerOptions}
                  value={formData.tower_id}
                  onChange={(val) => setFormData({ ...formData, tower_id: val, floor: '' })}
                  placeholder="Seleccionar torre"
                  disabled={!formData.condominium_id}
                  searchable
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Unidad</Label>
                <Select
                  options={formUnitTypeOptions}
                  value={formData.unit_type_id}
                  onChange={(val) => setFormData({ ...formData, unit_type_id: val })}
                  placeholder="Seleccionar tipo"
                  searchable
                />
              </div>
              <div className="space-y-2">
                <Label># Unidad *</Label>
                <Input
                  value={formData.unit_number}
                  onChange={(e) => setFormData({ ...formData, unit_number: e.target.value })}
                  placeholder="Ej: 101, A-201"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Piso</Label>
                <Input
                  type="number"
                  min="1"
                  max={maxFloor}
                  value={formData.floor}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (maxFloor && Number(val) > maxFloor) return;
                    setFormData({ ...formData, floor: val });
                  }}
                  placeholder={maxFloor ? `1 - ${maxFloor}` : 'Ej: 1'}
                />
                {maxFloor && (
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    Max {maxFloor} pisos (segun torre)
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Area m2</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.area_m2}
                  onChange={(e) => setFormData({ ...formData, area_m2: e.target.value })}
                  placeholder="Ej: 65.5"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Coeficiente %</Label>
                <Input
                  type="number"
                  step="0.000001"
                  min="0"
                  max={coeffRemaining != null ? coeffRemaining : 100}
                  value={formData.coefficient}
                  onChange={(e) => setFormData({ ...formData, coefficient: e.target.value })}
                  placeholder={coeffRemaining != null ? `Disponible: ${coeffRemaining.toFixed(4)}` : 'Ej: 5.2345'}
                />
                {projectedCoeffTotal != null && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-gray-500 dark:text-slate-400">
                      Asignado: {condoCoeffSum?.toFixed(4)}%
                    </span>
                    <span className="text-gray-400 dark:text-slate-500">|</span>
                    <span className={
                      projectedCoeffTotal > 100.01
                        ? 'text-red-500 font-medium'
                        : Math.abs(projectedCoeffTotal - 100) < 0.01
                          ? 'text-emerald-500 font-medium'
                          : 'text-amber-500'
                    }>
                      Total: {projectedCoeffTotal.toFixed(4)}%
                    </span>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Unidad Padre</Label>
                <Select
                  options={parentUnitOptions}
                  value={formData.parent_unit_id}
                  onChange={(val) => setFormData({ ...formData, parent_unit_id: val })}
                  placeholder="Sin unidad padre"
                  searchable
                />
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Vincula esta unidad a otra. Ej: un parqueadero a su apartamento.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Notas adicionales..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreate}
              disabled={submitting || !formData.condominium_id || !formData.unit_number}
            >
              {submitting ? 'Creando...' : 'Crear Unidad'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Dialog ── */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Unidad</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Copropiedad *</Label>
                <Select
                  options={formCondominiumOptions}
                  value={formData.condominium_id}
                  onChange={(val) =>
                    setFormData({ ...formData, condominium_id: val, tower_id: '' })
                  }
                  placeholder="Seleccionar copropiedad"
                  searchable
                />
              </div>
              <div className="space-y-2">
                <Label>Torre</Label>
                <Select
                  options={formTowerOptions}
                  value={formData.tower_id}
                  onChange={(val) => setFormData({ ...formData, tower_id: val, floor: '' })}
                  placeholder="Seleccionar torre"
                  disabled={!formData.condominium_id}
                  searchable
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Unidad</Label>
                <Select
                  options={formUnitTypeOptions}
                  value={formData.unit_type_id}
                  onChange={(val) => setFormData({ ...formData, unit_type_id: val })}
                  placeholder="Seleccionar tipo"
                  searchable
                />
              </div>
              <div className="space-y-2">
                <Label># Unidad *</Label>
                <Input
                  value={formData.unit_number}
                  onChange={(e) => setFormData({ ...formData, unit_number: e.target.value })}
                  placeholder="Ej: 101, A-201"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Piso</Label>
                <Input
                  type="number"
                  min="1"
                  max={maxFloor}
                  value={formData.floor}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (maxFloor && Number(val) > maxFloor) return;
                    setFormData({ ...formData, floor: val });
                  }}
                  placeholder={maxFloor ? `1 - ${maxFloor}` : 'Ej: 1'}
                />
                {maxFloor && (
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    Max {maxFloor} pisos (segun torre)
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Area m2</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.area_m2}
                  onChange={(e) => setFormData({ ...formData, area_m2: e.target.value })}
                  placeholder="Ej: 65.5"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Coeficiente %</Label>
                <Input
                  type="number"
                  step="0.000001"
                  min="0"
                  max={coeffRemaining != null ? coeffRemaining + formCoeffValue : 100}
                  value={formData.coefficient}
                  onChange={(e) => setFormData({ ...formData, coefficient: e.target.value })}
                  placeholder={coeffRemaining != null ? `Disponible: ${coeffRemaining.toFixed(4)}` : 'Ej: 5.2345'}
                />
                {projectedCoeffTotal != null && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-gray-500 dark:text-slate-400">
                      Asignado: {condoCoeffSum?.toFixed(4)}%
                    </span>
                    <span className="text-gray-400 dark:text-slate-500">|</span>
                    <span className={
                      projectedCoeffTotal > 100.01
                        ? 'text-red-500 font-medium'
                        : Math.abs(projectedCoeffTotal - 100) < 0.01
                          ? 'text-emerald-500 font-medium'
                          : 'text-amber-500'
                    }>
                      Total: {projectedCoeffTotal.toFixed(4)}%
                    </span>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Unidad Padre</Label>
                <Select
                  options={parentUnitOptions}
                  value={formData.parent_unit_id}
                  onChange={(val) => setFormData({ ...formData, parent_unit_id: val })}
                  placeholder="Sin unidad padre"
                  searchable
                />
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Vincula esta unidad a otra. Ej: un parqueadero a su apartamento.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Notas adicionales..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={submitting || !formData.condominium_id || !formData.unit_number}
            >
              {submitting ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Detail Dialog ── */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalle de Unidad</DialogTitle>
          </DialogHeader>
          {selectedUnit && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 dark:text-slate-400"># Unidad</p>
                  <p className="font-medium text-gray-900 dark:text-white">{selectedUnit.unit_number}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-slate-400">Piso</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {selectedUnit.floor != null ? selectedUnit.floor : '-'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 dark:text-slate-400">Copropiedad</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {selectedUnit.condominium?.name || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-slate-400">Torre</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {selectedUnit.tower?.name || '-'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 dark:text-slate-400">Tipo</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {selectedUnit.unit_type?.name || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-slate-400">Area m2</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {selectedUnit.area_m2 != null ? Number(selectedUnit.area_m2).toLocaleString('es-CO') : '-'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 dark:text-slate-400">Coeficiente</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {selectedUnit.coefficient != null ? `${Number(selectedUnit.coefficient)}%` : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-slate-400">Residentes</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {selectedUnit._count?.residents ?? selectedUnit.residents?.length ?? 0}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 dark:text-slate-400">Estado</p>
                  {selectedUnit.is_active ? (
                    <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                      Activo
                    </Badge>
                  ) : (
                    <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                      Inactivo
                    </Badge>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-slate-400">Unidad Padre</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {selectedUnit.parent_unit?.unit_number || '-'}
                  </p>
                </div>
              </div>

              {selectedUnit.notes && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-slate-400">Notas</p>
                  <p className="text-gray-700 dark:text-slate-300 text-sm whitespace-pre-wrap">
                    {selectedUnit.notes}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-200 dark:border-slate-700">
                <div>
                  <p className="text-xs text-gray-500 dark:text-slate-400">Creado</p>
                  <p className="text-sm text-gray-600 dark:text-slate-400">
                    {new Date(selectedUnit.created_at).toLocaleDateString('es-CO', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-slate-400">Actualizado</p>
                  <p className="text-sm text-gray-600 dark:text-slate-400">
                    {new Date(selectedUnit.updated_at).toLocaleDateString('es-CO', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Dialog ── */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Unidad</DialogTitle>
          </DialogHeader>
          <p className="text-gray-600 dark:text-slate-400">
            ¿Estas seguro de que deseas eliminar la unidad{' '}
            <strong>{selectedUnit?.unit_number}</strong>?
          </p>
          <p className="text-sm text-gray-500 dark:text-slate-500">
            Esta accion no se puede deshacer. Se eliminaran tambien los registros asociados.
          </p>
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
              Historial — {selectedUnit?.unit_number}
            </DialogTitle>
          </DialogHeader>
          {historyLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
            </div>
          ) : historyData.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-slate-400 py-8">
              No hay cambios registrados para esta unidad.
            </p>
          ) : (
            <div className="space-y-3 py-2">
              {historyData.map((entry: any) => {
                const actionKey = entry.action_key;

                // Badge config por tipo de acción
                const badgeConfig: Record<string, { label: string; className: string }> = {
                  'unit.name_changed': {
                    label: 'Cambio de nombre',
                    className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
                  },
                  'unit.condominium_changed': {
                    label: 'Cambio de copropiedad',
                    className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
                  },
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
                    label: 'Cambio de copropiedad (residente)',
                    className: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
                  },
                  'unit.resident_tower_changed': {
                    label: 'Cambio de torre (residente)',
                    className: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
                  },
                };

                const badge = badgeConfig[actionKey] || {
                  label: 'Cambio',
                  className: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
                };

                // Renderizar contenido según tipo
                const renderContent = () => {
                  if (actionKey === 'unit.name_changed') {
                    const oldName = entry.old_values?.unit_number ?? '';
                    const newName = entry.new_values?.unit_number ?? '';
                    return (
                      <div className="text-sm">
                        <span className="text-red-500 line-through">{oldName}</span>
                        {' '}
                        <span className="text-gray-400 dark:text-slate-500">&rarr;</span>
                        {' '}
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">{newName}</span>
                      </div>
                    );
                  }
                  if (actionKey === 'unit.condominium_changed') {
                    const oldCondo = entry.old_values?.condominium ?? '';
                    const newCondo = entry.new_values?.condominium ?? '';
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
                    const name = entry.old_values?.resident_name ?? '';
                    const oldUnit = entry.old_values?.unit_name ?? '';
                    const newUnit = entry.new_values?.unit_name ?? '';
                    return (
                      <div className="text-sm">
                        <span className="font-medium text-gray-900 dark:text-white">{name}: </span>
                        <span className="text-red-500 line-through">{oldUnit}</span>
                        {' '}
                        <span className="text-gray-400 dark:text-slate-500">&rarr;</span>
                        {' '}
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">{newUnit}</span>
                      </div>
                    );
                  }
                  if (actionKey === 'unit.resident_condominium_changed') {
                    const name = entry.old_values?.resident_name ?? '';
                    const oldCondo = entry.old_values?.condominium_name ?? '';
                    const newCondo = entry.new_values?.condominium_name ?? '';
                    return (
                      <div className="text-sm">
                        <span className="font-medium text-gray-900 dark:text-white">{name}: </span>
                        <span className="text-red-500 line-through">{oldCondo}</span>
                        {' '}
                        <span className="text-gray-400 dark:text-slate-500">&rarr;</span>
                        {' '}
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">{newCondo}</span>
                      </div>
                    );
                  }
                  if (actionKey === 'unit.resident_tower_changed') {
                    const name = entry.old_values?.resident_name ?? '';
                    const oldTower = entry.old_values?.tower_name ?? '';
                    const newTower = entry.new_values?.tower_name ?? '';
                    return (
                      <div className="text-sm">
                        <span className="font-medium text-gray-900 dark:text-white">{name}: </span>
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
                              if (!companyId || !selectedUnit) return;
                              try {
                                await unitsService.deleteHistory(companyId, selectedUnit.id, entry.id);
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
