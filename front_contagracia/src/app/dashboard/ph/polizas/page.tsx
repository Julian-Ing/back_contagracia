'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Shield,
  Plus,
  Pencil,
  Trash2,
  MoreHorizontal,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  History,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Badge } from '@/shared/components/ui/badge';
import { Select } from '@/shared/components/ui/select';
import { ThirdPartySelect } from '@/shared/components/ui/third-party-select';
import type { ThirdPartyOption } from '@/shared/components/ui/third-party-select';
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
import { insurancePoliciesService, condominiumsService } from '@/modules/ph';
import type {
  PhInsurancePolicy,
  PhInsurancePolicyInsurer,
  InsurancePolicyType,
  PhCondominium,
} from '@/modules/ph';

// ─── Constants ───

const POLICY_TYPE_OPTIONS: { value: InsurancePolicyType | ''; label: string }[] = [
  { value: '', label: 'Todos los tipos' },
  { value: 'todo_riesgo', label: 'Todo Riesgo' },
  { value: 'incendio', label: 'Incendio' },
  { value: 'terremoto', label: 'Terremoto' },
  { value: 'responsabilidad_civil', label: 'Responsabilidad Civil' },
  { value: 'otro', label: 'Otro' },
];

const POLICY_TYPE_CREATE_OPTIONS = POLICY_TYPE_OPTIONS.filter((o) => o.value !== '');

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'active', label: 'Vigente' },
  { value: 'expired', label: 'Vencida' },
  { value: 'cancelled', label: 'Cancelada' },
];

const POLICY_TYPE_LABELS: Record<string, string> = {
  todo_riesgo: 'Todo Riesgo',
  incendio: 'Incendio',
  terremoto: 'Terremoto',
  responsabilidad_civil: 'Resp. Civil',
  otro: 'Otro',
};

const INSURER_ROLE_OPTIONS = [
  { value: 'insurer', label: 'Aseguradora' },
  { value: 'broker', label: 'Corredor' },
  { value: 'adjuster', label: 'Ajustador' },
];

function formatCurrency(value: number | null | undefined) {
  if (value == null) return '-';
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
}


function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

