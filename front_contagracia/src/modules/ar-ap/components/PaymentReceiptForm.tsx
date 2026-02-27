'use client';

import React, { useState, useCallback, useMemo, useEffect, useContext, useRef } from 'react';
import Decimal from 'decimal.js';
import { CompanySettingsContext } from '@/shared/providers/CompanySettingsProvider';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/shared/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/shared/components/ui/table';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { DatePicker } from '@/shared/components/ui/date-picker';
import { ThirdPartySelect } from '@/shared/components/ui/third-party-select';
import { BankAccountSelect, type BankAccountOption } from '@/shared/components/ui/bank-account-select';
import { AccountSelect } from '@/shared/components/ui/account-select';
import { PaymentMethodSelect } from '@/shared/components/ui/payment-method-select';
import { NumericInput } from '@/shared/components/ui/numeric-input';
import { Trash2, Loader2, FileText, Landmark, Gift, BookOpen, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { FormattedNumber, useFormatNumber } from '@/shared/components/ui/formatted-number';
import { useCompanyModules } from '@/shared/hooks/useCompanyModules';
import { SearchableSelect } from '@/shared/components/ui/searchable-select';
import { costCentersService, useCostCenterTree, CostCenterCascadeSelect } from '@/modules/cost-centers';
import { paymentReceiptsService } from '../services/paymentReceipts.service';
import SelectArApDocumentModal, { type SelectedDocument } from '@/app/dashboard/accounting/journal-entries/new/SelectArApDocumentModal';
import SelectPrepaymentModal, { type SelectedPrepayment } from '@/app/dashboard/accounting/journal-entries/new/SelectPrepaymentModal';
import type { ArApType, PrepaymentType } from '../types';

/* ── Types ────────────────────────────────────────────────── */

type LineKind = 'DOC' | 'BANK' | 'PREP_USED' | 'ACCOUNT' | 'CXC_CREATED' | 'CXP_CREATED' | 'PREP_CREATED';
type LineSide = 'DEBIT' | 'CREDIT';

interface ReceiptLine {
  id: string;
  kind: LineKind;
  ref_id: string;
  ref_label: string;
  ref_max_amount: number;
  account_code: string;
  account_label: string;
  account_resolving: boolean;
  side: LineSide;
  amount: string;
  company_payment_method_id: string;
  company_payment_method_label: string;
  description: string;
  /** Tipo de origen (ej: "Asiento Manual", "Factura de Venta") */
  source_description?: string;
  cost_center_id: string;
  cost_center_label: string;
  cost_center_path: string[];
  cost_center_movement_type_key: string;
  cost_center_movement_type_label: string;
}

export interface PaymentReceiptFormProps {
  open: boolean;
  onClose: () => void;
  type: 'RECEIVABLE' | 'PAYABLE';
  onSuccess?: () => void;
  /** Pre-fill third party when opening from a specific row */
  initialThirdParty?: { id: string; name: string; document: string | null };
  /** Pre-fill a document line when opening from balance detail */
  initialDocument?: {
    id: string;
    balance: number;
    consecutive: string | null;
    source_description: string;
    source_number: string | null;
    account_code: string | null;
    account_name: string | null;
    description: string | null;
  };
  /** ID del recibo existente para modo lectura/anulación */
  receiptId?: string;
  /** Modo del form: create (default), view (solo lectura), reverse (lectura + botón anular), edit (editable con datos existentes) */
  mode?: 'create' | 'view' | 'reverse' | 'edit';
}

/* ── Helpers ──────────────────────────────────────────────── */

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function getAutoSide(kind: LineKind, receiptType: 'RECEIVABLE' | 'PAYABLE'): LineSide {
  // RECEIVABLE: DOC=credit, BANK=debit
  // PAYABLE:    DOC=debit,  BANK=credit
  if (kind === 'DOC') return receiptType === 'RECEIVABLE' ? 'CREDIT' : 'DEBIT';
  if (kind === 'BANK') return receiptType === 'RECEIVABLE' ? 'DEBIT' : 'CREDIT';
  return 'DEBIT'; // ACCOUNT default
}

/** CLIENT advance is liability (credit balance) → DEBIT to reduce. SUPPLIER/EMPLOYEE are assets (debit balance) → CREDIT to reduce. */
function getPrepSide(prepType: string): LineSide {
  return prepType === 'CLIENT' ? 'DEBIT' : 'CREDIT';
}

const KIND_LABELS: Record<LineKind, string> = {
  DOC: 'Documento',
  BANK: 'Banco/Caja',
  PREP_USED: 'Anticipo',
  ACCOUNT: 'Cuenta',
  CXC_CREATED: 'CxC Creada',
  CXP_CREATED: 'CxP Creada',
  PREP_CREATED: 'Anticipo Creado',
};

const KIND_COLORS: Record<LineKind, string> = {
  DOC: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  BANK: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  PREP_USED: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  ACCOUNT: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  CXC_CREATED: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  CXP_CREATED: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  PREP_CREATED: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400',
};

/** Prepayment type → accounting config key (verified from seed-accounting-config.ts) */
const PREP_CONFIG_MAP: Record<string, string> = {
  CLIENT: 'sales_customer_advance',
  SUPPLIER: 'purchases_supplier_advance',
  EMPLOYEE: 'accounting_employee_advance',
};

/** Prepayment type → CC movement type key */
const PREP_CC_MAP: Record<string, string> = {
  CLIENT: 'prepayment_customer',
  SUPPLIER: 'prepayment_supplier',
  EMPLOYEE: 'prepayment_employee',
};

/** Empty CC fields for new lines */
const EMPTY_CC: Pick<ReceiptLine, 'cost_center_id' | 'cost_center_label' | 'cost_center_path' | 'cost_center_movement_type_key' | 'cost_center_movement_type_label'> = {
  cost_center_id: '',
  cost_center_label: '',
  cost_center_path: [],
  cost_center_movement_type_key: '',
  cost_center_movement_type_label: '',
};

/* ── Component ────────────────────────────────────────────── */

export function PaymentReceiptForm({ open, onClose, type, onSuccess, initialThirdParty, initialDocument, receiptId, mode = 'create' }: PaymentReceiptFormProps) {
  const { hasModule } = useCompanyModules();
  const hasAccounting = hasModule('accounting');
  const hasCCModule = hasModule('cost_centers');
  const { fmtCurrency } = useFormatNumber();
  const settings = useContext(CompanySettingsContext);
  const dd = settings?.displayDecimals;
  const roundMax = useCallback((val: number) =>
    dd !== undefined ? new Decimal(val).toDecimalPlaces(dd, Decimal.ROUND_HALF_UP).toNumber() : val,
  [dd]);
  const isReceivable = type === 'RECEIVABLE';
  const readOnly = mode === 'view' || mode === 'reverse';
  const isEdit = mode === 'edit';
  const dialogContentRef = useRef<HTMLDivElement>(null);
  const [loadingReceipt, setLoadingReceipt] = useState(false);
  const [receiptSubtype, setReceiptSubtype] = useState<'RECEIVABLE' | 'PAYABLE' | 'MANUAL' | null>(null);

  /* ─ Header ─ */
  const [date, setDate] = useState(todayStr);
  const [thirdPartyId, setThirdPartyId] = useState('');
  const [thirdPartyLabel, setThirdPartyLabel] = useState('');
  const [headerDesc, setHeaderDesc] = useState('');

  /* ─ Lines ─ */
  const [lines, setLines] = useState<ReceiptLine[]>([]);

  /* ─ Modals ─ */
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [prepModalOpen, setPrepModalOpen] = useState(false);

  /* ─ Cost centers ─ */
  const { ccTree, ccFlatMap } = useCostCenterTree(hasCCModule);
  const [ccMovementTypeOptions, setCcMovementTypeOptions] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    if (!hasCCModule) return;
    costCentersService.getMovementTypes().then(types => {
      setCcMovementTypeOptions(types.map(t => ({ value: t.key, label: t.name })));
    }).catch(() => {});
  }, [hasCCModule]);

  /** Resolve CC movement type label from options */
  const getCCMovementTypeLabel = useCallback((key: string) => {
    return ccMovementTypeOptions.find(o => o.value === key)?.label || key;
  }, [ccMovementTypeOptions]);

  /* ─ Submitting ─ */
  const [submitting, setSubmitting] = useState(false);

  /* ─ Pre-fill third party on open ─ */
  useEffect(() => {
    if (open && initialThirdParty) {
      setThirdPartyId(initialThirdParty.id);
      const doc = initialThirdParty.document || '';
      setThirdPartyLabel(doc ? `${doc} - ${initialThirdParty.name}` : initialThirdParty.name);
    }
  }, [open, initialThirdParty]);

  /* ─ Pre-fill document on open ─ */
  useEffect(() => {
    if (!open || !initialDocument || mode !== 'create') return;
    const lineId = crypto.randomUUID();
    const label = [initialDocument.consecutive || initialDocument.source_number, initialDocument.source_description].filter(Boolean).join(' | ');
    const refMax = roundMax(initialDocument.balance);

    const acct = initialDocument.account_code
      ? fmtAcct(initialDocument.account_code, initialDocument.account_name)
      : { code: '', label: '' };

    const ccMtKey = isReceivable ? 'cxc' : 'cxp';
    setLines([{
      id: lineId, kind: 'DOC',
      ref_id: initialDocument.id,
      ref_label: label || initialDocument.id,
      ref_max_amount: refMax,
      account_code: acct.code, account_label: acct.label, account_resolving: false,
      side: getAutoSide('DOC', type),
      amount: refMax.toString(),
      company_payment_method_id: '', company_payment_method_label: '',
      description: initialDocument.description || '',
      source_description: initialDocument.source_description,
      ...EMPTY_CC,
      cost_center_movement_type_key: ccMtKey,
      cost_center_movement_type_label: getCCMovementTypeLabel(ccMtKey),
    }]);
  }, [open, initialDocument, roundMax]);

  /* ── Load existing receipt (view/reverse mode) ────────── */

  useEffect(() => {
    if (!open || !receiptId || (!readOnly && !isEdit)) return;
    let cancelled = false;
    setLoadingReceipt(true);

    paymentReceiptsService.getOne(receiptId).then(receipt => {
      if (cancelled) return;
      setReceiptSubtype(receipt.type || null);
      setDate(receipt.date?.split('T')[0] || '');
      // Solo sobrescribir tercero si el receipt tiene uno; si no, mantener initialThirdParty
      if (receipt.third_party) {
        setThirdPartyId(receipt.third_party.id);
        setThirdPartyLabel(`${receipt.third_party.identification_number} - ${receipt.third_party.name}`);
      }
      setHeaderDesc(receipt.description || '');

      // Para edit: calcular ref_max_amount = current_balance + total usado en este recibo por ref_id
      const rawLines = receipt.lines.map(l => ({
        ref_id: l.ref_id || '',
        kind: l.kind,
        amount: l.debit > 0 ? l.debit : l.credit,
        ref_current_balance: l.ref_current_balance ?? 0,
      }));

      // Agrupar montos por ref_id para calcular total usado
      const totalUsedByRef: Record<string, number> = {};
      for (const rl of rawLines) {
        if (rl.ref_id && (rl.kind === 'DOC' || rl.kind === 'PREP_USED')) {
          totalUsedByRef[rl.ref_id] = (totalUsedByRef[rl.ref_id] || 0) + rl.amount;
        }
      }

      setLines(receipt.lines.map((l, i) => {
        const refId = l.ref_id || '';
        const lineAmt = rawLines[i].amount;
        // ref_max_amount = saldo actual + todo lo usado en este recibo para ese doc
        const refMax = (l.kind === 'DOC' || l.kind === 'PREP_USED') && refId
          ? (l.ref_current_balance ?? 0) + (totalUsedByRef[refId] || 0)
          : 0;

        return {
          id: isEdit ? crypto.randomUUID() : l.id,
          kind: l.kind,
          ref_id: refId,
          ref_label: l.ref_label || (l.account ? `${l.account.code} - ${l.account.name}` : ''),
          ref_max_amount: isEdit ? roundMax(refMax) : 0,
          account_code: l.account_code || '',
          account_label: l.account ? `${l.account.code} - ${l.account.name}` : '',
          account_resolving: false,
          side: (l.debit > 0 ? 'DEBIT' : 'CREDIT') as LineSide,
          amount: String(lineAmt),
          company_payment_method_id: l.company_payment_method?.id || '',
          company_payment_method_label: l.company_payment_method?.name || '',
          description: l.description || '',
          cost_center_id: l.cost_center?.id || '',
          cost_center_label: l.cost_center ? `${l.cost_center.consecutive} - ${l.cost_center.name}` : '',
          cost_center_path: [],
          cost_center_movement_type_key: l.cost_center_movement_type?.key || '',
          cost_center_movement_type_label: l.cost_center_movement_type?.name || '',
        };
      }));
    }).catch(err => {
      if (!cancelled) toast.error(err?.response?.data?.message || 'Error al cargar recibo');
    }).finally(() => {
      if (!cancelled) setLoadingReceipt(false);
    });

    return () => { cancelled = true; };
  }, [open, receiptId, readOnly, isEdit]);

  /* ── Account resolution ───────────────────────────────── */

  /**
   * DOC: ar_ap.account_code → third_party.cxc/cxp_account_code → config('finance_cxc'/'finance_cxp')
   */
  /** Formatear code + name como label */
  const fmtAcct = (code: string, name?: string | null) => ({
    code,
    label: name ? `${code} - ${name}` : code,
  });

  /** DOC: usa account_code/account_name que ya vienen del backend */
  const resolveDocAccount = useCallback((doc: SelectedDocument): { code: string; label: string } => {
    if (doc.account_code) return fmtAcct(doc.account_code, doc.account_name);
    return { code: '', label: '' };
  }, []);

  /** BANK: usa accountId/chartAccountName de BankAccountOption */
  const resolveBankAccount = useCallback((opt: BankAccountOption): { code: string; label: string } => {
    if (opt.accountId) return fmtAcct(opt.accountId, opt.chartAccountName);
    return { code: '', label: '' };
  }, []);

  /** PREP: usa account_code/account_name que ya vienen del backend */
  const resolvePrepAccount = useCallback((prep: SelectedPrepayment): { code: string; label: string } => {
    if (prep.account_code) return fmtAcct(prep.account_code, prep.account_name);
    return { code: '', label: '' };
  }, []);

  /* ── Reset on close ────────────────────────────────────── */

  const handleOpenChange = useCallback((isOpen: boolean) => {
    if (!isOpen) {
      onClose();
      setDate(todayStr());
      setThirdPartyId('');
      setThirdPartyLabel('');
      setHeaderDesc('');
      setLines([]);
      setReceiptSubtype(null);
    }
  }, [onClose]);

  /* ── Third party change → clear lines ──────────────────── */

  const handleThirdPartyChange = useCallback((id: string, tp?: any) => {
    setThirdPartyId(id);
    setThirdPartyLabel(tp ? `${tp.identification_number} - ${tp.name}` : '');
    setLines([]);
  }, []);

  /* ── Line helpers ──────────────────────────────────────── */

  const updateLine = useCallback((lineId: string, patch: Partial<ReceiptLine>) => {
    setLines(prev => prev.map(l => l.id === lineId ? { ...l, ...patch } : l));
  }, []);

  const removeLine = useCallback((lineId: string) => {
    setLines(prev => prev.filter(l => l.id !== lineId));
  }, []);

  /* ── Add DOC line ──────────────────────────────────────── */

  const handleDocSelected = useCallback((doc: SelectedDocument) => {
    const lineId = crypto.randomUUID();
    const label = [doc.consecutive || doc.source_number, doc.source_description].filter(Boolean).join(' | ');

    // Si ya existe otra línea para el mismo doc, usar su ref_max_amount (ya incluye totales)
    const existingForDoc = lines.filter(l => l.kind === 'DOC' && l.ref_id === doc.id);
    const refMax = existingForDoc.length > 0 ? existingForDoc[0].ref_max_amount : roundMax(doc.balance);

    // Calcular cuánto ya se asignó en otras líneas del mismo doc
    const alreadyUsed = existingForDoc.reduce((sum, l) => sum.plus(new Decimal(l.amount || '0')), new Decimal(0));
    const remaining = Decimal.max(new Decimal(0), new Decimal(refMax).minus(alreadyUsed));

    const acct = resolveDocAccount(doc);
    const ccMtKey = isReceivable ? 'cxc' : 'cxp';
    setLines(prev => [...prev, {
      id: lineId, kind: 'DOC',
      ref_id: doc.id,
      ref_label: label || doc.id,
      ref_max_amount: refMax,
      account_code: acct.code, account_label: acct.label, account_resolving: false,
      side: getAutoSide('DOC', type),
      amount: remaining.toString(),
      company_payment_method_id: '', company_payment_method_label: '',
      description: '',
      source_description: doc.source_description,
      ...EMPTY_CC,
      cost_center_movement_type_key: ccMtKey,
      cost_center_movement_type_label: getCCMovementTypeLabel(ccMtKey),
    }]);
    setDocModalOpen(false);
  }, [lines, type, isReceivable, resolveDocAccount, getCCMovementTypeLabel]);

  /* ── Add BANK line ─────────────────────────────────────── */

  const handleAddBankLine = useCallback(() => {
    setLines(prev => [...prev, {
      id: crypto.randomUUID(), kind: 'BANK',
      ref_id: '', ref_label: '', ref_max_amount: 0,
      account_code: '', account_label: '', account_resolving: false,
      side: getAutoSide('BANK', type),
      amount: '',
      company_payment_method_id: '', company_payment_method_label: '',
      description: '',
      ...EMPTY_CC,
    }]);
  }, [type]);

  const handleBankSelected = useCallback((lineId: string, bankId: string, opt?: BankAccountOption) => {
    if (!bankId || !opt) {
      updateLine(lineId, { ref_id: '', ref_label: '', account_code: '', account_label: '', account_resolving: false });
      return;
    }
    if (lines.some(l => l.kind === 'BANK' && l.ref_id === bankId && l.id !== lineId)) {
      toast.error('Esta cuenta bancaria ya fue agregada');
      return;
    }
    const acct = resolveBankAccount(opt);
    const ccMtKey = opt.accountType === 'CASH' ? 'cash_movement' : 'bank_movement';
    updateLine(lineId, {
      ref_id: bankId, ref_label: opt.label,
      account_code: acct.code, account_label: acct.label, account_resolving: false,
      cost_center_movement_type_key: ccMtKey,
      cost_center_movement_type_label: getCCMovementTypeLabel(ccMtKey),
    });
  }, [lines, resolveBankAccount, updateLine, getCCMovementTypeLabel]);

  /* ── Add PREP_USED line ────────────────────────────────── */

  const handlePrepSelected = useCallback((prep: SelectedPrepayment) => {
    const lineId = crypto.randomUUID();
    const typeLabel = { CLIENT: 'Cliente', SUPPLIER: 'Proveedor', EMPLOYEE: 'Empleado' }[prep.prepayment_type] || '';
    const label = [prep.consecutive, typeLabel, prep.third_party_name].filter(Boolean).join(' | ');

    // Si ya existe otra línea para el mismo anticipo, usar su ref_max_amount
    const existingForPrep = lines.filter(l => l.kind === 'PREP_USED' && l.ref_id === prep.id);
    const refMax = existingForPrep.length > 0 ? existingForPrep[0].ref_max_amount : roundMax(prep.balance);

    const alreadyUsed = existingForPrep.reduce((sum, l) => sum.plus(new Decimal(l.amount || '0')), new Decimal(0));
    const remaining = Decimal.max(new Decimal(0), new Decimal(refMax).minus(alreadyUsed));

    const acct = resolvePrepAccount(prep);
    const ccMtKey = PREP_CC_MAP[prep.prepayment_type] || '';
    setLines(prev => [...prev, {
      id: lineId, kind: 'PREP_USED',
      ref_id: prep.id,
      ref_label: label,
      ref_max_amount: refMax,
      account_code: acct.code, account_label: acct.label, account_resolving: false,
      side: getPrepSide(prep.prepayment_type),
      amount: remaining.toString(),
      company_payment_method_id: '', company_payment_method_label: '',
      description: '',
      ...EMPTY_CC,
      cost_center_movement_type_key: ccMtKey,
      cost_center_movement_type_label: getCCMovementTypeLabel(ccMtKey),
    }]);
    setPrepModalOpen(false);
  }, [lines, type, resolvePrepAccount, getCCMovementTypeLabel]);

  /* ── Add ACCOUNT line (only if hasAccounting) ──────────── */

  const handleAddAccountLine = useCallback(() => {
    setLines(prev => [...prev, {
      id: crypto.randomUUID(), kind: 'ACCOUNT',
      ref_id: '', ref_label: '', ref_max_amount: 0,
      account_code: '', account_label: '', account_resolving: false,
      side: 'DEBIT',
      amount: '',
      company_payment_method_id: '', company_payment_method_label: '',
      description: '',
      ...EMPTY_CC,
    }]);
  }, []);

  /* ── Totals ────────────────────────────────────────────── */

  const totals = useMemo(() => {
    let debit = new Decimal(0);
    let credit = new Decimal(0);
    for (const line of lines) {
      const amt = new Decimal(line.amount || '0');
      if (amt.lte(0)) continue;
      if (line.side === 'DEBIT') debit = debit.plus(amt);
      else credit = credit.plus(amt);
    }
    return {
      debit: debit.toNumber(),
      credit: credit.toNumber(),
      balanced: debit.toDecimalPlaces(4).equals(credit.toDecimalPlaces(4)),
    };
  }, [lines]);

  /* ── Effective max (descontar otras líneas con mismo ref_id) ─ */

  const getEffectiveMax = useCallback((line: ReceiptLine): Decimal => {
    if (new Decimal(line.ref_max_amount).lte(0) || !line.ref_id) return new Decimal(0);
    const otherTotal = lines
      .filter(l => l.id !== line.id && l.ref_id === line.ref_id)
      .reduce((sum, l) => sum.plus(new Decimal(l.amount || '0')), new Decimal(0));
    return Decimal.max(new Decimal(0), new Decimal(line.ref_max_amount).minus(otherTotal));
  }, [lines]);

  /* ── Validation ────────────────────────────────────────── */

  const errors = useMemo(() => {
    const e: string[] = [];
    if (!thirdPartyId) e.push('Selecciona un tercero');
    if (!date) e.push('Selecciona una fecha');
    if (lines.length < 2) e.push('Mínimo 2 líneas');
    if (lines.length >= 2 && !totals.balanced)
      e.push(`No balanceado: D ${fmtCurrency(totals.debit)} vs C ${fmtCurrency(totals.credit)}`);
    for (const l of lines) {
      const amt = new Decimal(l.amount || '0');
      if (amt.lte(0)) e.push(`${KIND_LABELS[l.kind]}: monto debe ser > 0`);
      if (l.kind === 'DOC' && !l.company_payment_method_id)
        e.push(`"${l.ref_label}": requiere método de pago`);
      if (l.kind === 'BANK' && !l.ref_id) e.push('Banco/Caja sin seleccionar');
      if (l.kind === 'ACCOUNT' && !l.account_code) e.push('Cuenta contable sin seleccionar');
      if (new Decimal(l.ref_max_amount).gt(0) && l.ref_id) {
        const effMax = getEffectiveMax(l);
        if (amt.gt(effMax))
          e.push(`"${l.ref_label}": excede saldo disponible (${fmtCurrency(effMax.toNumber())})`);
      }
      if (!l.account_code && !l.account_resolving && l.kind !== 'ACCOUNT')
        e.push(`"${l.ref_label || KIND_LABELS[l.kind]}": sin cuenta contable`);
    }
    if (hasCCModule) {
      for (const l of lines) {
        if (!l.cost_center_id)
          e.push(`${KIND_LABELS[l.kind]}: requiere centro de costos`);
        if (!l.cost_center_movement_type_key)
          e.push(`${KIND_LABELS[l.kind]}: requiere tipo de movimiento CC`);
      }
    }
    return e;
  }, [thirdPartyId, date, lines, totals, hasCCModule]);

  /* ── Submit ────────────────────────────────────────────── */

  const handleSubmit = useCallback(async () => {
    if (errors.length > 0) { toast.error(errors[0]); return; }
    setSubmitting(true);
    try {
      await paymentReceiptsService.create({
        type,
        date,
        third_party_id: thirdPartyId,
        description: headerDesc || undefined,
        lines: lines.map(l => ({
          kind: l.kind,
          account_code: l.account_code,
          debit: l.side === 'DEBIT' ? new Decimal(l.amount || '0').toNumber() : 0,
          credit: l.side === 'CREDIT' ? new Decimal(l.amount || '0').toNumber() : 0,
          ref_id: l.ref_id || undefined,
          company_payment_method_id: l.company_payment_method_id || undefined,
          description: l.description || undefined,
          ...(hasCCModule ? {
            cost_center_id: l.cost_center_id,
            cost_center_movement_type_key: l.cost_center_movement_type_key,
          } : {}),
        })),
      });
      toast.success(isReceivable ? 'Recibo de Caja creado' : 'Comprobante de Egreso creado');
      handleOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err.message || 'Error al crear');
    } finally {
      setSubmitting(false);
    }
  }, [type, date, thirdPartyId, headerDesc, lines, errors, isReceivable, handleOpenChange, onSuccess, hasCCModule]);

  /* ── Edit handler (void + create) ────────────────────── */

  const handleEdit = useCallback(async () => {
    if (!receiptId) return;
    if (errors.length > 0) { toast.error(errors[0]); return; }
    setSubmitting(true);
    try {
      await paymentReceiptsService.edit(receiptId, {
        type,
        date,
        third_party_id: thirdPartyId,
        description: headerDesc || undefined,
        lines: lines.map(l => ({
          kind: l.kind,
          account_code: l.account_code,
          debit: l.side === 'DEBIT' ? new Decimal(l.amount || '0').toNumber() : 0,
          credit: l.side === 'CREDIT' ? new Decimal(l.amount || '0').toNumber() : 0,
          ref_id: l.ref_id || undefined,
          company_payment_method_id: l.company_payment_method_id || undefined,
          description: l.description || undefined,
          ...(hasCCModule ? {
            cost_center_id: l.cost_center_id,
            cost_center_movement_type_key: l.cost_center_movement_type_key,
          } : {}),
        })),
      });
      toast.success(isReceivable ? 'Recibo de Caja editado' : 'Comprobante de Egreso editado');
      handleOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err.message || 'Error al editar');
    } finally {
      setSubmitting(false);
    }
  }, [receiptId, type, date, thirdPartyId, headerDesc, lines, errors, isReceivable, handleOpenChange, onSuccess, hasCCModule]);

  /* ── Reverse handler ──────────────────────────────────── */

  const handleReverse = useCallback(async () => {
    if (!receiptId) return;
    setSubmitting(true);
    try {
      await paymentReceiptsService.reverse(receiptId);
      toast.success(isReceivable ? 'Recibo de Caja anulado' : 'Comprobante de Egreso anulado');
      handleOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err.message || 'Error al anular');
    } finally {
      setSubmitting(false);
    }
  }, [receiptId, isReceivable, handleOpenChange, onSuccess]);

  const isManual = receiptSubtype === 'MANUAL';
  const title = mode === 'edit'
    ? (isReceivable ? 'Editar Recibo de Caja' : 'Editar Comprobante de Egreso')
    : mode === 'reverse'
      ? (isReceivable ? 'Anular Recibo de Caja' : 'Anular Comprobante de Egreso')
      : mode === 'view'
        ? (isReceivable ? 'Recibo de Caja' : 'Comprobante de Egreso') + (isManual ? ' (Asiento Manual)' : '')
        : (isReceivable ? 'Nuevo Recibo de Caja' : 'Nuevo Comprobante de Egreso');
  const anyResolving = lines.some(l => l.account_resolving);

  /* ── Amount change handler (caps at effectiveMax) ────── */

  const handleAmountChange = useCallback((lineId: string, rawVal: string) => {
    const line = lines.find(l => l.id === lineId);
    if (!line) return;
    let val = rawVal;
    if (new Decimal(line.ref_max_amount).gt(0) && line.ref_id) {
      const n = new Decimal(val || '0');
      const effMax = getEffectiveMax(line);
      if (n.gt(effMax)) val = effMax.toString();
    }
    updateLine(lineId, { amount: val });
  }, [lines, updateLine, getEffectiveMax]);

  /* ── Render ────────────────────────────────────────────── */

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent ref={dialogContentRef} className="max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>

          {/* ═══ Loading receipt ═══ */}
          {loadingReceipt && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
              <span className="text-muted-foreground">Cargando recibo...</span>
            </div>
          )}

          {/* ═══ Header ═══ */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Fecha</Label>
              <DatePicker value={date} onChange={setDate} disabled={readOnly} />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">
                {isReceivable ? 'Cliente' : 'Proveedor'}
              </Label>
              {isManual && !thirdPartyId ? (
                <span className="text-sm text-muted-foreground py-2">Varios terceros (Asiento Manual)</span>
              ) : (
                <ThirdPartySelect
                  value={thirdPartyId}
                  valueLabel={thirdPartyLabel}
                  onChange={handleThirdPartyChange}
                  placeholder={isReceivable ? 'Seleccionar cliente...' : 'Seleccionar proveedor...'}
                  disabled={readOnly}
                />
              )}
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Descripción</Label>
              <Input
                placeholder="Opcional..."
                value={headerDesc}
                onChange={e => setHeaderDesc(e.target.value)}
                disabled={readOnly}
              />
            </div>
          </div>

          {/* ═══ Action buttons (solo en creación) ═══ */}
          {!readOnly && (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setDocModalOpen(true)}
                disabled={!thirdPartyId} title={!thirdPartyId ? 'Selecciona un tercero primero' : ''}>
                <FileText className="h-4 w-4 mr-1" /> Agregar Documento
              </Button>
              <Button size="sm" variant="outline" onClick={handleAddBankLine}>
                <Landmark className="h-4 w-4 mr-1" /> Agregar Banco/Caja
              </Button>
              <Button size="sm" variant="outline" onClick={() => setPrepModalOpen(true)}
                disabled={!thirdPartyId} title={!thirdPartyId ? 'Selecciona un tercero primero' : ''}>
                <Gift className="h-4 w-4 mr-1" /> Agregar Anticipo
              </Button>
              {hasAccounting && (
                <Button size="sm" variant="outline" onClick={handleAddAccountLine}>
                  <BookOpen className="h-4 w-4 mr-1" /> Agregar Cuenta
                </Button>
              )}
            </div>
          )}

          {/* ═══ Lines table ═══ */}
          {lines.length > 0 ? (
            <div className="rounded-md border overflow-visible">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[110px]">Tipo</TableHead>
                    <TableHead className="min-w-[200px]">Detalle</TableHead>
                    {hasAccounting && <TableHead className="min-w-[150px]">Cuenta</TableHead>}
                    <TableHead className="w-[170px]">M. Pago</TableHead>
                    <TableHead className="text-right w-[130px]">Débito</TableHead>
                    <TableHead className="text-right w-[130px]">Crédito</TableHead>
                    {!readOnly && <TableHead className="w-[44px]" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map(line => (
                    <React.Fragment key={line.id}>
                    <TableRow>

                      {/* ── Tipo ── */}
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge className={`text-xs ${KIND_COLORS[line.kind]}`}>
                            {line.source_description || KIND_LABELS[line.kind]}
                          </Badge>
                          {line.kind === 'ACCOUNT' && !readOnly && (
                            <button
                              type="button"
                              className="text-[10px] font-medium px-1.5 py-0.5 rounded border hover:bg-muted transition-colors"
                              onClick={() => updateLine(line.id, { side: line.side === 'DEBIT' ? 'CREDIT' : 'DEBIT' })}
                            >
                              {line.side === 'DEBIT' ? 'DEB' : 'CRED'}
                            </button>
                          )}
                        </div>
                      </TableCell>

                      {/* ── Detalle ── */}
                      <TableCell>
                        {readOnly ? (
                          <div>
                            <span className="text-sm font-medium">{line.ref_label || '—'}</span>
                            {line.description && (
                              <span className="text-xs text-muted-foreground block mt-0.5">{line.description}</span>
                            )}
                          </div>
                        ) : line.kind === 'BANK' ? (
                          <div className="space-y-1">
                            <BankAccountSelect
                              value={line.ref_id}
                              valueLabel={line.ref_label}
                              onChange={(val, opt) => handleBankSelected(line.id, val, opt)}
                              placeholder="Seleccionar banco/caja..."
                              className="w-full"
                              usePortal
                              portalContainer={dialogContentRef}
                            />
                            <Input
                              placeholder="Descripción..."
                              value={line.description}
                              onChange={e => updateLine(line.id, { description: e.target.value })}
                              className="h-7 text-xs"
                            />
                          </div>
                        ) : line.kind === 'ACCOUNT' ? (
                          <div className="space-y-1">
                            <AccountSelect
                              value={line.account_code}
                              valueLabel={line.account_label}
                              onChange={(code, acct) => updateLine(line.id, {
                                account_code: code,
                                account_label: acct ? `${acct.code} - ${acct.name}` : '',
                                ref_id: code,
                              })}
                              placeholder="Seleccionar cuenta..."
                              usePortal
                              portalContainer={dialogContentRef}
                            />
                            <Input
                              placeholder="Descripción..."
                              value={line.description}
                              onChange={e => updateLine(line.id, { description: e.target.value })}
                              className="h-7 text-xs"
                            />
                          </div>
                        ) : (
                          <div>
                            <span className="text-sm font-medium">{line.ref_label}</span>
                            {new Decimal(line.ref_max_amount).gt(0) && line.ref_id && (
                              <span className="text-[10px] text-muted-foreground mt-0.5 block">
                                Máx: <FormattedNumber value={getEffectiveMax(line).toNumber()} type="currency" />
                              </span>
                            )}
                            <Input
                              placeholder="Descripción..."
                              value={line.description}
                              onChange={e => updateLine(line.id, { description: e.target.value })}
                              className="h-7 text-xs mt-1"
                            />
                          </div>
                        )}
                      </TableCell>

                      {/* ── Cuenta (solo con contabilidad) ── */}
                      {hasAccounting && (
                        <TableCell>
                          {line.account_resolving
                            ? <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                            : <span className="text-xs font-mono text-muted-foreground truncate max-w-[180px] block" title={line.account_label}>
                                {line.account_label || line.account_code || '—'}
                              </span>
                          }
                        </TableCell>
                      )}

                      {/* ── Método de pago ── */}
                      <TableCell>
                        {line.kind === 'DOC' && (
                          readOnly ? (
                            <span className="text-xs text-muted-foreground">
                              {line.company_payment_method_label || (isManual ? 'Asiento Manual' : '—')}
                            </span>
                          ) : (
                            <PaymentMethodSelect
                              value={line.company_payment_method_id}
                              valueLabel={line.company_payment_method_label}
                              onChange={(val, opt) => updateLine(line.id, {
                                company_payment_method_id: val,
                                company_payment_method_label: opt?.label || '',
                              })}
                              placeholder="Método..."
                              className="w-full"
                              usePortal
                              portalContainer={dialogContentRef}
                            />
                          )
                        )}
                      </TableCell>

                      {/* ── Débito ── */}
                      <TableCell className="text-right">
                        {line.side === 'DEBIT' ? (
                          readOnly
                            ? <FormattedNumber value={Number(line.amount || 0)} type="currency" className="font-medium" />
                            : <NumericInput
                                value={line.amount}
                                onChange={e => handleAmountChange(line.id, e.target.value)}
                                allowNegative={false}
                                placeholder="0"
                                className="w-[120px] text-right"
                              />
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      {/* ── Crédito ── */}
                      <TableCell className="text-right">
                        {line.side === 'CREDIT' ? (
                          readOnly
                            ? <FormattedNumber value={Number(line.amount || 0)} type="currency" className="font-medium" />
                            : <NumericInput
                                value={line.amount}
                                onChange={e => handleAmountChange(line.id, e.target.value)}
                                allowNegative={false}
                                placeholder="0"
                                className="w-[120px] text-right"
                              />
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      {/* ── Eliminar (solo en creación) ── */}
                      {!readOnly && (
                        <TableCell>
                          <Button variant="ghost" size="sm"
                            className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                            onClick={() => removeLine(line.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>

                    {/* ── CC row ── */}
                    {hasCCModule && (
                      <TableRow className="border-t-0">
                        <TableCell colSpan={hasAccounting ? (readOnly ? 6 : 7) : (readOnly ? 5 : 6)} className="pt-0 pb-1.5 px-3">
                          <div className="flex items-center gap-2 bg-slate-50/80 dark:bg-slate-800/40 rounded px-2 py-1">
                            <span className="text-[11px] text-gray-500 font-medium flex-shrink-0">CC:</span>

                            {readOnly ? (
                              <span className="text-[11px] text-muted-foreground">
                                {line.cost_center_label || '—'} | {line.cost_center_movement_type_label || '—'}
                              </span>
                            ) : (
                              <>
                                {/* Cascading CC selects */}
                                <CostCenterCascadeSelect
                                  ccTree={ccTree}
                                  ccFlatMap={ccFlatMap}
                                  value={line.cost_center_id}
                                  path={line.cost_center_path}
                                  onChange={(id, label, path) => {
                                    updateLine(line.id, {
                                      cost_center_path: path,
                                      cost_center_id: id,
                                      cost_center_label: label,
                                    });
                                  }}
                                  size="sm"
                                  itemWidth="fixed"
                                />

                                {/* Movement type - manual only for ACCOUNT, auto-label for others */}
                                {line.kind === 'ACCOUNT' ? (
                                  <div className="w-48">
                                    <SearchableSelect
                                      options={ccMovementTypeOptions}
                                      value={line.cost_center_movement_type_key}
                                      onChange={(v) => {
                                        const opt = ccMovementTypeOptions.find(o => o.value === v);
                                        updateLine(line.id, {
                                          cost_center_movement_type_key: v,
                                          cost_center_movement_type_label: opt?.label || '',
                                        });
                                      }}
                                      placeholder="Tipo movimiento..."
                                      className="h-7 text-xs [&_button]:h-7 [&_button]:text-xs [&_button]:py-0"
                                    />
                                  </div>
                                ) : (
                                  <span className="text-[11px] text-muted-foreground flex-shrink-0">
                                    {line.cost_center_movement_type_label || '—'}
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                    </React.Fragment>
                  ))}

                  {/* ── Totales ── */}
                  <TableRow className="bg-muted/30 font-medium">
                    <TableCell colSpan={hasAccounting ? 4 : 3} className="text-right">
                      Totales:
                    </TableCell>
                    <TableCell className="text-right"><FormattedNumber value={totals.debit} type="currency" /></TableCell>
                    <TableCell className="text-right"><FormattedNumber value={totals.credit} type="currency" /></TableCell>
                    {!readOnly && <TableCell />}
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {thirdPartyId
                ? 'Agrega documentos, bancos o anticipos usando los botones de arriba'
                : 'Selecciona un tercero para comenzar'}
            </div>
          )}

          {/* ═══ Balance indicator ═══ */}
          {lines.length > 0 && (
            <div className="flex items-center justify-between">
              {totals.balanced ? (
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                  Balanceado
                </Badge>
              ) : (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Diferencia: {fmtCurrency(new Decimal(totals.debit).minus(new Decimal(totals.credit)).abs().toNumber())}
                </Badge>
              )}
              <span className="text-sm text-muted-foreground">{lines.length} línea(s)</span>
            </div>
          )}

          {/* ═══ Submit / Reverse ═══ */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={submitting}>
              {readOnly ? 'Cerrar' : 'Cancelar'}
            </Button>
            {mode === 'reverse' && (
              <Button
                variant="destructive"
                onClick={handleReverse}
                disabled={submitting || loadingReceipt}
              >
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Anular
              </Button>
            )}
            {mode === 'edit' && (
              <Button
                onClick={handleEdit}
                disabled={submitting || errors.length > 0 || anyResolving || loadingReceipt}
              >
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Guardar Cambios
              </Button>
            )}
            {mode === 'create' && (
              <Button
                onClick={handleSubmit}
                disabled={submitting || errors.length > 0 || anyResolving}
              >
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isReceivable ? 'Crear Recibo de Caja' : 'Crear Comprobante de Egreso'}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══ Selection modals (reusing existing) ═══ */}
      <SelectArApDocumentModal
        open={docModalOpen}
        onClose={() => setDocModalOpen(false)}
        onSelect={handleDocSelected}
        type={type as ArApType}
        initialThirdParty={thirdPartyId ? {
          id: thirdPartyId,
          name: thirdPartyLabel.includes(' - ') ? thirdPartyLabel.split(' - ').slice(1).join(' - ') : thirdPartyLabel,
          document: thirdPartyLabel.includes(' - ') ? thirdPartyLabel.split(' - ')[0] : null,
        } : undefined}
      />

      <SelectPrepaymentModal
        open={prepModalOpen}
        onClose={() => setPrepModalOpen(false)}
        onSelect={handlePrepSelected}
        thirdPartyId={thirdPartyId || undefined}
        allowedTypes={isReceivable ? ['CLIENT'] as PrepaymentType[] : ['SUPPLIER', 'EMPLOYEE'] as PrepaymentType[]}
      />
    </>
  );
}
