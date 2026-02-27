'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Wrench,
  Plus,
  Pencil,
  Trash2,
  MoreHorizontal,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ClipboardList,
  PauseCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Badge } from '@/shared/components/ui/badge';
import { Select } from '@/shared/components/ui/select';
import { ThirdPartySelect } from '@/shared/components/ui/third-party-select';
import { NumericInput } from '@/shared/components/ui/numeric-input';
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
  DropdownMenuSeparator,
} from '@/shared/components/ui/dropdown-menu';

import { useAuthStore } from '@/modules/auth';
import { maintenancePlansService, condominiumsService, unitsService } from '@/modules/ph';
import type {
  PhMaintenancePlan,
  PhMaintenanceLog,
  MaintenanceCategory,
  MaintenanceFrequency,
  PhCondominium,
} from '@/modules/ph';

// ─── Constants ───

const CATEGORY_OPTIONS: { value: MaintenanceCategory | ''; label: string }[] = [
  { value: '', label: 'Todas las categorias' },
  { value: 'ascensores', label: 'Ascensores' },
  { value: 'bombas', label: 'Bombas' },
  { value: 'tanques', label: 'Tanques' },
  { value: 'jardines', label: 'Jardines' },
  { value: 'electrico', label: 'Electrico' },
  { value: 'plomeria', label: 'Plomeria' },
  { value: 'pintura', label: 'Pintura' },
  { value: 'impermeabilizacion', label: 'Impermeabilizacion' },
  { value: 'fumigacion', label: 'Fumigacion' },
  { value: 'otro', label: 'Otro' },
];

const CATEGORY_CREATE_OPTIONS = CATEGORY_OPTIONS.filter((o) => o.value !== '');

const FREQUENCY_OPTIONS: { value: MaintenanceFrequency; label: string }[] = [
  { value: 'mensual', label: 'Mensual' },
  { value: 'bimestral', label: 'Bimestral' },
  { value: 'trimestral', label: 'Trimestral' },
  { value: 'semestral', label: 'Semestral' },
  { value: 'anual', label: 'Anual' },
  { value: 'unica', label: 'Unica vez' },
];

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'active', label: 'Activo' },
  { value: 'paused', label: 'Pausado' },
  { value: 'completed', label: 'Completado' },
];

const CATEGORY_LABELS: Record<string, string> = {
  ascensores: 'Ascensores',
  bombas: 'Bombas',
  tanques: 'Tanques',
  jardines: 'Jardines',
  electrico: 'Electrico',
  plomeria: 'Plomeria',
  pintura: 'Pintura',
  impermeabilizacion: 'Impermeabilizacion',
  fumigacion: 'Fumigacion',
  otro: 'Otro',
};

const FREQUENCY_LABELS: Record<string, string> = {
  mensual: 'Mensual',
  bimestral: 'Bimestral',
  trimestral: 'Trimestral',
  semestral: 'Semestral',
  anual: 'Anual',
  unica: 'Unica',
};