function daysUntilExpiry(endDate: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function getTrafficLight(policy: PhInsurancePolicy) {
  if (policy.status === 'cancelled') {
    return {
      color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
      label: 'Cancelada',
      icon: <XCircle className="h-3.5 w-3.5" />,
    };
  }
  const days = daysUntilExpiry(policy.end_date);
  if (days < 0 || policy.status === 'expired') {
    return {
      color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      label: `Vencida (${Math.abs(days)}d)`,
      icon: <XCircle className="h-3.5 w-3.5" />,
    };
  }
  if (days <= 60) {
    return {
      color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      label: `${days}d para vencer`,
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
    };
  }
  return {
    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    label: 'Vigente',
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  };
}

const PAGE_SIZE = 20;

const emptyForm = {
  condominium_id: '',
  insurance_third_party_id: '',
  policy_number: '',
  insurance_company: '',
  policy_type: '' as InsurancePolicyType | '',
  coverage_amount: '',
  premium: '',
  start_date: '',
  end_date: '',
  renewal_date: '',
  document_url: '',
  notes: '',
};

export default function PolizasPage() {
  const companyId = useAuthStore((s) => s.company?.id);

  // ─── Data ───
  const [policies, setPolicies] = useState<PhInsurancePolicy[]>([]);
  const [condominiums, setCondominiums] = useState<PhCondominium[]>([]);
  const [loading, setLoading] = useState(true);

  // ─── Filters ───
  const [filterCondominium, setFilterCondominium] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);

  // ─── Dialogs ───
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<PhInsurancePolicy | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  // ─── Insurer History ───
  const [historyRecords, setHistoryRecords] = useState<PhInsurancePolicyInsurer[]>([]);

  // ─── Fetch ───
  const fetchPolicies = useCallback(async () => {
    if (!companyId) return;
    try {
      setLoading(true);
      const res = await insurancePoliciesService.getAll(companyId, { take: 200 });
      setPolicies(Array.isArray(res) ? res : res.data ?? []);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al cargar polizas');
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

  useEffect(() => {
    fetchPolicies();
    fetchCondominiums();
  }, [fetchPolicies, fetchCondominiums]);

  // ─── Client-side filtering ───
  const filteredPolicies = useMemo(() => {
    let result = policies;
    if (filterCondominium) result = result.filter((p) => p.condominium_id === filterCondominium);
    if (filterType) result = result.filter((p) => p.policy_type === filterType);
    if (filterStatus) {
      if (filterStatus === 'active') {
        result = result.filter((p) => p.status === 'active' && daysUntilExpiry(p.end_date) >= 0);
      } else if (filterStatus === 'expired') {
        result = result.filter((p) => p.status === 'expired' || daysUntilExpiry(p.end_date) < 0);
      } else {
        result = result.filter((p) => p.status === filterStatus);
      }
    }
    return result;
  }, [policies, filterCondominium, filterType, filterStatus]);

  const paginatedPolicies = filteredPolicies.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(filteredPolicies.length / PAGE_SIZE);

  useEffect(() => { setPage(1); }, [filterCondominium, filterType, filterStatus]);

  // ─── Summary cards ───
  const summary = useMemo(() => {
    let vigente = 0, porVencer = 0, vencida = 0;
    for (const p of policies) {
      if (p.status === 'cancelled') continue;
      const days = daysUntilExpiry(p.end_date);
      if (days < 0 || p.status === 'expired') vencida++;
      else if (days <= 60) porVencer++;
      else vigente++;
    }
    return { vigente, porVencer, vencida, total: policies.length };
  }, [policies]);

  // ─── Handlers ───
  const buildPayload = () => ({
    condominium_id: form.condominium_id,
    insurance_third_party_id: form.insurance_third_party_id || undefined,
    policy_number: form.policy_number,
    insurance_company: form.insurance_company,
    policy_type: form.policy_type,
    coverage_amount: form.coverage_amount ? Number(form.coverage_amount) : undefined,
    premium: form.premium ? Number(form.premium) : undefined,
    start_date: form.start_date,
    end_date: form.end_date,
    renewal_date: form.renewal_date || undefined,
    document_url: form.document_url || undefined,
    notes: form.notes || undefined,
  });

  const handleCreate = async () => {
    if (!companyId) return;
    try {
      setSubmitting(true);
      await insurancePoliciesService.create(companyId, buildPayload());
      toast.success('Poliza creada exitosamente');
      setIsCreateOpen(false);
      setForm(emptyForm);
      await fetchPolicies();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al crear poliza');
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (policy: PhInsurancePolicy) => {
    setSelectedPolicy(policy);
    setForm({
      condominium_id: policy.condominium_id,
      insurance_third_party_id: policy.insurance_third_party_id || '',
      policy_number: policy.policy_number,
      insurance_company: policy.insurance_company,
      policy_type: policy.policy_type,
      coverage_amount: policy.coverage_amount != null ? String(policy.coverage_amount) : '',
      premium: policy.premium != null ? String(policy.premium) : '',
      start_date: policy.start_date ? policy.start_date.slice(0, 10) : '',
      end_date: policy.end_date ? policy.end_date.slice(0, 10) : '',
      renewal_date: policy.renewal_date ? policy.renewal_date.slice(0, 10) : '',
      document_url: policy.document_url || '',
      notes: policy.notes || '',
    });
    setIsEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!companyId || !selectedPolicy) return;
    try {
      setSubmitting(true);
      await insurancePoliciesService.update(companyId, selectedPolicy.id, buildPayload());
      toast.success('Poliza actualizada exitosamente');
      setIsEditOpen(false);
      setSelectedPolicy(null);
      setForm(emptyForm);
      await fetchPolicies();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al actualizar poliza');
    } finally {
      setSubmitting(false);
    }
  };

  const openDelete = (policy: PhInsurancePolicy) => {
    setSelectedPolicy(policy);
    setIsDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!companyId || !selectedPolicy) return;
    try {
      setSubmitting(true);
      await insurancePoliciesService.remove(companyId, selectedPolicy.id);
      toast.success('Poliza eliminada exitosamente');
      setIsDeleteOpen(false);
      setSelectedPolicy(null);
      await fetchPolicies();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al eliminar poliza');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Insurer History Handlers ───
  const openHistory = (policy: PhInsurancePolicy) => {
    setSelectedPolicy(policy);
    setHistoryRecords(policy.insurers ?? []);
    setIsHistoryOpen(true);
  };

  const handleRemoveInsurer = async (insurerId: string) => {
    if (!companyId || !selectedPolicy) return;
    try {
      await insurancePoliciesService.removeInsurer(companyId, insurerId);
      toast.success('Registro eliminado');
      const updated = await insurancePoliciesService.getInsurers(companyId, selectedPolicy.id);
      setHistoryRecords(Array.isArray(updated) ? updated : []);
      await fetchPolicies();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al eliminar registro');
    }
  };

  // ─── Auto-fill insurance_company when selecting third party ───
  const handleSupplierChange = (id: string, thirdParty?: ThirdPartyOption) => {
    setForm((prev) => ({
      ...prev,
      insurance_third_party_id: id,
      insurance_company: thirdParty?.name || (id ? prev.insurance_company : ''),
    }));
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
        <Label>Aseguradora (tercero) *</Label>
        <ThirdPartySelect
          value={form.insurance_third_party_id || undefined}
          valueLabel={form.insurance_third_party_id && form.insurance_company ? `- ${form.insurance_company}` : undefined}
          onChange={handleSupplierChange}
          placeholder="Seleccionar aseguradora"
          excludeRoles={['EMPLOYEE', 'CONTACT', 'CLIENT', 'EPS', 'PENSION_FUND', 'COMPENSATION_FUND', 'SEVERANCE_FUND', 'SENA', 'ICBF', 'CO_OWNER', 'TENANT']}
          usePortal
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Numero de poliza *</Label>
          <Input
            value={form.policy_number}
            onChange={(e) => setForm({ ...form, policy_number: e.target.value })}
            placeholder="Ej: POL-2026-001"
          />
        </div>
        <div className="space-y-2">
          <Label>Tipo de poliza *</Label>
          <Select
            options={POLICY_TYPE_CREATE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            value={form.policy_type}
            onChange={(v) => setForm({ ...form, policy_type: v as InsurancePolicyType })}
            placeholder="Seleccionar tipo"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Cobertura (COP)</Label>
          <NumericInput
            value={form.coverage_amount}
            onChange={(e) => setForm({ ...form, coverage_amount: e.target.value })}
            placeholder="0"
            allowNegative={false}
            currency
          />
        </div>
        <div className="space-y-2">
          <Label>Prima (COP)</Label>
          <NumericInput
            value={form.premium}
            onChange={(e) => setForm({ ...form, premium: e.target.value })}
            placeholder="0"
            allowNegative={false}
            currency
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Fecha inicio *</Label>
          <DatePicker value={form.start_date} onChange={(v) => setForm({ ...form, start_date: v })} placeholder="Inicio de vigencia" usePortal />
        </div>
        <div className="space-y-2">
          <Label>Fecha vencimiento *</Label>
          <DatePicker value={form.end_date} onChange={(v) => setForm({ ...form, end_date: v })} placeholder="Fin de vigencia" usePortal />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Fecha de renovacion</Label>
        <DatePicker value={form.renewal_date} onChange={(v) => setForm({ ...form, renewal_date: v })} placeholder="Fecha de renovacion" usePortal />
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

  const isFormValid = form.condominium_id && form.policy_number && form.insurance_third_party_id && form.policy_type && form.start_date && form.end_date;

  if (loading && policies.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto" />
          <p className="text-gray-500 dark:text-slate-400">Cargando polizas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-7 w-7 text-blue-600 dark:text-blue-400" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Polizas de Seguro</h1>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Gestiona las polizas de seguro de las copropiedades
            </p>
          </div>
        </div>
        <Button onClick={() => { setForm(emptyForm); setIsCreateOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Poliza
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.total}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">Total polizas</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{summary.vigente}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">Vigentes</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{summary.porVencer}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">Por vencer</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
              <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{summary.vencida}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">Vencidas</p>
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
              options={POLICY_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              value={filterType}
              onChange={setFilterType}
              placeholder="Tipo de poliza"
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
            <span>Lista de Polizas</span>
            <Badge variant="secondary">{filteredPolicies.length} polizas</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-200 dark:border-slate-700">
                  <TableHead className="text-gray-600 dark:text-slate-300">Estado</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300">No. Poliza</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300">Tipo</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300">Aseguradora</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300">Copropiedad</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300">Cobertura</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300">Inicio</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300">Vencimiento</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedPolicies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-gray-500 dark:text-slate-400">
                      {policies.length === 0 ? 'No hay polizas registradas. Crea la primera poliza.' : 'No se encontraron polizas con los filtros aplicados'}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedPolicies.map((policy) => {
                    const traffic = getTrafficLight(policy);
                    return (
                      <TableRow key={policy.id} className="border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/40">
                        <TableCell>
                          <Badge className={`${traffic.color} flex items-center gap-1.5 w-fit`}>
                            {traffic.icon}
                            {traffic.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-gray-900 dark:text-white">{policy.policy_number}</span>
                        </TableCell>
                        <TableCell className="text-gray-600 dark:text-slate-400">
                          {POLICY_TYPE_LABELS[policy.policy_type] || policy.policy_type}
                        </TableCell>
                        <TableCell>
                          <div className="text-gray-600 dark:text-slate-400">
                            {policy.insurance_third_party?.name || policy.insurance_company}
                            {policy.insurance_third_party?.identification_number && (
                              <span className="block text-xs text-gray-400 dark:text-slate-500">
                                {policy.insurance_third_party.identification_number}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-600 dark:text-slate-400">{policy.condominium?.name || '-'}</TableCell>
                        <TableCell className="text-gray-600 dark:text-slate-400">{formatCurrency(policy.coverage_amount)}</TableCell>
                        <TableCell className="text-gray-600 dark:text-slate-400">{formatDate(policy.start_date)}</TableCell>
                        <TableCell className="text-gray-600 dark:text-slate-400">{formatDate(policy.end_date)}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm"><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEdit(policy)}>
                                <Pencil className="h-4 w-4 mr-2" /> Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openHistory(policy)}>
                                <History className="h-4 w-4 mr-2" /> Historial aseguradoras
                              </DropdownMenuItem>
                              {policy.document_url && (
                                <DropdownMenuItem onClick={() => window.open(policy.document_url!, '_blank')}>
                                  <ExternalLink className="h-4 w-4 mr-2" /> Ver documento
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => openDelete(policy)} className="text-red-600 dark:text-red-400">
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
            Pagina {page} de {totalPages} ({filteredPolicies.length} polizas)
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
          <DialogHeader><DialogTitle>Nueva Poliza de Seguro</DialogTitle></DialogHeader>
          {renderFormFields()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={submitting || !isFormValid}>
              {submitting ? 'Creando...' : 'Crear Poliza'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar Poliza de Seguro</DialogTitle></DialogHeader>
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
          <DialogHeader><DialogTitle>Eliminar Poliza</DialogTitle></DialogHeader>
          <p className="text-gray-600 dark:text-slate-400">
            Estas seguro de que deseas eliminar la poliza <strong>{selectedPolicy?.policy_number}</strong>?
          </p>
          <p className="text-sm text-gray-500 dark:text-slate-500">Esta accion no se puede deshacer.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
              {submitting ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Insurer History */}
      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Historial de Aseguradoras — {selectedPolicy?.policy_number}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {historyRecords.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-slate-400 text-center py-4">
                No hay registros en el historial.
              </p>
            ) : (
              <div className="space-y-3">
                {historyRecords.map((record) => (
                  <div key={record.id} className="flex items-start justify-between p-3 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/30">
                    <div className="space-y-1">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {record.third_party?.name || 'Tercero desconocido'}
                        {record.third_party?.identification_number && (
                          <span className="text-sm text-gray-500 dark:text-slate-400 ml-2">
                            ({record.third_party.identification_number})
                          </span>
                        )}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-slate-400">
                        <Badge variant="secondary" className="text-xs">
                          {INSURER_ROLE_OPTIONS.find((r) => r.value === record.role)?.label || record.role}
                        </Badge>
                        <span>{formatDate(record.start_date)}{record.end_date ? ` — ${formatDate(record.end_date)}` : ' — Vigente'}</span>
                      </div>
                      {record.notes && <p className="text-xs text-gray-400">{record.notes}</p>}
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleRemoveInsurer(record.id)} className="text-red-500 hover:text-red-700">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsHistoryOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
