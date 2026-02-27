'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Badge } from '@/shared/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/shared/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/shared/components/ui/dialog';
import { Select } from '@/shared/components/ui/select';
import { SearchableSelect } from '@/shared/components/ui/searchable-select';
import { NumericInput } from '@/shared/components/ui/numeric-input';
import { Textarea } from '@/shared/components/ui/textarea';
import { Switch } from '@/shared/components/ui/switch';
import {
  Loader2, Pencil, Trash2, Search, Plus, ChevronLeft, ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { projectionsService } from '../services/projections.service';
import { costCentersService } from '@/modules/cost-centers/services/costCenters.service';
import type { ProjectionSummary, CreateProjectionData, UpdateProjectionData } from '../types';

interface MovementType {
  key: string;
  name: string;
}

interface CostCenterOption {
  id: string;
  name: string;
  consecutive: string;
}

interface ProjectionsListProps {
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

const SCOPE_OPTIONS = [
  { value: 'ALL', label: 'Todos los scopes' },
  { value: 'GLOBAL', label: 'Global' },
  { value: 'COST_CENTER', label: 'Centro de Costos' },
];

const SCOPE_FORM_OPTIONS = [
  { value: 'GLOBAL', label: 'Global' },
  { value: 'COST_CENTER', label: 'Centro de Costos' },
];

export const ProjectionsList = ({ canCreate, canEdit, canDelete }: ProjectionsListProps) => {
  const [data, setData] = useState<ProjectionSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [scopeFilter, setScopeFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const debouncedSearch = useDebounce(search, 300);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Form fields
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formScope, setFormScope] = useState('GLOBAL');
  const [formCostCenterId, setFormCostCenterId] = useState('');
  const [formIncludeSubCenters, setFormIncludeSubCenters] = useState(false);
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formItems, setFormItems] = useState<{ type_key: string; amount: number }[]>([]);

  // Reference data
  const [movementTypes, setMovementTypes] = useState<MovementType[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenterOption[]>([]);

  // Confirm dialog
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string; description: string; confirmLabel: string;
    onConfirm: () => Promise<void>;
  }>({ title: '', description: '', confirmLabel: '', onConfirm: async () => {} });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await projectionsService.getAll({
        search: debouncedSearch || undefined,
        page,
        limit: 20,
        scope: scopeFilter !== 'ALL' ? (scopeFilter as 'GLOBAL' | 'COST_CENTER') : undefined,
      });
      setData(res.data);
      setTotalPages(res.totalPages);
      setTotal(res.total);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error cargando proyecciones');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page, scopeFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, scopeFilter]);

  // Load reference data on mount
  useEffect(() => {
    const loadReferenceData = async () => {
      try {
        const [typesRes, ccRes] = await Promise.all([
          projectionsService.getMovementTypes(),
          costCentersService.getAll({ limit: 200 }),
        ]);
        setMovementTypes(typesRes);
        setCostCenters(ccRes.data.map((c: any) => ({ id: c.id, name: c.name, consecutive: c.consecutive })));
      } catch {
        // Silently fail — will be empty selects
      }
    };
    loadReferenceData();
  }, []);

  const costCenterSelectOptions = useMemo(
    () => costCenters.map((cc) => ({ value: cc.id, label: `${cc.consecutive} — ${cc.name}` })),
    [costCenters],
  );

  const resetForm = () => {
    setFormName('');
    setFormDescription('');
    setFormScope('GLOBAL');
    setFormCostCenterId('');
    setFormIncludeSubCenters(false);
    setFormStartDate('');
    setFormEndDate('');
    setFormItems([]);
    setEditingId(null);
  };

  const openCreateModal = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEditModal = async (id: string) => {
    resetForm();
    setEditingId(id);
    setLoadingDetail(true);
    setModalOpen(true);
    try {
      const detail = await projectionsService.getOne(id);
      setFormName(detail.name);
      setFormDescription(detail.description || '');
      setFormScope(detail.scope);
      setFormCostCenterId(detail.cost_center?.id || '');
      setFormIncludeSubCenters(detail.include_sub_centers);
      setFormStartDate(detail.start_date ? detail.start_date.substring(0, 10) : '');
      setFormEndDate(detail.end_date ? detail.end_date.substring(0, 10) : '');
      setFormItems(detail.items.map((i) => ({ type_key: i.type_key, amount: Number(i.amount) })));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error cargando proyección');
      setModalOpen(false);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error('El nombre es requerido');
      return;
    }
    if (!formStartDate || !formEndDate) {
      toast.error('Las fechas son requeridas');
      return;
    }
    if (formScope === 'COST_CENTER' && !formCostCenterId) {
      toast.error('Seleccione un centro de costos');
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        const updateData: UpdateProjectionData = {
          name: formName,
          description: formDescription || undefined,
          start_date: formStartDate,
          end_date: formEndDate,
          include_sub_centers: formScope === 'COST_CENTER' ? formIncludeSubCenters : undefined,
          items: formItems,
        };
        await projectionsService.update(editingId, updateData);
        toast.success('Proyección actualizada');
      } else {
        const createData: CreateProjectionData = {
          name: formName,
          description: formDescription || undefined,
          scope: formScope as 'GLOBAL' | 'COST_CENTER',
          cost_center_id: formScope === 'COST_CENTER' ? formCostCenterId : undefined,
          include_sub_centers: formScope === 'COST_CENTER' ? formIncludeSubCenters : undefined,
          start_date: formStartDate,
          end_date: formEndDate,
          items: formItems.length > 0 ? formItems : undefined,
        };
        await projectionsService.create(createData);
        toast.success('Proyección creada');
      }
      setModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error guardando proyección');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (projection: ProjectionSummary) => {
    if (projection.children_count > 0) {
      toast.error('No se puede eliminar: tiene sub-proyecciones');
      return;
    }
    setConfirmConfig({
      title: 'Eliminar proyección',
      description: `¿Eliminar "${projection.name}" (${projection.consecutive})? Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar',
      onConfirm: async () => {
        await projectionsService.delete(projection.id);
        toast.success('Proyección eliminada');
        fetchData();
      },
    });
    setConfirmOpen(true);
  };

  const addItem = () => {
    setFormItems((prev) => [...prev, { type_key: '', amount: 0 }]);
  };

  const removeItem = (index: number) => {
    setFormItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: 'type_key' | 'amount', value: string | number) => {
    setFormItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  };

  const usedTypeKeys = new Set(formItems.map((i) => i.type_key));

  const getMovementTypeOptions = (currentKey: string) =>
    movementTypes
      .filter((t) => t.key === currentKey || !usedTypeKeys.has(t.key))
      .map((t) => ({ value: t.key, label: t.name }));

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <CardTitle className="text-lg">Proyecciones ({total})</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre o consecutivo..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 w-[250px]"
                />
              </div>
              <Select
                options={SCOPE_OPTIONS}
                value={scopeFilter}
                onChange={setScopeFilter}
                className="w-[160px]"
              />
              {canCreate && (
                <Button onClick={openCreateModal} size="sm">
                  <Plus className="h-4 w-4 mr-1" /> Nueva
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : data.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No hay proyecciones</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Consecutivo</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Scope</TableHead>
                    <TableHead>Centro de Costos</TableHead>
                    <TableHead>Periodo</TableHead>
                    <TableHead className="text-center">Líneas</TableHead>
                    <TableHead className="text-center">Sub-proy.</TableHead>
                    {(canEdit || canDelete) && <TableHead className="text-right">Acciones</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-sm">{p.consecutive}</TableCell>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>
                        <Badge variant={p.scope === 'GLOBAL' ? 'default' : 'secondary'}>
                          {p.scope === 'GLOBAL' ? 'Global' : 'Centro'}
                        </Badge>
                        {p.scope === 'COST_CENTER' && p.include_sub_centers && (
                          <Badge variant="outline" className="ml-1 text-xs">+sub</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {p.cost_center ? (
                          <span className="text-sm">{p.cost_center.name}</span>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(p.start_date)} — {formatDate(p.end_date)}
                      </TableCell>
                      <TableCell className="text-center">{p.items_count}</TableCell>
                      <TableCell className="text-center">{p.children_count}</TableCell>
                      {(canEdit || canDelete) && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {canEdit && (
                              <Button variant="ghost" size="icon" onClick={() => openEditModal(p.id)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                            {canDelete && (
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(p)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <span className="text-sm text-muted-foreground">
                    Página {page} de {totalPages}
                  </span>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={(open: boolean) => { if (!open) { setModalOpen(false); resetForm(); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Proyección' : 'Nueva Proyección'}</DialogTitle>
          </DialogHeader>

          {loadingDetail ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Name */}
              <div>
                <Label>Nombre *</Label>
                <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Ej: Presupuesto Anual 2026" />
              </div>

              {/* Description */}
              <div>
                <Label>Descripción</Label>
                <Textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Descripción opcional" rows={2} />
              </div>

              {/* Scope + Cost Center (only on create) */}
              {!editingId && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Scope *</Label>
                    <Select
                      options={SCOPE_FORM_OPTIONS}
                      value={formScope}
                      onChange={(v: string) => {
                        setFormScope(v);
                        if (v === 'GLOBAL') {
                          setFormCostCenterId('');
                          setFormIncludeSubCenters(false);
                        }
                      }}
                    />
                  </div>
                  {formScope === 'COST_CENTER' && (
                    <div>
                      <Label>Centro de Costos *</Label>
                      <SearchableSelect
                        options={costCenterSelectOptions}
                        value={formCostCenterId}
                        onChange={setFormCostCenterId}
                        placeholder="Seleccionar centro..."
                        clearable={false}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Include sub-centers toggle */}
              {formScope === 'COST_CENTER' && (
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formIncludeSubCenters}
                    onCheckedChange={setFormIncludeSubCenters}
                  />
                  <Label className="cursor-pointer">Incluir subcentros de costos</Label>
                </div>
              )}

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Fecha inicio *</Label>
                  <Input type="date" value={formStartDate} onChange={(e) => setFormStartDate(e.target.value)} />
                </div>
                <div>
                  <Label>Fecha fin *</Label>
                  <Input type="date" value={formEndDate} onChange={(e) => setFormEndDate(e.target.value)} />
                </div>
              </div>

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Líneas de presupuesto</Label>
                  <Button variant="outline" size="sm" onClick={addItem}>
                    <Plus className="h-3 w-3 mr-1" /> Agregar línea
                  </Button>
                </div>
                {formItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin líneas. Puede agregarlas después.</p>
                ) : (
                  <div className="space-y-2">
                    {formItems.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <SearchableSelect
                          options={getMovementTypeOptions(item.type_key)}
                          value={item.type_key}
                          onChange={(v: string) => updateItem(idx, 'type_key', v)}
                          placeholder="Tipo de línea..."
                          clearable={false}
                          className="flex-1"
                        />
                        <NumericInput
                          value={item.amount}
                          onChange={(e) => updateItem(idx, 'amount', parseFloat(e.target.value) || 0)}
                          className="w-[180px]"
                          currency
                        />
                        <Button variant="ghost" size="icon" onClick={() => removeItem(idx)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  {editingId ? 'Guardar cambios' : 'Crear'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={confirmConfig.title}
        description={confirmConfig.description}
        confirmLabel={confirmConfig.confirmLabel}
        onConfirm={confirmConfig.onConfirm}
      />
    </>
  );
};
