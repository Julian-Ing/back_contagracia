'use client';

import { useState, useEffect, useMemo } from 'react';
import { useBilling, useBillingConfig, useCondominiums, useFeeConcepts, paymentsService, feesService, billingPeriodsService } from '@/modules/ph';
import { useUnits } from '@/modules/ph';
import { useAuthStore } from '@/modules/auth';
import type {
  PhBillingPeriod,
  PhBillingConfig,
  PhFee,
  PhPayment,
  BillingPeriodStatus,
  BillingConfigType,
  FeeStatus,
  FeeType,
} from '@/modules/ph';

import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/shared/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/shared/components/ui/dialog';
import { Badge } from '@/shared/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Select } from '@/shared/components/ui/select';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Switch } from '@/shared/components/ui/switch';
import { DatePicker } from '@/shared/components/ui/date-picker';

import {
  Receipt, Plus, Loader2, AlertCircle, Eye, Pencil, Trash2, Lock, Zap, Mail,
  Construction, Settings, Upload, Power, TrendingUp, TrendingDown, CircleAlert,
  CalendarDays, BarChart3, Download, DollarSign, FileDown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import ImportBillingPeriodsModal from '@/modules/ph/components/ImportBillingPeriodsModal';

// ─── Helpers ───

const formatCOP = (value: number | string) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(Number(value));

const formatDate = (date?: string | null) => {
  if (!date) return '—';
  const [y, m, d] = date.split('T')[0].split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const MONTH_OPTIONS = [
  { value: '1', label: 'Enero' },
  { value: '2', label: 'Febrero' },
  { value: '3', label: 'Marzo' },
  { value: '4', label: 'Abril' },
  { value: '5', label: 'Mayo' },
  { value: '6', label: 'Junio' },
  { value: '7', label: 'Julio' },
  { value: '8', label: 'Agosto' },
  { value: '9', label: 'Septiembre' },
  { value: '10', label: 'Octubre' },
  { value: '11', label: 'Noviembre' },
  { value: '12', label: 'Diciembre' },
];

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => {
  const y = currentYear - 2 + i;
  return { value: String(y), label: String(y) };
});

const MONTH_NAMES: Record<number, string> = {
  1: 'Enero', 2: 'Febrero', 3: 'Marzo', 4: 'Abril',
  5: 'Mayo', 6: 'Junio', 7: 'Julio', 8: 'Agosto',
  9: 'Septiembre', 10: 'Octubre', 11: 'Noviembre', 12: 'Diciembre',
};

const PERIOD_STATUS_CONFIG: Record<BillingPeriodStatus, { label: string; className: string }> = {
  draft: {
    label: 'Borrador',
    className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  },
  generated: {
    label: 'Generado',
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  },
  closed: {
    label: 'Cerrado',
    className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  },
};

const FEE_STATUS_CONFIG: Record<FeeStatus, { label: string; className: string }> = {
  pending: {
    label: 'Pendiente',
    className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  },
  partial: {
    label: 'Parcial',
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  },
  paid: {
    label: 'Pagada',
    className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  },
  overdue: {
    label: 'Vencida',
    className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  },
};

const FEE_TYPE_LABELS: Record<FeeType, string> = {
  regular: 'Regular',
  interest: 'Intereses',
  discount: 'Descuento',
  surcharge: 'Recargo',
};

const CONFIG_TYPE_CONFIG: Record<BillingConfigType, { label: string; className: string }> = {
  interest: {
    label: 'Interés por Mora',
    className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  },
  discount: {
    label: 'Descuento Pronto Pago',
    className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  },
  surcharge: {
    label: 'Recargo',
    className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  },
};

const CONFIG_TYPE_OPTIONS = [
  { value: 'interest', label: 'Interés por Mora', icon: <TrendingUp className="h-4 w-4 text-red-500" /> },
  { value: 'discount', label: 'Descuento Pronto Pago', icon: <TrendingDown className="h-4 w-4 text-green-500" /> },
  { value: 'surcharge', label: 'Recargo', icon: <CircleAlert className="h-4 w-4 text-orange-500" /> },
];

const VALUE_TYPE_OPTIONS = [
  { value: 'percentage', label: 'Porcentaje (%)' },
  { value: 'fixed_amount', label: 'Monto Fijo ($)' },
];

const CALC_PERIOD_OPTIONS = [
  { value: 'daily', label: 'Diario' },
  { value: 'monthly', label: 'Mensual' },
  { value: 'annual', label: 'Anual' },
];

const buildPeriodName = (month: string, year: string): string => {
  if (!month || !year) return '';
  const m = MONTH_NAMES[Number(month)];
  return m ? `Facturacion ${m} ${year}` : '';
};

// ─── Page ───

export default function PhBillingPage() {
  const billing = useBilling();
  const { condominiums } = useCondominiums();
  const { feeConcepts } = useFeeConcepts();
  const { units } = useUnits();

  // ─── Period Dialog State ───
  const [periodDialogOpen, setPeriodDialogOpen] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<PhBillingPeriod | null>(null);
  const [periodForm, setPeriodForm] = useState({
    condominium_id: '',
    name: '',
    year: String(new Date().getFullYear()),
    month: '',
    due_date: '',
    notes: '',
  });
  const [importOpen, setImportOpen] = useState(false);

  // ─── Generate Fees Dialog State ───
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [generatePeriodId, setGeneratePeriodId] = useState<string | null>(null);
  const [selectedConceptIds, setSelectedConceptIds] = useState<string[]>([]);
  const [generatingFees, setGeneratingFees] = useState(false);

  // ─── Fee Detail Dialog State ───
  const [feeDialogOpen, setFeeDialogOpen] = useState(false);
  const [editingFee, setEditingFee] = useState<PhFee | null>(null);

  // ─── Payment (Abono) State ───
  const companyId = useAuthStore((s) => s.company?.id);
  const [feePayments, setFeePayments] = useState<PhPayment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_method: '',
    reference: '',
    notes: '',
  });
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // ─── Fee Filters ───
  const [feeFilters, setFeeFilters] = useState({
    billing_period_id: '',
    unit_id: '',
    fee_concept_id: '',
    status: '',
    month: '',
    year: '',
  });
  const [feesLoaded, setFeesLoaded] = useState(false);

  // ─── Confirm Delete State ───
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'period' | 'fee'; id: string } | null>(null);

  // ─── Submitting ───
  const [submitting, setSubmitting] = useState(false);

  // ─── Billing Config State ───
  const billingConfig = useBillingConfig();
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<PhBillingConfig | null>(null);
  const [configFilterCondo, setConfigFilterCondo] = useState('');
  const [configFilterType, setConfigFilterType] = useState('');
  const [configForm, setConfigForm] = useState({
    condominium_id: '',
    config_type: '' as BillingConfigType | '',
    name: '',
    description: '',
    value_type: 'percentage',
    value: '',
    calculation_period: '',
    grace_days: '0',
    is_compound: false,
    max_percentage: '',
    max_amount: '',
    effective_from: '',
    effective_to: '',
    applies_to_all_concepts: true,
    fee_concept_ids: [] as string[],
    is_active: true,
  });
  const [configDeleteOpen, setConfigDeleteOpen] = useState(false);
  const [configDeleteId, setConfigDeleteId] = useState<string | null>(null);

  // ─── Send Invoices State ───
  const [sendInvoicesDialogOpen, setSendInvoicesDialogOpen] = useState(false);
  const [sendInvoicesPeriod, setSendInvoicesPeriod] = useState<PhBillingPeriod | null>(null);
  const [sendingInvoices, setSendingInvoices] = useState(false);
  const [sendResult, setSendResult] = useState<{
    total_units: number;
    sent: number;
    failed: number;
    skipped_no_email: number;
    errors?: Array<{ unit: string; error: string }>;
  } | null>(null);

  // ─── Tab ───
  const [activeTab, setActiveTab] = useState('periodos');

  // Fetch fees when switching to cuotas tab or filters change
  useEffect(() => {
    if (activeTab === 'cuotas') {
      const params: Record<string, unknown> = {};
      if (feeFilters.billing_period_id) params.billing_period_id = feeFilters.billing_period_id;
      if (feeFilters.unit_id) params.unit_id = feeFilters.unit_id;
      if (feeFilters.fee_concept_id) params.fee_concept_id = feeFilters.fee_concept_id;
      if (feeFilters.status) params.status = feeFilters.status;
      if (feeFilters.month) params.month = feeFilters.month;
      if (feeFilters.year) params.year = feeFilters.year;
      billing.fetchFees(params);
      setFeesLoaded(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, feeFilters]);

  // Refetch billing configs when tab or filters change
  useEffect(() => {
    if (activeTab === 'configuracion') {
      const params: Record<string, unknown> = {};
      if (configFilterCondo) params.condominium_id = configFilterCondo;
      if (configFilterType) params.config_type = configFilterType;
      billingConfig.fetchBillingConfigs(params);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, configFilterCondo, configFilterType]);

  // ─── Billing Config Handlers ───

  const openCreateConfig = () => {
    setEditingConfig(null);
    setConfigForm({
      condominium_id: configFilterCondo || '',
      config_type: '',
      name: '',
      description: '',
      value_type: 'percentage',
      value: '',
      calculation_period: '',
      grace_days: '0',
      is_compound: false,
      max_percentage: '',
      max_amount: '',
      effective_from: '',
      effective_to: '',
      applies_to_all_concepts: true,
      fee_concept_ids: [],
      is_active: true,
    });
    setConfigDialogOpen(true);
  };

  const openEditConfig = (config: PhBillingConfig) => {
    setEditingConfig(config);
    setConfigForm({
      condominium_id: config.condominium_id,
      config_type: config.config_type,
      name: config.name,
      description: config.description || '',
      value_type: config.value_type,
      value: String(config.value),
      calculation_period: config.calculation_period || '',
      grace_days: String(config.grace_days),
      is_compound: config.is_compound,
      max_percentage: config.max_percentage != null ? String(config.max_percentage) : '',
      max_amount: config.max_amount != null ? String(config.max_amount) : '',
      effective_from: config.effective_from ? config.effective_from.split('T')[0] : '',
      effective_to: config.effective_to ? config.effective_to.split('T')[0] : '',
      applies_to_all_concepts: config.applies_to_all_concepts,
      fee_concept_ids: config.concept_associations?.map((a) => a.fee_concept_id) ?? [],
      is_active: config.is_active,
    });
    setConfigDialogOpen(true);
  };

  const handleSaveConfig = async () => {
    if (!configForm.condominium_id || !configForm.config_type || !configForm.name || !configForm.value || !configForm.effective_from) return;
    setSubmitting(true);
    try {
      const data: Record<string, unknown> = {
        name: configForm.name,
        description: configForm.description || undefined,
        value_type: configForm.value_type,
        value: Number(configForm.value),
        grace_days: Number(configForm.grace_days) || 0,
        is_compound: configForm.is_compound,
        max_percentage: configForm.max_percentage ? Number(configForm.max_percentage) : undefined,
        max_amount: configForm.max_amount ? Number(configForm.max_amount) : undefined,
        effective_from: configForm.effective_from,
        effective_to: configForm.effective_to || undefined,
        applies_to_all_concepts: configForm.applies_to_all_concepts,
        fee_concept_ids: configForm.applies_to_all_concepts ? [] : configForm.fee_concept_ids,
        is_active: configForm.is_active,
      };

      if (configForm.config_type === 'interest') {
        data.calculation_period = configForm.calculation_period || undefined;
      }

      if (editingConfig) {
        await billingConfig.updateBillingConfig(editingConfig.id, data);
      } else {
        data.condominium_id = configForm.condominium_id;
        data.config_type = configForm.config_type;
        await billingConfig.createBillingConfig(data);
      }
      setConfigDialogOpen(false);
    } catch {
      // toast handled inside hook
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfig = async () => {
    if (!configDeleteId) return;
    setSubmitting(true);
    try {
      await billingConfig.removeBillingConfig(configDeleteId);
      setConfigDeleteOpen(false);
      setConfigDeleteId(null);
    } catch {
      // toast handled inside hook
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleConfig = async (id: string) => {
    try {
      await billingConfig.toggleBillingConfig(id);
    } catch {
      // toast handled inside hook
    }
  };

  const toggleConfigConcept = (conceptId: string) => {
    setConfigForm((f) => ({
      ...f,
      fee_concept_ids: f.fee_concept_ids.includes(conceptId)
        ? f.fee_concept_ids.filter((c) => c !== conceptId)
        : [...f.fee_concept_ids, conceptId],
    }));
  };

  // ─── Period Handlers ───

  const openCreatePeriod = () => {
    setEditingPeriod(null);
    setPeriodForm({
      condominium_id: '',
      name: '',
      year: String(new Date().getFullYear()),
      month: '',
      due_date: '',
      notes: '',
    });
    setPeriodDialogOpen(true);
  };

  const openEditPeriod = (period: PhBillingPeriod) => {
    setEditingPeriod(period);
    setPeriodForm({
      condominium_id: period.condominium_id,
      name: period.name,
      year: String(period.year),
      month: String(period.month),
      due_date: period.due_date ? period.due_date.split('T')[0] : '',
      notes: period.notes || '',
    });
    setPeriodDialogOpen(true);
  };

  const handleSavePeriod = async () => {
    if (!periodForm.condominium_id || !periodForm.name || !periodForm.year || !periodForm.month) return;
    setSubmitting(true);
    try {
      const data = {
        condominium_id: periodForm.condominium_id,
        name: periodForm.name,
        year: Number(periodForm.year),
        month: Number(periodForm.month),
        due_date: periodForm.due_date || undefined,
        notes: periodForm.notes || undefined,
      };
      if (editingPeriod) {
        await billing.updatePeriod(editingPeriod.id, data);
      } else {
        await billing.createPeriod(data);
      }
      setPeriodDialogOpen(false);
    } catch {
      // toast handled inside hook
    } finally {
      setSubmitting(false);
    }
  };

  const handleClosePeriod = async (id: string) => {
    setSubmitting(true);
    try {
      await billing.closePeriod(id);
    } catch {
      // toast handled inside hook
    } finally {
      setSubmitting(false);
    }
  };

  const openSendInvoicesDialog = (period: PhBillingPeriod) => {
    setSendInvoicesPeriod(period);
    setSendResult(null);
    setSendInvoicesDialogOpen(true);
  };

  const handleSendInvoices = async () => {
    if (!companyId || !sendInvoicesPeriod) return;
    setSendingInvoices(true);
    setSendResult(null);
    try {
      const result = await billingPeriodsService.sendInvoices(companyId, sendInvoicesPeriod.id);
      setSendResult(result);
      if (result.sent > 0) {
        toast.success(`${result.sent} factura(s) enviada(s) por email`);
      }
      if (result.failed > 0) {
        toast.error(`${result.failed} envío(s) fallido(s)`);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al enviar facturas');
    } finally {
      setSendingInvoices(false);
    }
  };

  const openGenerateDialog = (periodId: string) => {
    setGeneratePeriodId(periodId);
    setSelectedConceptIds([]);
    setGenerateDialogOpen(true);
  };

  const handleGenerateFees = async () => {
    if (!generatePeriodId || selectedConceptIds.length === 0) return;
    setGeneratingFees(true);
    try {
      await billing.generateFees(generatePeriodId, { fee_concept_ids: selectedConceptIds });
      setGenerateDialogOpen(false);
    } catch {
      // toast handled inside hook
    } finally {
      setGeneratingFees(false);
    }
  };

  const toggleConcept = (id: string) => {
    setSelectedConceptIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  // ─── Fee Handlers ───

  const openViewFee = async (fee: PhFee) => {
    setEditingFee(fee);
    setFeeDialogOpen(true);
    if (!companyId) return;
    setLoadingPayments(true);
    try {
      const payments = await paymentsService.getAll(companyId, fee.id);
      setFeePayments(Array.isArray(payments) ? payments : []);
    } catch {
      setFeePayments([]);
    } finally {
      setLoadingPayments(false);
    }
  };

  const openPaymentDialog = () => {
    setPaymentForm({ amount: '', payment_method: '', reference: '', notes: '' });
    setPaymentDialogOpen(true);
  };

  const handleCreatePayment = async () => {
    if (!companyId || !editingFee) return;
    const amount = Number(paymentForm.amount);
    if (!amount || amount <= 0) {
      toast.error('Ingrese un monto válido');
      return;
    }
    if (amount > Number(editingFee.balance)) {
      toast.error('El monto supera el saldo pendiente');
      return;
    }
    setSubmittingPayment(true);
    try {
      await paymentsService.create(companyId, editingFee.id, {
        amount,
        payment_method: paymentForm.payment_method || undefined,
        reference: paymentForm.reference || undefined,
        notes: paymentForm.notes || undefined,
      });
      toast.success('Abono registrado exitosamente');
      setPaymentDialogOpen(false);
      // Refresh fee data + payments
      const [payments, updatedFee] = await Promise.all([
        paymentsService.getAll(companyId, editingFee.id),
        feesService.getOne(companyId, editingFee.id),
      ]);
      setFeePayments(Array.isArray(payments) ? payments : []);
      setEditingFee(updatedFee);
      // Refresh fees table
      const params: Record<string, unknown> = {};
      if (feeFilters.billing_period_id) params.billing_period_id = feeFilters.billing_period_id;
      if (feeFilters.unit_id) params.unit_id = feeFilters.unit_id;
      if (feeFilters.fee_concept_id) params.fee_concept_id = feeFilters.fee_concept_id;
      if (feeFilters.status) params.status = feeFilters.status;
      if (feeFilters.month) params.month = feeFilters.month;
      if (feeFilters.year) params.year = feeFilters.year;
      billing.fetchFees(params);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al registrar abono');
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleDownloadFeePdf = async (feeId: string) => {
    if (!companyId) return;
    try {
      const blob = await feesService.downloadPdf(companyId, feeId);
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `cuota-${feeId.slice(0, 8)}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Error al generar PDF');
    }
  };

  // ─── Delete Handlers ───

  const openDeleteConfirm = (type: 'period' | 'fee', id: string) => {
    setDeleteTarget({ type, id });
    setConfirmDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      if (deleteTarget.type === 'period') {
        await billing.removePeriod(deleteTarget.id);
      } else {
        await billing.removeFee(deleteTarget.id);
        // Refetch fees
        const params: Record<string, unknown> = {};
        if (feeFilters.billing_period_id) params.billing_period_id = feeFilters.billing_period_id;
        if (feeFilters.unit_id) params.unit_id = feeFilters.unit_id;
        if (feeFilters.fee_concept_id) params.fee_concept_id = feeFilters.fee_concept_id;
        if (feeFilters.status) params.status = feeFilters.status;
        if (feeFilters.month) params.month = feeFilters.month;
        if (feeFilters.year) params.year = feeFilters.year;
        billing.fetchFees(params);
      }
      setConfirmDeleteOpen(false);
      setDeleteTarget(null);
    } catch {
      // toast handled inside hook
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Derived data ───

  const condominiumOptions = condominiums.map((c) => ({ value: c.id, label: c.name }));
  const activeConcepts = feeConcepts.filter((c) => c.is_active);

  const periodOptions = billing.periods.map((p) => ({
    value: p.id,
    label: `${p.name} (${MONTH_NAMES[p.month]} ${p.year})`,
  }));

  const unitOptions = units.map((u) => ({
    value: u.id,
    label: `${u.unit_number}${u.tower ? ' - ' + u.tower.name : ''}`,
  }));

  const conceptOptions = feeConcepts.map((c) => ({ value: c.id, label: c.name }));

  const feeStatusOptions = [
    { value: 'pending', label: 'Pendiente' },
    { value: 'partial', label: 'Parcial' },
    { value: 'paid', label: 'Pagada' },
    { value: 'overdue', label: 'Vencida' },
  ];

  // Opciones de tipo config con disabled según configs existentes para la copropiedad seleccionada
  const availableConfigTypeOptions = useMemo(() => {
    const condoId = configForm.condominium_id;
    if (!condoId || editingConfig) return CONFIG_TYPE_OPTIONS;

    const existingTypes = new Set(
      billingConfig.billingConfigs
        .filter((c) => c.condominium_id === condoId)
        .map((c) => c.config_type)
    );

    return CONFIG_TYPE_OPTIONS.map((opt) => ({
      ...opt,
      disabled: existingTypes.has(opt.value as any),
      disabledLabel: existingTypes.has(opt.value as any) ? 'Ya existe' : undefined,
    }));
  }, [configForm.condominium_id, editingConfig, billingConfig.billingConfigs]);

  // ─── Lookup helpers ───

  const getCondominiumName = (id: string) =>
    condominiums.find((c) => c.id === id)?.name ?? '—';

  // ─── Excel Exports ───

  const exportPeriodsToExcel = async () => {
    const ExcelJS = (await import('exceljs')).default;
    const { saveAs } = await import('file-saver');

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Periodos');

    ws.columns = [
      { header: 'Nombre', key: 'name', width: 30 },
      { header: 'Copropiedad', key: 'condo', width: 25 },
      { header: 'Año', key: 'year', width: 10 },
      { header: 'Mes', key: 'month', width: 15 },
      { header: 'Fecha Vencimiento', key: 'due_date', width: 20 },
      { header: 'Estado', key: 'status', width: 15 },
      { header: '# Cuotas', key: 'fees_count', width: 12 },
    ];

    const headerRow = ws.getRow(1);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF10B981' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    for (const p of billing.periods) {
      ws.addRow({
        name: p.name,
        condo: getCondominiumName(p.condominium_id),
        year: p.year,
        month: MONTH_NAMES[p.month] ?? p.month,
        due_date: p.due_date ? p.due_date.split('T')[0] : '',
        status: PERIOD_STATUS_CONFIG[p.status]?.label ?? p.status,
        fees_count: p._count?.fees ?? 0,
      });
    }

    const buffer = await wb.xlsx.writeBuffer();
    saveAs(
      new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
      `periodos_facturacion_${new Date().toISOString().split('T')[0]}.xlsx`,
    );
  };

  const exportFeesToExcel = async () => {
    const ExcelJS = (await import('exceljs')).default;
    const { saveAs } = await import('file-saver');

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Cuotas');

    ws.columns = [
      { header: 'Periodo', key: 'period', width: 28 },
      { header: 'Unidad', key: 'unit', width: 15 },
      { header: 'Concepto', key: 'concept', width: 25 },
      { header: 'Monto', key: 'amount', width: 18 },
      { header: 'Saldo', key: 'balance', width: 18 },
      { header: 'Estado', key: 'status', width: 15 },
      { header: 'Tipo', key: 'fee_type', width: 15 },
      { header: 'Vencimiento', key: 'due_date', width: 18 },
    ];

    const headerRow = ws.getRow(1);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6366F1' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    for (const f of billing.fees) {
      ws.addRow({
        period: f.billing_period?.name ?? '—',
        unit: f.unit?.unit_number ?? '—',
        concept: f.fee_concept?.name ?? '—',
        amount: Number(f.amount),
        balance: Number(f.balance),
        status: FEE_STATUS_CONFIG[f.status]?.label ?? f.status,
        fee_type: FEE_TYPE_LABELS[f.fee_type] ?? f.fee_type,
        due_date: f.due_date ? f.due_date.split('T')[0] : '',
      });
    }

    // Format currency columns
    ws.getColumn('amount').numFmt = '#,##0';
    ws.getColumn('balance').numFmt = '#,##0';

    const buffer = await wb.xlsx.writeBuffer();
    saveAs(
      new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
      `cuotas_facturacion_${new Date().toISOString().split('T')[0]}.xlsx`,
    );
  };

  return (
    <div className="p-6">
      {/* Header */}
      <header className="mb-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 grid place-items-center rounded-lg bg-emerald-500 text-white">
            <Receipt className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-bold">Facturación PH</h1>
        </div>
      </header>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="periodos"><CalendarDays className="h-4 w-4 mr-1.5" />Periodos</TabsTrigger>
          <TabsTrigger value="cuotas"><Receipt className="h-4 w-4 mr-1.5" />Cuotas</TabsTrigger>
          <TabsTrigger value="cartera"><BarChart3 className="h-4 w-4 mr-1.5" />Cartera</TabsTrigger>
          <TabsTrigger value="configuracion"><Settings className="h-4 w-4 mr-1.5" />Configuración</TabsTrigger>
        </TabsList>

        {/* ═══════════════════ TAB: PERIODOS ═══════════════════ */}
        <TabsContent value="periodos">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Periodos de Facturación</h2>
            <div className="flex gap-2">
              <Button variant="outline" onClick={exportPeriodsToExcel} disabled={billing.periods.length === 0} className="gap-2">
                <Download className="h-4 w-4" />
                Exportar Excel
              </Button>
              <Button variant="outline" onClick={() => setImportOpen(true)} className="gap-2">
                <Upload className="h-4 w-4" />
                Importar Excel
              </Button>
              <Button onClick={openCreatePeriod}>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Periodo
              </Button>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              {billing.loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : billing.error ? (
                <div className="flex items-center justify-center py-12 gap-2 text-red-500">
                  <AlertCircle className="h-5 w-5" />
                  <span>{billing.error}</span>
                </div>
              ) : billing.periods.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No se encontraron periodos de facturación
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Copropiedad</TableHead>
                      <TableHead>Año</TableHead>
                      <TableHead>Mes</TableHead>
                      <TableHead>Fecha Vencimiento</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-center"># Cuotas</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {billing.periods.map((period) => (
                      <TableRow key={period.id}>
                        <TableCell className="font-medium">{period.name}</TableCell>
                        <TableCell>{getCondominiumName(period.condominium_id)}</TableCell>
                        <TableCell>{period.year}</TableCell>
                        <TableCell>{MONTH_NAMES[period.month] ?? period.month}</TableCell>
                        <TableCell>{formatDate(period.due_date)}</TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${PERIOD_STATUS_CONFIG[period.status]?.className ?? ''}`}
                          >
                            {PERIOD_STATUS_CONFIG[period.status]?.label ?? period.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          {period._count?.fees ?? 0}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              title="Ver"
                              onClick={() => openEditPeriod(period)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              title="Editar"
                              onClick={() => openEditPeriod(period)}
                              disabled={period.status === 'closed'}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              title="Generar Cuotas"
                              onClick={() => openGenerateDialog(period.id)}
                              disabled={period.status === 'closed'}
                            >
                              <Zap className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              title="Enviar Facturas por Email"
                              onClick={() => openSendInvoicesDialog(period)}
                              disabled={period.status === 'draft'}
                            >
                              <Mail className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              title="Cerrar Periodo"
                              onClick={() => handleClosePeriod(period.id)}
                              disabled={period.status === 'closed' || submitting}
                            >
                              <Lock className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              title="Eliminar"
                              onClick={() => openDeleteConfirm('period', period.id)}
                              disabled={period.status === 'closed'}
                              className="text-red-500 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════════ TAB: CUOTAS ═══════════════════ */}
        <TabsContent value="cuotas">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Cuotas</h2>
            <Button variant="outline" onClick={exportFeesToExcel} disabled={billing.fees.length === 0} className="gap-2">
              <Download className="h-4 w-4" />
              Exportar Excel
            </Button>
          </div>

          {/* Filters */}
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <div className="w-56">
              <Label className="text-xs mb-1 block">Periodo</Label>
              <Select
                options={[{ value: '', label: 'Todos' }, ...periodOptions]}
                value={feeFilters.billing_period_id}
                onChange={(v) => setFeeFilters((f) => ({ ...f, billing_period_id: v }))}
                placeholder="Todos los periodos"
                searchable
              />
            </div>
            <div className="w-48">
              <Label className="text-xs mb-1 block">Unidad</Label>
              <Select
                options={[{ value: '', label: 'Todas' }, ...unitOptions]}
                value={feeFilters.unit_id}
                onChange={(v) => setFeeFilters((f) => ({ ...f, unit_id: v }))}
                placeholder="Todas las unidades"
                searchable
              />
            </div>
            <div className="w-48">
              <Label className="text-xs mb-1 block">Concepto</Label>
              <Select
                options={[{ value: '', label: 'Todos' }, ...conceptOptions]}
                value={feeFilters.fee_concept_id}
                onChange={(v) => setFeeFilters((f) => ({ ...f, fee_concept_id: v }))}
                placeholder="Todos los conceptos"
                searchable
              />
            </div>
            <div className="w-40">
              <Label className="text-xs mb-1 block">Estado</Label>
              <Select
                options={[{ value: '', label: 'Todos' }, ...feeStatusOptions]}
                value={feeFilters.status}
                onChange={(v) => setFeeFilters((f) => ({ ...f, status: v }))}
                placeholder="Todos"
              />
            </div>
            <div className="w-40">
              <Label className="text-xs mb-1 block">Mes</Label>
              <Select
                options={[{ value: '', label: 'Todos' }, ...MONTH_OPTIONS]}
                value={feeFilters.month}
                onChange={(v) => setFeeFilters((f) => ({ ...f, month: v }))}
                placeholder="Todos"
              />
            </div>
            <div className="w-32">
              <Label className="text-xs mb-1 block">Año</Label>
              <Select
                options={[{ value: '', label: 'Todos' }, ...YEAR_OPTIONS]}
                value={feeFilters.year}
                onChange={(v) => setFeeFilters((f) => ({ ...f, year: v }))}
                placeholder="Todos"
              />
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              {billing.loading && !feesLoaded ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : billing.error ? (
                <div className="flex items-center justify-center py-12 gap-2 text-red-500">
                  <AlertCircle className="h-5 w-5" />
                  <span>{billing.error}</span>
                </div>
              ) : billing.fees.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No se encontraron cuotas. Seleccione filtros o genere cuotas desde un periodo.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Periodo</TableHead>
                      <TableHead>Unidad</TableHead>
                      <TableHead>Concepto</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                      <TableHead className="text-right">Saldo</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Vencimiento</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {billing.fees.map((fee) => (
                      <TableRow key={fee.id}>
                        <TableCell className="text-sm">
                          {fee.billing_period?.name ?? '—'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {fee.unit?.unit_number ?? '—'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {fee.fee_concept?.name ?? '—'}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {formatCOP(fee.amount)}
                        </TableCell>
                        <TableCell
                          className={`text-right tabular-nums ${fee.balance === 0 ? 'text-muted-foreground' : 'font-medium'}`}
                        >
                          {formatCOP(fee.balance)}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${FEE_STATUS_CONFIG[fee.status]?.className ?? ''}`}
                          >
                            {FEE_STATUS_CONFIG[fee.status]?.label ?? fee.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">
                          {FEE_TYPE_LABELS[fee.fee_type] ?? fee.fee_type}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDate(fee.due_date)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              title="Ver detalle"
                              onClick={() => openViewFee(fee)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {fee.status !== 'paid' && (fee.status as string) !== 'cancelled' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                title="Registrar abono"
                                onClick={() => openViewFee(fee)}
                                className="text-green-600 hover:text-green-700"
                              >
                                <DollarSign className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              title="Eliminar"
                              onClick={() => openDeleteConfirm('fee', fee.id)}
                              className="text-red-500 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════════ TAB: CARTERA (placeholder) ═══════════════════ */}
        <TabsContent value="cartera">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Construction className="h-5 w-5 text-amber-500" />
                Cartera
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Módulo de cartera en desarrollo. Próximamente: análisis por edades, tendencias y reportes financieros.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════════ TAB: CONFIGURACIÓN ═══════════════════ */}
        <TabsContent value="configuracion">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Configuración de Facturación</h2>
            <Button onClick={openCreateConfig}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Configuración
            </Button>
          </div>

          {/* Filters */}
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <div className="w-56">
              <Label className="text-xs mb-1 block">Copropiedad</Label>
              <Select
                options={[{ value: '', label: 'Todas' }, ...condominiumOptions]}
                value={configFilterCondo}
                onChange={setConfigFilterCondo}
                placeholder="Todas las copropiedades"
                searchable
              />
            </div>
            <div className="w-48">
              <Label className="text-xs mb-1 block">Tipo</Label>
              <Select
                options={[{ value: '', label: 'Todos' }, ...CONFIG_TYPE_OPTIONS]}
                value={configFilterType}
                onChange={setConfigFilterType}
                placeholder="Todos los tipos"
              />
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              {billingConfig.loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : billingConfig.error ? (
                <div className="flex items-center justify-center py-12 gap-2 text-red-500">
                  <AlertCircle className="h-5 w-5" />
                  <span>{billingConfig.error}</span>
                </div>
              ) : billingConfig.billingConfigs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No se encontraron configuraciones. Cree una nueva configuración de interés, descuento o recargo.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Copropiedad</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Días Gracia</TableHead>
                      <TableHead>Vigencia</TableHead>
                      <TableHead>Conceptos</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {billingConfig.billingConfigs.map((config) => (
                      <TableRow key={config.id}>
                        <TableCell className="font-medium">{config.name}</TableCell>
                        <TableCell>{config.condominium?.name ?? getCondominiumName(config.condominium_id)}</TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${CONFIG_TYPE_CONFIG[config.config_type]?.className ?? ''}`}
                          >
                            {CONFIG_TYPE_CONFIG[config.config_type]?.label ?? config.config_type}
                          </span>
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {config.value_type === 'percentage'
                            ? `${config.value}%`
                            : formatCOP(config.value)}
                        </TableCell>
                        <TableCell className="text-center">{config.grace_days}</TableCell>
                        <TableCell className="text-sm">
                          {formatDate(config.effective_from)}
                          {config.effective_to ? ` — ${formatDate(config.effective_to)}` : ' — Indefinida'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {config.applies_to_all_concepts
                            ? 'Todos'
                            : `${config.concept_associations?.length ?? 0} concepto(s)`}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              config.is_active
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                            }`}
                          >
                            {config.is_active ? 'Activa' : 'Inactiva'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              title="Editar"
                              onClick={() => openEditConfig(config)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              title={config.is_active ? 'Desactivar' : 'Activar'}
                              onClick={() => handleToggleConfig(config.id)}
                            >
                              <Power className={`h-4 w-4 ${config.is_active ? 'text-green-500' : 'text-gray-400'}`} />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              title="Eliminar"
                              onClick={() => { setConfigDeleteId(config.id); setConfigDeleteOpen(true); }}
                              className="text-red-500 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ═══════════════════ DIALOG: Crear / Editar Periodo ═══════════════════ */}
      <Dialog open={periodDialogOpen} onOpenChange={setPeriodDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingPeriod ? 'Editar Periodo' : 'Nuevo Periodo de Facturación'}
            </DialogTitle>
            <DialogDescription>
              {editingPeriod
                ? 'Actualice los datos del periodo de facturación.'
                : 'Complete los datos para crear un nuevo periodo.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Copropiedad *</Label>
              <Select
                options={condominiumOptions}
                value={periodForm.condominium_id}
                onChange={(v) => setPeriodForm((f) => ({ ...f, condominium_id: v }))}
                placeholder="Seleccione copropiedad"
                searchable
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Año *</Label>
                <Input
                  type="number"
                  value={periodForm.year}
                  onChange={(e) => {
                    const year = e.target.value;
                    setPeriodForm((f) => {
                      const autoName = buildPeriodName(f.month, year);
                      return { ...f, year, name: autoName || f.name };
                    });
                  }}
                  placeholder="2026"
                />
              </div>
              <div className="grid gap-2">
                <Label>Mes *</Label>
                <Select
                  options={MONTH_OPTIONS}
                  value={periodForm.month}
                  onChange={(v) => {
                    setPeriodForm((f) => {
                      const autoName = buildPeriodName(v, f.year);
                      return { ...f, month: v, name: autoName || f.name };
                    });
                  }}
                  placeholder="Seleccione mes"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Nombre *</Label>
              <Input
                value={periodForm.name}
                onChange={(e) => setPeriodForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Se auto-genera al seleccionar mes y año"
              />
              <p className="text-xs text-muted-foreground">Se genera automaticamente, pero puedes editarlo.</p>
            </div>
            <div className="grid gap-2">
              <Label>Fecha de Vencimiento</Label>
              <DatePicker
                value={periodForm.due_date}
                onChange={(v) => setPeriodForm((f) => ({ ...f, due_date: v }))}
                placeholder="Seleccionar fecha de vencimiento"
                clearable
              />
            </div>
            <div className="grid gap-2">
              <Label>Notas</Label>
              <Input
                value={periodForm.notes}
                onChange={(e) => setPeriodForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Notas opcionales sobre este periodo"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPeriodDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSavePeriod}
              disabled={
                submitting ||
                !periodForm.condominium_id ||
                !periodForm.name ||
                !periodForm.year ||
                !periodForm.month
              }
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingPeriod ? 'Actualizar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════ DIALOG: Generar Cuotas ═══════════════════ */}
      <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Generar Cuotas</DialogTitle>
            <DialogDescription>
              Seleccione los conceptos de cuota activos que desea generar para este periodo.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            {activeConcepts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No hay conceptos de cuota activos. Cree conceptos en el módulo de PH primero.
              </p>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {activeConcepts.map((concept) => (
                  <div key={concept.id} className="flex items-center gap-3">
                    <Checkbox
                      id={`concept-${concept.id}`}
                      checked={selectedConceptIds.includes(concept.id)}
                      onCheckedChange={() => toggleConcept(concept.id)}
                    />
                    <label
                      htmlFor={`concept-${concept.id}`}
                      className="text-sm font-medium leading-none cursor-pointer select-none"
                    >
                      {concept.name}
                      {concept.default_amount != null && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          ({formatCOP(concept.default_amount)})
                        </span>
                      )}
                      {concept.code && (
                        <span className="ml-2 text-xs text-muted-foreground font-mono">
                          [{concept.code}]
                        </span>
                      )}
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleGenerateFees}
              disabled={generatingFees || selectedConceptIds.length === 0}
            >
              {generatingFees && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Generar Cuotas ({selectedConceptIds.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════ DIALOG: Ver Cuota + Pagos ═══════════════════ */}
      <Dialog open={feeDialogOpen} onOpenChange={setFeeDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalle de Cuota</DialogTitle>
            <DialogDescription>
              Información de la cuota y pagos registrados.
            </DialogDescription>
          </DialogHeader>

          {editingFee && (
            <div className="grid gap-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Periodo</Label>
                  <p className="text-sm font-medium">{editingFee.billing_period?.name ?? '—'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Unidad</Label>
                  <p className="text-sm font-medium">{editingFee.unit?.unit_number ?? '—'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Concepto</Label>
                  <p className="text-sm font-medium">{editingFee.fee_concept?.name ?? '—'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Tipo</Label>
                  <p className="text-sm font-medium">{FEE_TYPE_LABELS[editingFee.fee_type] ?? editingFee.fee_type}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Monto</Label>
                  <p className="text-sm font-semibold tabular-nums">{formatCOP(editingFee.amount)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Saldo</Label>
                  <p className={`text-sm tabular-nums ${editingFee.balance === 0 ? 'text-muted-foreground' : 'font-semibold'}`}>
                    {formatCOP(editingFee.balance)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Estado</Label>
                  <div className="mt-1">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${FEE_STATUS_CONFIG[editingFee.status]?.className ?? ''}`}>
                      {FEE_STATUS_CONFIG[editingFee.status]?.label ?? editingFee.status}
                    </span>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Vencimiento</Label>
                  <p className="text-sm font-medium">{formatDate(editingFee.due_date)}</p>
                </div>
              </div>

              {editingFee.notes && (
                <div>
                  <Label className="text-xs text-muted-foreground">Notas</Label>
                  <p className="text-sm">{editingFee.notes}</p>
                </div>
              )}

              {/* ─── Sección Pagos/Abonos ─── */}
              <div className="border-t pt-3 mt-1">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-semibold">Pagos / Abonos</Label>
                  {editingFee.status !== 'paid' && (editingFee.status as string) !== 'cancelled' && (
                    <Button size="sm" variant="outline" className="gap-1" onClick={openPaymentDialog}>
                      <DollarSign className="h-3.5 w-3.5" />
                      Registrar Abono
                    </Button>
                  )}
                </div>

                {loadingPayments ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : feePayments.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">No hay pagos registrados.</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {feePayments.map((p) => (
                      <div key={p.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                        <div>
                          <p className="font-medium tabular-nums">{formatCOP(p.amount)}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(p.payment_date)}
                            {p.payment_method && ` · ${p.payment_method}`}
                            {p.reference && ` · Ref: ${p.reference}`}
                          </p>
                          {p.notes && <p className="text-xs text-muted-foreground mt-0.5">{p.notes}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setFeeDialogOpen(false)}>
              Cerrar
            </Button>
            {editingFee && (
              <Button variant="outline" className="gap-1" onClick={() => handleDownloadFeePdf(editingFee.id)}>
                <FileDown className="h-4 w-4" />
                Descargar PDF
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════ DIALOG: Registrar Abono ═══════════════════ */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Registrar Abono</DialogTitle>
            <DialogDescription>
              {editingFee && (
                <>Saldo pendiente: <span className="font-semibold">{formatCOP(editingFee.balance)}</span></>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div>
              <Label className="text-xs mb-1 block">Monto *</Label>
              <Input
                type="number"
                min={1}
                max={editingFee ? Number(editingFee.balance) : undefined}
                placeholder="0"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm((f) => ({ ...f, amount: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Método de pago</Label>
              <Select
                options={[
                  { value: '', label: 'Seleccionar...' },
                  { value: 'efectivo', label: 'Efectivo' },
                  { value: 'transferencia', label: 'Transferencia' },
                  { value: 'consignacion', label: 'Consignación' },
                  { value: 'tarjeta', label: 'Tarjeta' },
                  { value: 'cheque', label: 'Cheque' },
                ]}
                value={paymentForm.payment_method}
                onChange={(v) => setPaymentForm((f) => ({ ...f, payment_method: v }))}
                placeholder="Seleccionar..."
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Referencia / Comprobante</Label>
              <Input
                placeholder="Número de referencia"
                value={paymentForm.reference}
                onChange={(e) => setPaymentForm((f) => ({ ...f, reference: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Notas</Label>
              <Input
                placeholder="Notas adicionales"
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)} disabled={submittingPayment}>
              Cancelar
            </Button>
            <Button onClick={handleCreatePayment} disabled={submittingPayment || !paymentForm.amount}>
              {submittingPayment ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <DollarSign className="h-4 w-4 mr-2" />}
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════ DIALOG: Confirmar Eliminación ═══════════════════ */}
      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar Eliminación</DialogTitle>
            <DialogDescription>
              {deleteTarget?.type === 'period'
                ? 'Esta acción eliminará el periodo y todas las cuotas asociadas. Esta acción no se puede deshacer.'
                : 'Esta acción eliminará la cuota seleccionada. Esta acción no se puede deshacer.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={submitting}
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════ DIALOG: Crear / Editar Config ═══════════════════ */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingConfig ? 'Editar Configuración' : 'Nueva Configuración'}
            </DialogTitle>
            <DialogDescription>
              {editingConfig
                ? 'Actualice los datos de la configuración.'
                : 'Configure interés por mora, descuento pronto pago o recargo.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {/* Copropiedad */}
            {!editingConfig && !configFilterCondo && (
              <div className="grid gap-2">
                <Label>Copropiedad *</Label>
                <Select
                  options={condominiumOptions}
                  value={configForm.condominium_id}
                  onChange={(v) => {
                    const existingTypes = new Set(
                      billingConfig.billingConfigs
                        .filter((c) => c.condominium_id === v)
                        .map((c) => c.config_type)
                    );
                    setConfigForm((f) => ({
                      ...f,
                      condominium_id: v,
                      config_type: existingTypes.has(f.config_type as any) ? '' : f.config_type,
                    }));
                  }}
                  placeholder="Seleccione copropiedad"
                  searchable
                />
              </div>
            )}

            {/* Copropiedad read-only (viene del filtro o edición) */}
            {(editingConfig || (!editingConfig && configFilterCondo)) && (
              <div className={editingConfig ? 'grid grid-cols-2 gap-4' : ''}>
                <div>
                  <Label className="text-xs text-muted-foreground">Copropiedad</Label>
                  <p className="text-sm font-medium">
                    {editingConfig
                      ? (editingConfig.condominium?.name ?? getCondominiumName(editingConfig.condominium_id))
                      : getCondominiumName(configFilterCondo)}
                  </p>
                </div>
                {editingConfig && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Tipo</Label>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${CONFIG_TYPE_CONFIG[editingConfig.config_type]?.className ?? ''}`}>
                      {CONFIG_TYPE_CONFIG[editingConfig.config_type]?.label}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Tipo de Configuración (solo al crear) */}
            {!editingConfig && (
              <div className="grid gap-2">
                <Label>Tipo de Configuración *</Label>
                <Select
                  options={availableConfigTypeOptions}
                  value={configForm.config_type}
                  onChange={(v) => setConfigForm((f) => ({ ...f, config_type: v as BillingConfigType }))}
                  placeholder="Seleccione tipo"
                />
              </div>
            )}

            {/* Nombre */}
            <div className="grid gap-2">
              <Label>Nombre *</Label>
              <Input
                value={configForm.name}
                onChange={(e) => setConfigForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ej: Interés mora 1.5% mensual"
              />
            </div>

            {/* Descripción */}
            <div className="grid gap-2">
              <Label>Descripción</Label>
              <Input
                value={configForm.description}
                onChange={(e) => setConfigForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Descripción opcional"
              />
            </div>

            {/* Valor tipo + Valor */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Tipo de Valor *</Label>
                <Select
                  options={VALUE_TYPE_OPTIONS}
                  value={configForm.value_type}
                  onChange={(v) => setConfigForm((f) => ({ ...f, value_type: v }))}
                />
              </div>
              <div className="grid gap-2">
                <Label>Valor *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={configForm.value}
                  onChange={(e) => setConfigForm((f) => ({ ...f, value: e.target.value }))}
                  placeholder={configForm.value_type === 'percentage' ? 'Ej: 1.5' : 'Ej: 50000'}
                />
              </div>
            </div>

            {/* Período de cálculo (solo interest) */}
            {(configForm.config_type || editingConfig?.config_type) === 'interest' && (
              <div className="grid gap-2">
                <Label>Periodo de Cálculo</Label>
                <Select
                  options={CALC_PERIOD_OPTIONS}
                  value={configForm.calculation_period}
                  onChange={(v) => setConfigForm((f) => ({ ...f, calculation_period: v }))}
                  placeholder="Seleccione periodo"
                />
              </div>
            )}

            {/* Días de gracia */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Días de Gracia</Label>
                <Input
                  type="number"
                  min="0"
                  value={configForm.grace_days}
                  onChange={(e) => setConfigForm((f) => ({ ...f, grace_days: e.target.value }))}
                  placeholder="0"
                />
              </div>

              {/* Interés compuesto (solo interest) */}
              {(configForm.config_type || editingConfig?.config_type) === 'interest' && (
                <div className="flex items-center gap-3 pt-6">
                  <Switch
                    id="is_compound"
                    checked={configForm.is_compound}
                    onCheckedChange={(v) => setConfigForm((f) => ({ ...f, is_compound: v }))}
                  />
                  <Label htmlFor="is_compound" className="cursor-pointer">Interés Compuesto</Label>
                </div>
              )}
            </div>

            {/* Max porcentaje + Max monto */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Máx. Porcentaje</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={configForm.max_percentage}
                  onChange={(e) => setConfigForm((f) => ({ ...f, max_percentage: e.target.value }))}
                  placeholder="Sin límite"
                />
              </div>
              <div className="grid gap-2">
                <Label>Máx. Monto</Label>
                <Input
                  type="number"
                  min="0"
                  value={configForm.max_amount}
                  onChange={(e) => setConfigForm((f) => ({ ...f, max_amount: e.target.value }))}
                  placeholder="Sin límite"
                />
              </div>
            </div>

            {/* Vigencia */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Vigencia Desde *</Label>
                <DatePicker
                  value={configForm.effective_from}
                  onChange={(v) => setConfigForm((f) => ({ ...f, effective_from: v }))}
                  placeholder="Fecha inicio"
                />
              </div>
              <div className="grid gap-2">
                <Label>Vigencia Hasta</Label>
                <DatePicker
                  value={configForm.effective_to}
                  onChange={(v) => setConfigForm((f) => ({ ...f, effective_to: v }))}
                  placeholder="Indefinida"
                  clearable
                />
              </div>
            </div>

            {/* Aplica a todos los conceptos */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Switch
                  id="applies_to_all"
                  checked={configForm.applies_to_all_concepts}
                  onCheckedChange={(v) => setConfigForm((f) => ({ ...f, applies_to_all_concepts: v }))}
                />
                <Label htmlFor="applies_to_all" className="cursor-pointer">
                  Aplica a todos los conceptos de cobro
                </Label>
              </div>

              {!configForm.applies_to_all_concepts && (
                <div className="border rounded-md p-3 space-y-2 max-h-40 overflow-y-auto">
                  <p className="text-xs text-muted-foreground mb-2">Seleccione los conceptos:</p>
                  {feeConcepts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No hay conceptos disponibles.</p>
                  ) : (
                    feeConcepts.map((concept) => (
                      <div key={concept.id} className="flex items-center gap-3">
                        <Checkbox
                          id={`config-concept-${concept.id}`}
                          checked={configForm.fee_concept_ids.includes(concept.id)}
                          onCheckedChange={() => toggleConfigConcept(concept.id)}
                        />
                        <label
                          htmlFor={`config-concept-${concept.id}`}
                          className="text-sm cursor-pointer select-none"
                        >
                          {concept.name}
                          {concept.code && (
                            <span className="ml-2 text-xs text-muted-foreground font-mono">[{concept.code}]</span>
                          )}
                        </label>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Estado activo */}
            <div className="flex items-center gap-3">
              <Switch
                id="config_is_active"
                checked={configForm.is_active}
                onCheckedChange={(v) => setConfigForm((f) => ({ ...f, is_active: v }))}
              />
              <Label htmlFor="config_is_active" className="cursor-pointer">Activa</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSaveConfig}
              disabled={
                submitting ||
                (!editingConfig && (!configForm.condominium_id || !configForm.config_type)) ||
                !configForm.name ||
                !configForm.value ||
                !configForm.effective_from
              }
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingConfig ? 'Actualizar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════ DIALOG: Confirmar Eliminar Config ═══════════════════ */}
      <Dialog open={configDeleteOpen} onOpenChange={setConfigDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar Eliminación</DialogTitle>
            <DialogDescription>
              Esta acción eliminará la configuración y sus asociaciones con conceptos. Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfig}
              disabled={submitting}
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════ Import Billing Periods from Excel ═══════════════════ */}
      <ImportBillingPeriodsModal
        open={importOpen}
        onOpenChange={setImportOpen}
        onSuccess={() => billing.fetchPeriods()}
        condominiums={condominiums}
      />

      {/* ═══════════════════ Send Invoices Dialog ═══════════════════ */}
      <Dialog open={sendInvoicesDialogOpen} onOpenChange={(open) => {
        if (!sendingInvoices) {
          setSendInvoicesDialogOpen(open);
          if (!open) setSendResult(null);
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {sendResult ? 'Resultado del Envío' : 'Enviar Facturas por Email'}
            </DialogTitle>
            <DialogDescription>
              {sendResult
                ? 'Resumen del envío masivo de facturas.'
                : 'Se generarán los PDFs y se enviarán por email a cada residente.'}
            </DialogDescription>
          </DialogHeader>

          {!sendResult ? (
            <>
              <div className="space-y-3 py-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-slate-400">Periodo:</span>
                  <span className="font-medium">{sendInvoicesPeriod?.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-slate-400">Cuotas:</span>
                  <span className="font-medium">{sendInvoicesPeriod?._count?.fees ?? 0}</span>
                </div>
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-sm text-amber-700 dark:text-amber-400">
                  <AlertCircle className="h-4 w-4 inline mr-1" />
                  Se enviará un email por unidad con los PDFs de sus cuotas adjuntos.
                  Los residentes sin email registrado serán omitidos.
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSendInvoicesDialogOpen(false)} disabled={sendingInvoices}>
                  Cancelar
                </Button>
                <Button onClick={handleSendInvoices} disabled={sendingInvoices}>
                  {sendingInvoices ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      Enviar Facturas
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <div className="space-y-3 py-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-center">
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{sendResult.total_units}</p>
                    <p className="text-xs text-blue-600/70 dark:text-blue-400/70">Total Unidades</p>
                  </div>
                  <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-center">
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">{sendResult.sent}</p>
                    <p className="text-xs text-green-600/70 dark:text-green-400/70">Enviadas</p>
                  </div>
                  <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-center">
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">{sendResult.failed}</p>
                    <p className="text-xs text-red-600/70 dark:text-red-400/70">Fallidas</p>
                  </div>
                  <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800 text-center">
                    <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">{sendResult.skipped_no_email}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">Sin Email</p>
                  </div>
                </div>
                {sendResult.errors && sendResult.errors.length > 0 && (
                  <div className="mt-3 max-h-32 overflow-y-auto">
                    <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-1">Errores:</p>
                    {sendResult.errors.map((e, i) => (
                      <p key={i} className="text-xs text-red-500 dark:text-red-400">
                        Unidad {e.unit}: {e.error}
                      </p>
                    ))}
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button onClick={() => { setSendInvoicesDialogOpen(false); setSendResult(null); }}>
                  Cerrar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