function formatCurrency(value: number | null | undefined) {
  if (value == null) return '-';
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

function daysUntilNext(nextDate: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const d = new Date(nextDate);
  d.setHours(0, 0, 0, 0);
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function getTrafficLight(plan: PhMaintenancePlan) {
  if (plan.status === 'paused') {
    return {
      color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
      label: 'Pausado',
      icon: <PauseCircle className="h-3.5 w-3.5" />,
    };
  }
  if (plan.status === 'completed') {
    return {
      color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      label: 'Completado',
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    };
  }
  const days = daysUntilNext(plan.next_maintenance_date);
  if (days < 0) {
    return {
      color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      label: `Vencido (${Math.abs(days)}d)`,
      icon: <XCircle className="h-3.5 w-3.5" />,
    };
  }
  if (days <= 15) {
    return {
      color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      label: days === 0 ? 'Hoy' : `${days}d`,
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
    };
  }
  return {
    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    label: 'Al dia',
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  };
}

const PAGE_SIZE = 20;

const emptyForm = {
  condominium_id: '',
  provider_third_party_id: '',
  name: '',
  description: '',
  category: '' as MaintenanceCategory | '',
  frequency: '' as MaintenanceFrequency | '',
  estimated_cost: '',
  last_maintenance_date: '',
  next_maintenance_date: '',
  document_url: '',
  notes: '',
};

const emptyLogForm = {
  unit_ids: [] as string[],
  performed_date: '',
  performed_by: '',
  provider_third_party_id: '',
  actual_cost: '',
  observations: '',
  document_url: '',
};

interface PhUnit {
  id: string;
  unit_number: string;
  condominium_id: string;
}

export default function MantenimientoPage() {
  const companyId = useAuthStore((s) => s.company?.id);

  // ─── Data ───
  const [plans, setPlans] = useState<PhMaintenancePlan[]>([]);
  const [condominiums, setCondominiums] = useState<PhCondominium[]>([]);
  const [units, setUnits] = useState<PhUnit[]>([]);
  const [loading, setLoading] = useState(true);

  // ─── Filters ───
  const [filterCondominium, setFilterCondominium] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);

  // ─── Dialogs ───
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isLogsOpen, setIsLogsOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PhMaintenancePlan | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  // ─── Logs ───
  const [logRecords, setLogRecords] = useState<PhMaintenanceLog[]>([]);
  const [logForm, setLogForm] = useState(emptyLogForm);
  const [submittingLog, setSubmittingLog] = useState(false);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [deletingLogId, setDeletingLogId] = useState<string | null>(null);

  // ─── Fetch ───
  const fetchPlans = useCallback(async () => {
    if (!companyId) return;
    try {
      setLoading(true);
      const res = await maintenancePlansService.getAll(companyId, { take: 200 });
      setPlans(Array.isArray(res) ? res : res.data ?? []);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al cargar planes');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  const fetchCondominiums = useCallback(async () => {
    if (!companyId) return;
    try {
      const res = await condominiumsService.getAll(companyId, { take: 100 });
      setCondominiums(Array.isArray(res) ? res : res.data ?? []);
    } catch {
      // silent
    }
  }, [companyId]);

  const fetchUnits = useCallback(async () => {
    if (!companyId) return;
    try {
      const res = await unitsService.getAll(companyId, { take: 500 });
      setUnits(Array.isArray(res) ? res : res.data ?? []);
    } catch {
      // silent
    }
  }, [companyId]);

  useEffect(() => {
    fetchPlans();
    fetchCondominiums();
    fetchUnits();
  }, [fetchPlans, fetchCondominiums, fetchUnits]);

  // ─── Units for log form ───
  const filteredUnitsForLog = useMemo(() => {
    if (!selectedPlan?.condominium_id) return [];
    return units.filter((u) => u.condominium_id === selectedPlan.condominium_id);
  }, [units, selectedPlan?.condominium_id]);

  // ─── Client-side filtering ───
  const filteredPlans = useMemo(() => {
    let result = plans;
    if (filterCondominium) result = result.filter((p) => p.condominium_id === filterCondominium);
    if (filterCategory) result = result.filter((p) => p.category === filterCategory);
    if (filterStatus) {
      if (filterStatus === 'active') {
        result = result.filter((p) => p.status === 'active');
      } else {
        result = result.filter((p) => p.status === filterStatus);
      }
    }
    return result;
  }, [plans, filterCondominium, filterCategory, filterStatus]);

  const paginatedPlans = filteredPlans.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(filteredPlans.length / PAGE_SIZE);

  useEffect(() => { setPage(1); }, [filterCondominium, filterCategory, filterStatus]);

  // ─── Summary cards ───
  const summary = useMemo(() => {
    let alDia = 0, proximo = 0, vencido = 0;
    for (const p of plans) {
      if (p.status !== 'active') continue;
      const days = daysUntilNext(p.next_maintenance_date);
      if (days < 0) vencido++;
      else if (days <= 15) proximo++;
      else alDia++;
    }
    return { alDia, proximo, vencido, total: plans.length };
  }, [plans]);

  // ─── Handlers ───
  const buildPayload = () => ({
    condominium_id: form.condominium_id,
    provider_third_party_id: form.provider_third_party_id || undefined,
    name: form.name,
    description: form.description || undefined,
    category: form.category,
    frequency: form.frequency,
    estimated_cost: form.estimated_cost ? Number(form.estimated_cost) : undefined,
    last_maintenance_date: form.last_maintenance_date || undefined,
    next_maintenance_date: form.next_maintenance_date,
    document_url: form.document_url || undefined,
    notes: form.notes || undefined,
  });

  const handleCreate = async () => {
    if (!companyId) return;
    try {
      setSubmitting(true);
      await maintenancePlansService.create(companyId, buildPayload());
      toast.success('Plan creado exitosamente');
      setIsCreateOpen(false);
      setForm(emptyForm);
      await fetchPlans();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al crear plan');
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (plan: PhMaintenancePlan) => {
    setSelectedPlan(plan);
    setForm({
      condominium_id: plan.condominium_id,
      provider_third_party_id: plan.provider_third_party_id || '',
      name: plan.name,
      description: plan.description || '',
      category: plan.category,
      frequency: plan.frequency,
      estimated_cost: plan.estimated_cost != null ? String(plan.estimated_cost) : '',
      last_maintenance_date: plan.last_maintenance_date ? plan.last_maintenance_date.slice(0, 10) : '',
      next_maintenance_date: plan.next_maintenance_date ? plan.next_maintenance_date.slice(0, 10) : '',
      document_url: plan.document_url || '',
      notes: plan.notes || '',
    });
    setIsEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!companyId || !selectedPlan) return;
    try {
      setSubmitting(true);
      await maintenancePlansService.update(companyId, selectedPlan.id, buildPayload());
      toast.success('Plan actualizado exitosamente');
      setIsEditOpen(false);
      setSelectedPlan(null);
      setForm(emptyForm);
      await fetchPlans();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al actualizar plan');
    } finally {
      setSubmitting(false);
    }
  };

  const openDelete = (plan: PhMaintenancePlan) => {
    setSelectedPlan(plan);
    setIsDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!companyId || !selectedPlan) return;
    try {
      setSubmitting(true);
      await maintenancePlansService.remove(companyId, selectedPlan.id);
      toast.success('Plan eliminado exitosamente');
      setIsDeleteOpen(false);
      setSelectedPlan(null);
      await fetchPlans();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al eliminar plan');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Log Handlers ───
  const openLogs = async (plan: PhMaintenancePlan) => {
    setSelectedPlan(plan);
    setLogForm({ ...emptyLogForm, provider_third_party_id: plan.provider_third_party_id || '' });
    setEditingLogId(null);
    setDeletingLogId(null);
    setIsLogsOpen(true);
    if (!companyId) return;
    try {
      const logs = await maintenancePlansService.getLogs(companyId, plan.id);
      setLogRecords(Array.isArray(logs) ? logs : []);
    } catch {
      setLogRecords([]);
    }
  };

  const refreshLogs = async () => {
    if (!companyId || !selectedPlan) return;
    const logs = await maintenancePlansService.getLogs(companyId, selectedPlan.id);
    setLogRecords(Array.isArray(logs) ? logs : []);
    await fetchPlans();
  };

  const openEditLog = (log: PhMaintenanceLog) => {
    setEditingLogId(log.id);
    setLogForm({
      unit_ids: log.unit_ids ?? [],
      performed_date: log.performed_date ? log.performed_date.slice(0, 10) : '',
      performed_by: log.performed_by || '',
      provider_third_party_id: log.provider_third_party_id || '',
      actual_cost: log.actual_cost != null ? String(log.actual_cost) : '',
      observations: log.observations || '',
      document_url: log.document_url || '',
    });
  };

  const cancelEditLog = () => {
    setEditingLogId(null);
    setLogForm({ ...emptyLogForm, provider_third_party_id: selectedPlan?.provider_third_party_id || '' });
  };

  const handleSubmitLog = async () => {
    if (!companyId || !selectedPlan) return;
    const payload = {
      unit_ids: logForm.unit_ids.length > 0 ? logForm.unit_ids : undefined,
      performed_date: logForm.performed_date,
      performed_by: logForm.performed_by || undefined,
      provider_third_party_id: logForm.provider_third_party_id || undefined,
      actual_cost: logForm.actual_cost ? Number(logForm.actual_cost) : undefined,
      observations: logForm.observations || undefined,
      document_url: logForm.document_url || undefined,
    };
    try {
      setSubmittingLog(true);
      if (editingLogId) {
        await maintenancePlansService.updateLog(companyId, selectedPlan.id, editingLogId, payload);
        toast.success('Registro actualizado');
      } else {
        await maintenancePlansService.addLog(companyId, selectedPlan.id, payload);
        toast.success('Mantenimiento registrado');
      }
      setEditingLogId(null);
      setLogForm({ ...emptyLogForm, provider_third_party_id: selectedPlan.provider_third_party_id || '' });
      await refreshLogs();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al guardar registro');
    } finally {
      setSubmittingLog(false);
    }
  };

  const handleConfirmDeleteLog = async () => {
    if (!companyId || !selectedPlan || !deletingLogId) return;
    try {
      await maintenancePlansService.removeLog(companyId, deletingLogId);
      toast.success('Registro eliminado');
      setDeletingLogId(null);
      await refreshLogs();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al eliminar registro');
    }
  };

  // ─── Form fields ───
  const renderFormFields = () => (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label>Copropiedad *</Label>
        <Select
          options={condominiums.map((c) => ({ value: c.id, label: c.name }))}
          value={form.condominium_id}
          onChange={(v) => setForm({ ...form, condominium_id: v })}
          placeholder="Seleccionar copropiedad"
          searchable
        />
      </div>
      <div className="space-y-2">
        <Label>Nombre del plan *</Label>
        <Input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Ej: Mantenimiento ascensor Torre A"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Categoria *</Label>
          <Select
            options={CATEGORY_CREATE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            value={form.category}
            onChange={(v) => setForm({ ...form, category: v as MaintenanceCategory })}
            placeholder="Seleccionar categoria"
          />
        </div>
        <div className="space-y-2">
          <Label>Frecuencia *</Label>
          <Select
            options={FREQUENCY_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            value={form.frequency}
            onChange={(v) => setForm({ ...form, frequency: v as MaintenanceFrequency })}
            placeholder="Seleccionar frecuencia"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Proveedor</Label>
        <ThirdPartySelect
          value={form.provider_third_party_id || undefined}
          valueLabel={selectedPlan?.provider && form.provider_third_party_id === selectedPlan.provider_third_party_id
            ? `${selectedPlan.provider.identification_number || ''} - ${selectedPlan.provider.name}`
            : undefined}
          onChange={(id) => setForm({ ...form, provider_third_party_id: id })}
          placeholder="Seleccionar proveedor"
          excludeRoles={['EMPLOYEE', 'CONTACT', 'CLIENT', 'EPS', 'PENSION_FUND', 'ARL', 'COMPENSATION_FUND', 'SEVERANCE_FUND', 'SENA', 'ICBF', 'CO_OWNER', 'TENANT']}
          usePortal
        />
      </div>
      <div className="space-y-2">
        <Label>Costo estimado (COP)</Label>
        <NumericInput
          value={form.estimated_cost}
          onChange={(e) => setForm({ ...form, estimated_cost: e.target.value })}
          placeholder="0"
          allowNegative={false}
          currency
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Proximo mantenimiento *</Label>
          <DatePicker value={form.next_maintenance_date} onChange={(v) => setForm({ ...form, next_maintenance_date: v })} placeholder="Fecha programada" usePortal />
        </div>
        <div className="space-y-2">
          <Label>Ultimo mantenimiento</Label>
          <DatePicker value={form.last_maintenance_date} onChange={(v) => setForm({ ...form, last_maintenance_date: v })} placeholder="Fecha anterior" usePortal />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Descripcion</Label>
        <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descripcion del plan (opcional)" />
      </div>
      <div className="space-y-2">
        <Label>URL del documento</Label>
        <Input value={form.document_url} onChange={(e) => setForm({ ...form, document_url: e.target.value })} placeholder="https://..." />
      </div>
      <div className="space-y-2">
        <Label>Notas</Label>
        <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notas adicionales (opcional)" />
      </div>
    </div>
  );

  const isFormValid = form.condominium_id && form.name && form.category && form.frequency && form.next_maintenance_date;

  if (loading && plans.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto" />
          <p className="text-gray-500 dark:text-slate-400">Cargando planes de mantenimiento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Wrench className="h-7 w-7 text-blue-600 dark:text-blue-400" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Plan de Mantenimiento</h1>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Gestiona los planes de mantenimiento preventivo de las copropiedades
            </p>
          </div>
        </div>
        <Button onClick={() => { setForm(emptyForm); setIsCreateOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Plan
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Wrench className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.total}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">Total planes</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{summary.alDia}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">Al dia</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{summary.proximo}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">Proximos</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
              <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{summary.vencido}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">Vencidos</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select
              options={[{ value: '', label: 'Todas las copropiedades' }, ...condominiums.map((c) => ({ value: c.id, label: c.name }))]}
              value={filterCondominium}
              onChange={setFilterCondominium}
              placeholder="Copropiedad"
              searchable
            />
            <Select
              options={CATEGORY_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              value={filterCategory}
              onChange={setFilterCategory}
              placeholder="Categoria"
            />
            <Select
              options={STATUS_FILTER_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              value={filterStatus}
              onChange={setFilterStatus}
              placeholder="Estado"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white flex items-center justify-between">
            <span>Lista de Planes</span>
            <Badge variant="secondary">{filteredPlans.length} planes</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-200 dark:border-slate-700">
                  <TableHead className="text-gray-600 dark:text-slate-300">Estado</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300">Nombre</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300">Categoria</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300">Frecuencia</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300">Proveedor</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300">Copropiedad</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300">Proximo Mant.</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedPlans.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500 dark:text-slate-400">
                      {plans.length === 0 ? 'No hay planes de mantenimiento. Crea el primer plan.' : 'No se encontraron planes con los filtros aplicados'}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedPlans.map((plan) => {
                    const traffic = getTrafficLight(plan);
                    return (
                      <TableRow key={plan.id} className="border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/40">
                        <TableCell>
                          <Badge className={`${traffic.color} flex items-center gap-1.5 w-fit`}>
                            {traffic.icon}
                            {traffic.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-gray-900 dark:text-white">{plan.name}</span>
                          {plan._count?.logs != null && plan._count.logs > 0 && (
                            <span className="ml-2 text-xs text-gray-400">({plan._count.logs} registros)</span>
                          )}
                        </TableCell>
                        <TableCell className="text-gray-600 dark:text-slate-400">
                          {CATEGORY_LABELS[plan.category] || plan.category}
                        </TableCell>
                        <TableCell className="text-gray-600 dark:text-slate-400">
                          {FREQUENCY_LABELS[plan.frequency] || plan.frequency}
                        </TableCell>
                        <TableCell>
                          <div className="text-gray-600 dark:text-slate-400">
                            {plan.provider?.name || '-'}
                            {plan.provider?.identification_number && (
                              <span className="block text-xs text-gray-400 dark:text-slate-500">
                                {plan.provider.identification_number}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-600 dark:text-slate-400">{plan.condominium?.name || '-'}</TableCell>
                        <TableCell className="text-gray-600 dark:text-slate-400">{formatDate(plan.next_maintenance_date)}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm"><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEdit(plan)}>
                                <Pencil className="h-4 w-4 mr-2" /> Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openLogs(plan)}>
                                <ClipboardList className="h-4 w-4 mr-2" /> Registrar Mantenimiento
                              </DropdownMenuItem>
                              {plan.document_url && (
                                <DropdownMenuItem onClick={() => window.open(plan.document_url!, '_blank')}>
                                  <ExternalLink className="h-4 w-4 mr-2" /> Ver documento
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => openDelete(plan)} className="text-red-600 dark:text-red-400">
                                <Trash2 className="h-4 w-4 mr-2" /> Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Pagina {page} de {totalPages} ({filteredPlans.length} planes)
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Anterior</Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Siguiente</Button>
          </div>
        </div>
      )}

      {/* ═══════════════════ DIALOGS ═══════════════════ */}

      {/* Create */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nuevo Plan de Mantenimiento</DialogTitle></DialogHeader>
          {renderFormFields()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={submitting || !isFormValid}>
              {submitting ? 'Creando...' : 'Crear Plan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar Plan de Mantenimiento</DialogTitle></DialogHeader>
          {renderFormFields()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleUpdate} disabled={submitting || !isFormValid}>
              {submitting ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Eliminar Plan</DialogTitle></DialogHeader>
          <p className="text-gray-600 dark:text-slate-400">
            Estas seguro de que deseas eliminar el plan <strong>{selectedPlan?.name}</strong>?
          </p>
          <p className="text-sm text-gray-500 dark:text-slate-500">Se eliminara tambien todo el historial de mantenimientos.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
              {submitting ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Logs (History + Register) */}
      <Dialog open={isLogsOpen} onOpenChange={setIsLogsOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Historial — {selectedPlan?.name}
            </DialogTitle>
          </DialogHeader>

          {/* Register / Edit log */}
          <div className={`space-y-3 p-4 rounded-lg border ${editingLogId ? 'border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10' : 'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10'}`}>
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                {editingLogId ? 'Editar registro' : 'Registrar mantenimiento realizado'}
              </h4>
              {editingLogId && (
                <Button variant="ghost" size="sm" onClick={cancelEditLog} className="text-xs h-7">
                  Cancelar edicion
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Fecha *</Label>
                <DatePicker value={logForm.performed_date} onChange={(v) => setLogForm({ ...logForm, performed_date: v })} placeholder="Fecha" usePortal />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Ejecutado por</Label>
                <Input value={logForm.performed_by} onChange={(e) => setLogForm({ ...logForm, performed_by: e.target.value })} placeholder="Nombre" className="h-9" />
              </div>
            </div>
            {filteredUnitsForLog.length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs">Unidades (vacio = area comun)</Label>
                <div className="flex flex-wrap gap-2 p-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800 min-h-[36px]">
                  {filteredUnitsForLog.map((u) => {
                    const selected = logForm.unit_ids.includes(u.id);
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => setLogForm((prev) => ({
                          ...prev,
                          unit_ids: selected ? prev.unit_ids.filter((id) => id !== u.id) : [...prev.unit_ids, u.id],
                        }))}
                        className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                          selected
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                        }`}
                      >
                        {u.unit_number}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Proveedor</Label>
                <ThirdPartySelect
                  value={logForm.provider_third_party_id || undefined}
                  valueLabel={selectedPlan?.provider && logForm.provider_third_party_id === selectedPlan.provider_third_party_id
                    ? `${selectedPlan.provider.identification_number || ''} - ${selectedPlan.provider.name}`
                    : undefined}
                  onChange={(id) => setLogForm({ ...logForm, provider_third_party_id: id })}
                  placeholder="Proveedor"
                  excludeRoles={['EMPLOYEE', 'CONTACT', 'CLIENT', 'EPS', 'PENSION_FUND', 'ARL', 'COMPENSATION_FUND', 'SEVERANCE_FUND', 'SENA', 'ICBF', 'CO_OWNER', 'TENANT']}
                  usePortal
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Costo real (COP)</Label>
                <NumericInput
                  value={logForm.actual_cost}
                  onChange={(e) => setLogForm({ ...logForm, actual_cost: e.target.value })}
                  placeholder="0"
                  allowNegative={false}
                  currency
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Observaciones</Label>
              <Input value={logForm.observations} onChange={(e) => setLogForm({ ...logForm, observations: e.target.value })} placeholder="Observaciones (opcional)" className="h-9" />
            </div>
            <Button size="sm" onClick={handleSubmitLog} disabled={submittingLog || !logForm.performed_date}>
              {submittingLog
                ? (editingLogId ? 'Actualizando...' : 'Registrando...')
                : (editingLogId ? 'Actualizar Registro' : 'Registrar')}
            </Button>
          </div>

          {/* Log history */}
          <div className="space-y-3 pt-2">
            {logRecords.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-slate-400 text-center py-4">
                No hay registros de mantenimiento.
              </p>
            ) : (
              logRecords.map((log) => (
                <div key={log.id} className={`p-3 rounded-lg border ${editingLogId === log.id ? 'border-amber-300 dark:border-amber-700 bg-amber-50/30 dark:bg-amber-900/10' : 'border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/30'}`}>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {formatDate(log.performed_date)}
                        {log.performed_by && <span className="text-sm text-gray-500 dark:text-slate-400 ml-2">— {log.performed_by}</span>}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-slate-400">
                        {log.provider?.name && <Badge variant="secondary" className="text-xs">{log.provider.name}</Badge>}
                        {log.actual_cost != null && <span>{formatCurrency(log.actual_cost)}</span>}
                      </div>
                      {log.observations && <p className="text-xs text-gray-400">{log.observations}</p>}
                      {log.unit_ids && log.unit_ids.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="text-xs text-gray-400">Unidades:</span>
                          {log.unit_ids.map((uid) => {
                            const u = units.find((x) => x.id === uid);
                            return <Badge key={uid} variant="outline" className="text-xs">{u?.unit_number || uid.slice(0, 8)}</Badge>;
                          })}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEditLog(log)} className="text-gray-500 hover:text-blue-600 h-7 w-7 p-0">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {deletingLogId === log.id ? (
                        <div className="flex items-center gap-1">
                          <Button variant="destructive" size="sm" onClick={handleConfirmDeleteLog} className="h-7 text-xs px-2">Si</Button>
                          <Button variant="ghost" size="sm" onClick={() => setDeletingLogId(null)} className="h-7 text-xs px-2">No</Button>
                        </div>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => setDeletingLogId(log.id)} className="text-red-500 hover:text-red-700 h-7 w-7 p-0">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLogsOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
