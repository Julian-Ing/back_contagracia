'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Decimal from 'decimal.js';
import toast from 'react-hot-toast';
import { useCompanyModules } from '@/shared/hooks/useCompanyModules';
import { FileText, CreditCard, ShoppingCart, ShieldMinus, Calculator, Loader2 } from 'lucide-react';
import { Label } from '@/shared/components/ui/label';
import { Input } from '@/shared/components/ui/input';
import { DatePicker } from '@/shared/components/ui/date-picker';
import { SearchableSelect } from '@/shared/components/ui/searchable-select';
import { ThirdPartySelect } from '@/shared/components/ui/third-party-select';
import { Button } from '@/shared/components/ui/button';
import { FormattedNumber } from '@/shared/components/ui/formatted-number';
import { Textarea } from '@/shared/components/ui/textarea';
import { NumericInput } from '@/shared/components/ui/numeric-input';
import { TaxSelect } from '@/shared/components/ui/tax-select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/shared/components/ui/dialog';
import {
  DocumentPaymentsModal, type DocumentPaymentLine,
  EMPTY_CREDIT_CONFIG, type CreditConfig,
  DocumentWithholdingsModal, type WithholdingLine,
  DocumentItemsTable, calcLineTotals, type ItemLine,
  documentsService,
} from '@/modules/invoicing';
import type { DocumentDetail } from '@/modules/invoicing';
import type { TypeOperationOption } from '@/modules/invoicing/services/documents.service';

/* ── Constants ── */

const IVA_ZERO_TAX = { id: '3', label: 'IVA 0% (0%)', rate: 0 };
const round4 = (v: Decimal) => v.toDecimalPlaces(4, Decimal.ROUND_HALF_UP);

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

/** Truncate ISO datetime to YYYY-MM-DD for DatePicker */
function toDateOnly(iso: string | null | undefined): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

/* ── Props ── */

export interface DocumentFormProps {
  mode: 'create' | 'edit';
  documentId?: string;
  initialData?: DocumentDetail;
}

/* ── Helper: map detail → form state ── */

function mapDetailItems(detailItems: DocumentDetail['items']): ItemLine[] {
  return detailItems.map((di) => ({
    id: crypto.randomUUID(),
    product_id: di.product_id || '',
    product_label: di.product_name || di.description || '',
    consecutive: di.product_consecutive || '',
    barcode: di.product_barcode || '',
    parent_product_id: di.parent_product_id || null,
    is_service: di.is_service,
    description: di.description || '',
    quantity: String(di.quantity),
    unit_name: di.unit_name || '',
    unit_price: String(di.unit_price),
    tax_included: di.tax_included,
    is_discount_rate: di.is_discount_rate,
    discount_input: di.is_discount_rate ? String(di.discount_rate) : String(di.discount_value),
    tax_id: di.tax_id || '',
    tax_label: di.tax_name || '',
    tax_rate: di.tax_rate,
    tax_per_unit_amount: di.tax_per_unit_amount ?? null,
    storage_id: di.storage_id || '',
    storage_label: di.storage_name || '',
    cost_center_id: di.cost_center_id || '',
    cost_center_label: di.cost_center_name || '',
    cost_center_path: [],
  }));
}

function mapDetailPayments(detailPayments: DocumentDetail['payments']): DocumentPaymentLine[] {
  return detailPayments.map((dp) => {
    let lineType: 'bank' | 'cash' | 'prepayment' = 'bank';
    if (dp.prepayment_id) {
      lineType = 'prepayment';
    } else if (dp.bank_account_type === 'cash') {
      lineType = 'cash';
    }

    return {
      id: crypto.randomUUID(),
      lineType,
      bank_account_id: dp.bank_account_id || '',
      bank_account_label: dp.bank_account_name || '',
      prepayment_id: dp.prepayment_id || '',
      prepayment_label: dp.prepayment_consecutive || '',
      prepayment_max_amount: dp.amount,
      company_payment_method_id: dp.company_payment_method_id || '',
      company_payment_method_label: dp.company_payment_method_name || '',
      amount: String(dp.amount),
      cost_center_id: dp.cost_center_id || '',
      cost_center_label: dp.cost_center_name || '',
      cost_center_path: [],
    };
  });
}

function mapDetailWithholdings(detailWithholdings: DocumentDetail['withholdings']): WithholdingLine[] {
  return detailWithholdings.map((dw) => ({
    id: crypto.randomUUID(),
    withholding_id: dw.withholding_id,
    name: dw.withholding_name || '',
    rate: dw.rate,
    tax_type_id: dw.tax_type_id || 0,
    cost_center_id: dw.cost_center_id || '',
    cost_center_label: dw.cost_center_name || '',
    cost_center_path: [],
  }));
}

function mapDetailCredit(credit: DocumentDetail['credit']): CreditConfig {
  if (!credit) return EMPTY_CREDIT_CONFIG;
  return {
    dueDate: toDateOnly(credit.due_date),
    paymentMethodId: credit.payment_method_id || '',
    paymentMethodLabel: credit.payment_method_name || '',
    costCenterId: credit.cost_center_id || '',
    costCenterLabel: credit.cost_center_name || '',
    costCenterPath: [],
  };
}

/* ── Component ── */

export function DocumentForm({ mode, documentId, initialData }: DocumentFormProps) {
  const router = useRouter();
  const { hasModule } = useCompanyModules();
  const hasCCModule = hasModule('cost_centers');
  const hasInventory = hasModule('inventory_management');

  // Header fields
  const [thirdPartyId, setThirdPartyId] = useState('');
  const [thirdPartyLabel, setThirdPartyLabel] = useState('');
  const [docDate, setDocDate] = useState(todayISO());
  const [operationTypeId, setOperationTypeId] = useState('');     // UUID
  const [operationTypeCode, setOperationTypeCode] = useState(''); // '09','10','11'
  const [operationTypeOptions, setOperationTypeOptions] = useState<{ value: string; label: string }[]>([]);
  const [operationTypeMap, setOperationTypeMap] = useState<Map<string, string>>(new Map()); // id → code
  const [description, setDescription] = useState('');

  // Credit config (due date + payment method + cost center)
  const [creditConfig, setCreditConfig] = useState<CreditConfig>(EMPTY_CREDIT_CONFIG);

  // Purchase order
  const [purchaseOrderConsecutive, setPurchaseOrderConsecutive] = useState('');
  const [purchaseOrderDate, setPurchaseOrderDate] = useState('');
  const [purchaseOrderModalOpen, setPurchaseOrderModalOpen] = useState(false);
  const [tempPOConsecutive, setTempPOConsecutive] = useState('');
  const [tempPODate, setTempPODate] = useState('');

  // Payment lines
  const [paymentLines, setPaymentLines] = useState<DocumentPaymentLine[]>([]);
  const [paymentsModalOpen, setPaymentsModalOpen] = useState(false);

  // Items
  const [items, setItems] = useState<ItemLine[]>([]);

  // Withholdings
  const [withholdings, setWithholdings] = useState<WithholdingLine[]>([]);
  const [withholdingsModalOpen, setWithholdingsModalOpen] = useState(false);

  // Payment type (only for zero-total edge case)
  const [paymentType, setPaymentType] = useState<'CASH' | 'CREDIT' | ''>('');

  // Saving state
  const [saving, setSaving] = useState(false);

  // Track if initialData has been populated (to avoid re-populating on re-render)
  const [initialized, setInitialized] = useState(mode === 'create');

  // Load type operations from backend
  useEffect(() => {
    documentsService.getTypeOperations().then((ops) => {
      // Only show 09 and 10 for now
      // TODO: add '11' (Mandatos) when ready
      const filtered = ops.filter(o => o.code === '09' || o.code === '10');
      const options = filtered.map(o => ({ value: o.value, label: o.label }));
      const codeMap = new Map(filtered.map(o => [o.value, o.code]));
      setOperationTypeOptions(options);
      setOperationTypeMap(codeMap);

      // In create mode, default to '10' (Estándar)
      if (mode === 'create') {
        const std = filtered.find(o => o.code === '10');
        if (std) {
          setOperationTypeId(std.value);
          setOperationTypeCode('10');
        }
      }
    }).catch(() => {});
  }, [mode]);

  // Populate form from initialData (edit mode)
  useEffect(() => {
    if (mode !== 'edit' || !initialData || initialized) return;

    // Header
    if (initialData.third_party) {
      setThirdPartyId(initialData.third_party.id);
      setThirdPartyLabel(
        `${initialData.third_party.identification_number || ''} - ${initialData.third_party.name || ''}`
      );
    }
    setDocDate(toDateOnly(initialData.doc_date) || todayISO());
    setDescription(initialData.notes || '');

    // Operation type
    if (initialData.type_operation) {
      setOperationTypeId(initialData.type_operation.id);
      setOperationTypeCode(initialData.type_operation.code);
    }

    // Purchase order
    setPurchaseOrderConsecutive(initialData.purchase_order_consecutive || '');
    setPurchaseOrderDate(toDateOnly(initialData.purchase_order_date));

    // Items: filter out AIU items (they are shown via AIU config, not in the table)
    const AIU_PRODUCT_IDS = ['aiu-administration', 'aiu-contingencies', 'aiu-utility'];
    const visibleItems = initialData.items.filter(i => !i.product_id || !AIU_PRODUCT_IDS.includes(i.product_id));
    setItems(mapDetailItems(visibleItems));

    // Payments
    setPaymentLines(mapDetailPayments(initialData.payments));

    // Withholdings
    setWithholdings(mapDetailWithholdings(initialData.withholdings));

    // Credit
    setCreditConfig(mapDetailCredit(initialData.credit));

    // AIU: reconstruct from DocumentAiu + utility item's tax
    if (initialData.aiu) {
      setAiuAdminPct(String(initialData.aiu.administrative_percentage));
      setAiuUnexpectedPct(String(initialData.aiu.unexpected_percentage));
      setAiuUtilityPct(String(initialData.aiu.utility_percentage));

      // Extract utility tax from the AIU utility item
      const utilityItem = initialData.items.find(i => i.product_id === 'aiu-utility');
      if (utilityItem && utilityItem.tax_id) {
        setAiuUtilityTaxId(utilityItem.tax_id);
        setAiuUtilityTaxLabel(utilityItem.tax_name || '');
        setAiuUtilityTaxRate(utilityItem.tax_rate);
      }
    }

    setInitialized(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, initialData, initialized]);

  // AIU (operation type 09)
  const isAIU = operationTypeCode === '09';
  const [aiuAdminPct, setAiuAdminPct] = useState('');
  const [aiuUnexpectedPct, setAiuUnexpectedPct] = useState('');
  const [aiuUtilityPct, setAiuUtilityPct] = useState('');
  const [aiuUtilityTaxId, setAiuUtilityTaxId] = useState('');
  const [aiuUtilityTaxLabel, setAiuUtilityTaxLabel] = useState('');
  const [aiuUtilityTaxRate, setAiuUtilityTaxRate] = useState(0);
  const [aiuModalOpen, setAiuModalOpen] = useState(false);

  // Force IVA 0% and remove bag items when switching to AIU
  useEffect(() => {
    if (operationTypeCode === '09') {
      setItems(prev => {
        if (prev.length === 0) return prev;
        // Remove bag items (incompatible with AIU)
        const withoutBags = prev.filter(i => i.product_id !== 'bag-plastic');
        if (withoutBags.length < prev.length) {
          toast('Bolsas removidas (no compatibles con AIU)');
        }
        const needsUpdate = withoutBags.some(i => i.tax_id !== IVA_ZERO_TAX.id);
        if (!needsUpdate && withoutBags.length === prev.length) return prev;
        if (needsUpdate) toast('Ítems asignados a IVA 0% (requerido para AIU)');
        return withoutBags.map(i => ({
          ...i,
          tax_id: IVA_ZERO_TAX.id,
          tax_label: IVA_ZERO_TAX.label,
          tax_rate: IVA_ZERO_TAX.rate,
        }));
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [operationTypeCode]);

  // Wrap items change to force IVA 0% in AIU mode and reject bag items
  const handleItemsChange = useCallback((newItems: ItemLine[]) => {
    if (operationTypeCode === '09') {
      const filtered = newItems.filter(i => i.product_id !== 'bag-plastic');
      setItems(filtered.map(i => ({
        ...i,
        tax_id: IVA_ZERO_TAX.id,
        tax_label: IVA_ZERO_TAX.label,
        tax_rate: IVA_ZERO_TAX.rate,
      })));
    } else {
      setItems(newItems);
    }
  }, [operationTypeCode]);

  /* ── Computed totals ── */

  const totalPaid = useMemo(() => {
    return paymentLines.reduce((acc, l) => acc.plus(new Decimal(l.amount || '0')), new Decimal(0)).toNumber();
  }, [paymentLines]);

  // Computed from items
  const itemTotals = useMemo(() => {
    let subtotalGross = new Decimal(0);
    let discounts = new Decimal(0);
    let taxes = new Decimal(0);
    const taxMap = new Map<string, { name: string; amount: Decimal }>();

    for (const item of items) {
      const t = calcLineTotals(item);
      subtotalGross = subtotalGross.plus(t.line_subtotal);
      discounts = discounts.plus(t.discount_amount);
      taxes = taxes.plus(t.tax_amount);

      if (item.tax_id && t.tax_amount.gt(0)) {
        const existing = taxMap.get(item.tax_id);
        if (existing) {
          existing.amount = existing.amount.plus(t.tax_amount);
        } else {
          taxMap.set(item.tax_id, { name: item.tax_label, amount: t.tax_amount });
        }
      }
    }

    const subtotalNet = subtotalGross.minus(discounts);
    const taxList = Array.from(taxMap.entries()).map(([id, { name, amount }]) => ({
      id, name, amount: amount.toNumber(),
    }));

    return {
      subtotalGross: subtotalGross.toNumber(),
      lineDiscounts: discounts.toNumber(),
      subtotal: subtotalNet,
      totalTaxes: taxes,
      totalIVA: taxes,
      taxList,
    };
  }, [items]);

  const { subtotalGross, lineDiscounts, taxList } = itemTotals;
  const subtotal = itemTotals.subtotal;
  const totalIVA = itemTotals.totalIVA;
  const totalTaxes = itemTotals.totalTaxes;

  // AIU computed values (only when operation type = 09)
  const aiuAdminValue = isAIU ? round4(subtotal.times(new Decimal(aiuAdminPct || '0')).div(100)) : new Decimal(0);
  const aiuUnexpectedValue = isAIU ? round4(subtotal.times(new Decimal(aiuUnexpectedPct || '0')).div(100)) : new Decimal(0);
  const aiuUtilityValue = isAIU ? round4(subtotal.times(new Decimal(aiuUtilityPct || '0')).div(100)) : new Decimal(0);
  const aiuUtilityIVA = isAIU ? round4(aiuUtilityValue.times(aiuUtilityTaxRate).div(100)) : new Decimal(0);
  const aiuTotal = aiuAdminValue.plus(aiuUnexpectedValue).plus(aiuUtilityValue);

  const effectiveTotalIVA = isAIU ? aiuUtilityIVA : totalIVA;

  const withholdingAmounts = useMemo(() => {
    return withholdings.map((wh) => {
      const base = wh.tax_type_id === 5 ? effectiveTotalIVA : subtotal;
      const amount = base.times(wh.rate).div(100);
      return { id: wh.id, amount };
    });
  }, [withholdings, subtotal, effectiveTotalIVA]);

  const totalWithholdings = useMemo(() => {
    return withholdingAmounts.reduce((acc, w) => acc.plus(w.amount), new Decimal(0));
  }, [withholdingAmounts]);

  const totalInvoice = isAIU
    ? subtotal.plus(aiuTotal).plus(aiuUtilityIVA)
    : subtotal.plus(totalTaxes);
  const netPayable = totalInvoice.minus(totalWithholdings);

  /* ── Purchase order helpers ── */

  const hasPurchaseOrder = !!(purchaseOrderConsecutive || purchaseOrderDate);
  const poIncomplete = (!!purchaseOrderConsecutive && !purchaseOrderDate)
    || (!purchaseOrderConsecutive && !!purchaseOrderDate);

  const openPurchaseOrderModal = () => {
    setTempPOConsecutive(purchaseOrderConsecutive);
    setTempPODate(purchaseOrderDate);
    setPurchaseOrderModalOpen(true);
  };

  const confirmPurchaseOrder = () => {
    setPurchaseOrderConsecutive(tempPOConsecutive);
    setPurchaseOrderDate(tempPODate);
    setPurchaseOrderModalOpen(false);
  };

  const clearPurchaseOrder = () => {
    setPurchaseOrderConsecutive('');
    setPurchaseOrderDate('');
    setPurchaseOrderModalOpen(false);
  };

  /* ── Validation ── */

  const validate = useCallback((): string[] => {
    const errors: string[] = [];

    if (!thirdPartyId) errors.push('Debe seleccionar un cliente');
    if (!operationTypeId) errors.push('Debe seleccionar un tipo de operación');

    if (items.length === 0) {
      errors.push('Debe agregar al menos un ítem');
    } else {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const label = item.product_label || `Línea ${i + 1}`;
        const qty = new Decimal(item.quantity || '0');
        const price = new Decimal(item.unit_price || '0');

        if (qty.lte(0)) errors.push(`"${label}": la cantidad debe ser mayor a 0`);
        if (price.lt(0)) errors.push(`"${label}": el precio no puede ser negativo`);
        if (!item.tax_id) errors.push(`"${label}": debe tener un impuesto asignado`);

        if (hasInventory && !item.is_service && !item.storage_id) {
          errors.push(`"${label}": debe seleccionar una bodega`);
        }
        if (hasCCModule && !item.cost_center_id) {
          errors.push(`"${label}": debe seleccionar un centro de costos`);
        }
      }
    }

    if (isAIU) {
      if (aiuAdminPct && new Decimal(aiuAdminPct).lt(0)) {
        errors.push('AIU: el porcentaje de Administración no puede ser negativo');
      }
      if (aiuUnexpectedPct && new Decimal(aiuUnexpectedPct).lt(0)) {
        errors.push('AIU: el porcentaje de Imprevistos no puede ser negativo');
      }
      if (aiuUtilityPct && new Decimal(aiuUtilityPct).lt(0)) {
        errors.push('AIU: el porcentaje de Utilidad no puede ser negativo');
      }
      if (!aiuUtilityTaxId) {
        errors.push('AIU: debe seleccionar el IVA para la utilidad');
      }
    }

    if (hasCCModule) {
      for (const wh of withholdings) {
        if (!wh.cost_center_id) {
          errors.push(`Retención "${wh.name}": debe tener un centro de costos`);
        }
      }
    }

    // Zero-total: require explicit paymentType selection
    const isZeroDoc = netPayable.isZero() && items.length > 0;
    if (isZeroDoc && !paymentType) {
      errors.push('Debe seleccionar tipo de pago (Contado o Crédito)');
    }

    const lineTypeLabels = { bank: 'Banco', cash: 'Caja', prepayment: 'Anticipo' } as const;
    for (let i = 0; i < paymentLines.length; i++) {
      const line = paymentLines[i];
      const tag = `Pago ${lineTypeLabels[line.lineType]} #${i + 1}`;
      const amt = new Decimal(line.amount || '0');

      // Skip amount > 0 check for zero-total documents
      if (!isZeroDoc && amt.lte(0)) errors.push(`${tag}: el monto debe ser mayor a 0`);

      if ((line.lineType === 'bank' || line.lineType === 'cash') && !line.bank_account_id) {
        errors.push(`${tag}: debe seleccionar ${line.lineType === 'bank' ? 'un banco' : 'una caja'}`);
      }
      if (line.lineType === 'prepayment' && !line.prepayment_id) {
        errors.push(`${tag}: debe seleccionar un anticipo`);
      }

      if (!line.company_payment_method_id) errors.push(`${tag}: debe seleccionar un medio de pago`);
      if (hasCCModule && !line.cost_center_id) errors.push(`${tag}: debe seleccionar un centro de costos`);
    }

    // Payment coverage validation (only for non-zero documents)
    if (!isZeroDoc) {
      const totalPaidDec = paymentLines.reduce(
        (acc, l) => acc.plus(new Decimal(l.amount || '0')), new Decimal(0),
      );
      const remaining = netPayable.minus(totalPaidDec);

      if (remaining.lt(0)) {
        const overpayment = remaining.abs();
        const totalCaja = paymentLines
          .filter(l => l.lineType === 'cash')
          .reduce((acc, l) => acc.plus(new Decimal(l.amount || '0')), new Decimal(0));
        if (overpayment.gt(totalCaja)) {
          errors.push('El excedente de pago solo puede provenir de líneas de caja (cambio)');
        }
      }

      if (remaining.gt(0)) {
        if (!creditConfig.dueDate) errors.push('Saldo a crédito: debe configurar la fecha de vencimiento');
        if (!creditConfig.paymentMethodId) errors.push('Saldo a crédito: debe seleccionar un medio de pago');
        if (hasCCModule && !creditConfig.costCenterId) errors.push('Saldo a crédito: debe seleccionar un centro de costos');
      }
    }

    // Zero-total credit: require credit config
    if (isZeroDoc && paymentType === 'CREDIT') {
      if (!creditConfig.dueDate) errors.push('Crédito: debe configurar la fecha de vencimiento');
      if (!creditConfig.paymentMethodId) errors.push('Crédito: debe seleccionar un medio de pago');
      if (hasCCModule && !creditConfig.costCenterId) errors.push('Crédito: debe seleccionar un centro de costos');
    }

    return errors;
  }, [thirdPartyId, operationTypeId, operationTypeCode, items, withholdings, paymentLines, creditConfig, netPayable, hasCCModule, hasInventory, isAIU, aiuAdminPct, aiuUnexpectedPct, aiuUtilityPct, aiuUtilityTaxId, paymentType]);

  /* ── Save helpers ── */

  const buildPayload = (status: 'DRAFT' | 'PENDING') => {
    const whPayload = withholdings.map((wh) => {
      const whAmt = withholdingAmounts.find(w => w.id === wh.id);
      return {
        withholding_id: wh.withholding_id,
        rate: wh.rate,
        amount: whAmt ? whAmt.amount.toFixed(4) : '0',
        cost_center_id: wh.cost_center_id || undefined,
      };
    });

    const taxDetails = taxList.map(t => ({ tax_id: t.id, name: t.name, amount: t.amount }));

    const totalPaidDec = paymentLines.reduce(
      (acc, l) => acc.plus(new Decimal(l.amount || '0')), new Decimal(0),
    );
    const remaining = netPayable.minus(totalPaidDec);
    const isZeroDoc = netPayable.isZero();
    const hasCredit = isZeroDoc
      ? paymentType === 'CREDIT' && creditConfig.dueDate
      : remaining.gt(0) && creditConfig.dueDate;

    return {
      doc_type: 'INVOICE' as const,
      status,
      third_party_id: thirdPartyId,
      doc_date: docDate,
      type_operation_id: operationTypeId || undefined,
      notes: description || undefined,
      purchase_order_consecutive: purchaseOrderConsecutive || undefined,
      purchase_order_date: purchaseOrderDate || undefined,
      subtotal: subtotal.toFixed(4),
      total_discounts: new Decimal(lineDiscounts).toFixed(4),
      total_taxes: totalTaxes.toFixed(4),
      total_withholdings: totalWithholdings.toFixed(4),
      net_amount: netPayable.toFixed(4),
      tax_details: taxDetails.length > 0 ? taxDetails : undefined,
      items: [
        ...items.map(item => ({
          product_id: item.product_id || undefined,
          description: item.description || undefined,
          quantity: item.quantity,
          unit_price: item.unit_price,
          tax_included: item.tax_included,
          is_discount_rate: item.is_discount_rate,
          discount_input: item.discount_input,
          tax_id: item.tax_id || undefined,
          tax_rate: item.tax_rate,
          storage_id: item.storage_id || undefined,
          cost_center_id: item.cost_center_id || undefined,
        })),
        // AIU: append 3 service items (Administración, Imprevistos, Utilidad)
        ...(isAIU ? [
          {
            product_id: 'aiu-administration',
            quantity: '1',
            unit_price: aiuAdminValue.toFixed(4),
            tax_included: false,
            is_discount_rate: false,
            discount_input: '0',
            tax_id: IVA_ZERO_TAX.id,
            tax_rate: 0,
          },
          {
            product_id: 'aiu-contingencies',
            quantity: '1',
            unit_price: aiuUnexpectedValue.toFixed(4),
            tax_included: false,
            is_discount_rate: false,
            discount_input: '0',
            tax_id: IVA_ZERO_TAX.id,
            tax_rate: 0,
          },
          {
            product_id: 'aiu-utility',
            quantity: '1',
            unit_price: aiuUtilityValue.toFixed(4),
            tax_included: false,
            is_discount_rate: false,
            discount_input: '0',
            tax_id: aiuUtilityTaxId || undefined,
            tax_rate: aiuUtilityTaxRate,
          },
        ] : []),
      ],
      payments: paymentLines.length > 0 ? paymentLines.map(p => ({
        company_payment_method_id: p.company_payment_method_id,
        bank_account_id: p.bank_account_id || undefined,
        prepayment_id: p.prepayment_id || undefined,
        cost_center_id: p.cost_center_id || undefined,
        amount: p.amount,
      })) : undefined,
      withholdings: whPayload.length > 0 ? whPayload : undefined,
      aiu: isAIU ? {
        administrative_percentage: aiuAdminPct || '0',
        administrative: aiuAdminValue.toFixed(4),
        unexpected_percentage: aiuUnexpectedPct || '0',
        unexpected: aiuUnexpectedValue.toFixed(4),
        utility_percentage: aiuUtilityPct || '0',
        utility: aiuUtilityValue.toFixed(4),
      } : undefined,
      credit: hasCredit ? {
        due_date: creditConfig.dueDate,
        payment_method_id: creditConfig.paymentMethodId,
        cost_center_id: creditConfig.costCenterId || undefined,
      } : undefined,
    };
  };

  const handleCancel = () => {
    if (mode === 'edit' && documentId) {
      router.push(`/dashboard/invoices/${documentId}`);
    } else {
      router.push('/dashboard/invoices');
    }
  };

  const handleSaveDraft = async () => {
    const errors = validate();
    if (errors.length > 0) {
      errors.forEach(e => toast.error(e));
      return;
    }
    setSaving(true);
    try {
      if (mode === 'edit' && documentId) {
        await documentsService.update(documentId, buildPayload('DRAFT'));
        toast.success('Borrador actualizado');
        router.push(`/dashboard/invoices/${documentId}`);
      } else {
        const result = await documentsService.create(buildPayload('DRAFT'));
        toast.success(`Borrador ${result.consecutive} guardado`);
        router.push(`/dashboard/invoices/${result.id}`);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al guardar borrador');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    const errors = validate();
    if (errors.length > 0) {
      errors.forEach(e => toast.error(e));
      return;
    }
    setSaving(true);
    try {
      if (mode === 'edit' && documentId) {
        await documentsService.update(documentId, buildPayload('PENDING'));
        toast.success('Factura actualizada');
        router.push(`/dashboard/invoices/${documentId}`);
      } else {
        const result = await documentsService.create(buildPayload('PENDING'));
        toast.success(`Factura ${result.consecutive} creada`);
        router.push(`/dashboard/invoices/${result.id}`);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al guardar factura');
    } finally {
      setSaving(false);
    }
  };

  /* ── Title ── */

  const pageTitle = mode === 'edit'
    ? `Editar Factura${initialData?.consecutive ? ` ${initialData.consecutive}` : ''}`
    : 'Nueva Factura';

  /* ── Render ── */

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <FileText className="h-5 w-5 text-indigo-500" />
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">{pageTitle}</h1>
      </div>

      {/* ── Row 1: 3 columns ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label>Cliente <span className="text-red-500">*</span></Label>
          <ThirdPartySelect
            value={thirdPartyId}
            valueLabel={thirdPartyLabel}
            onChange={(id, opt) => {
              setThirdPartyId(id);
              setThirdPartyLabel(opt ? `${opt.identification_number} - ${opt.name}` : '');
            }}
            placeholder="Seleccionar cliente..."
            includeRoles={['CLIENT']}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Fecha de Emisión <span className="text-red-500">*</span></Label>
          <DatePicker
            value={docDate}
            onChange={(v) => setDocDate(v)}
            placeholder="Seleccionar fecha"
          />
        </div>

        <div className="space-y-1.5">
          <Label>Configuración de Pago</Label>
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start"
            onClick={() => setPaymentsModalOpen(true)}
          >
            <CreditCard className="h-4 w-4 mr-2" />
            {(() => {
              const remaining = netPayable.minus(new Decimal(totalPaid));
              const hasItems = items.length > 0;
              const isZeroDoc = hasItems && netPayable.isZero();
              const isCash = isZeroDoc
                ? paymentType === 'CASH'
                : hasItems && remaining.lte(0);
              const isCredit = isZeroDoc
                ? paymentType === 'CREDIT'
                : !isCash && creditConfig.dueDate && remaining.gt(0);
              const hasConfig = paymentLines.length > 0 || isCredit || isCash;

              if (!hasConfig) {
                return <span className="text-muted-foreground">Configurar pago...</span>;
              }

              return (
                <span className="text-sm truncate">
                  {paymentLines.length > 0 && (
                    <>
                      <FormattedNumber value={totalPaid} type="currency" />
                      <span className="text-muted-foreground"> ({paymentLines.length} línea{paymentLines.length !== 1 ? 's' : ''})</span>
                    </>
                  )}
                  {isCash && (
                    <span className={`text-green-600 dark:text-green-400 ${paymentLines.length > 0 ? ' ml-1' : ''}`}>
                      Contado
                    </span>
                  )}
                  {isCredit && (
                    <>
                      {paymentLines.length > 0 && <span className="text-muted-foreground"> + </span>}
                      <span className="text-amber-600 dark:text-amber-400">
                        Crédito: {creditConfig.dueDate.slice(0, 10)}
                      </span>
                    </>
                  )}
                </span>
              );
            })()}
          </Button>
        </div>
      </div>

      {/* ── Row 2 ── */}
      <div className={`grid grid-cols-1 ${isAIU ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-3`}>
        <div className="space-y-1.5">
          <Label>Tipo de Operación <span className="text-red-500">*</span></Label>
          <SearchableSelect
            options={operationTypeOptions}
            value={operationTypeId}
            onChange={(v) => {
              setOperationTypeId(v);
              const newCode = operationTypeMap.get(v) || '';
              setOperationTypeCode(newCode);
              // Reset AIU state when user manually switches away from AIU
              if (newCode !== '09') {
                setAiuAdminPct('');
                setAiuUnexpectedPct('');
                setAiuUtilityPct('');
                setAiuUtilityTaxId('');
                setAiuUtilityTaxLabel('');
                setAiuUtilityTaxRate(0);
              }
            }}
            placeholder="Seleccionar..."
          />
        </div>

        {isAIU && (
          <div className="space-y-1.5">
            <Label>AIU</Label>
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start"
              onClick={() => setAiuModalOpen(true)}
            >
              <Calculator className="h-4 w-4 mr-2 text-indigo-500" />
              {(aiuAdminPct || aiuUnexpectedPct || aiuUtilityPct || aiuUtilityTaxId) ? (
                <span className="text-sm truncate">
                  A: {aiuAdminPct || '0'}% · I: {aiuUnexpectedPct || '0'}% · U: {aiuUtilityPct || '0'}%
                  {aiuUtilityTaxLabel && <span className="text-muted-foreground"> ({aiuUtilityTaxLabel})</span>}
                </span>
              ) : (
                <span className="text-muted-foreground">Configurar AIU...</span>
              )}
            </Button>
          </div>
        )}

        <div className="space-y-1.5">
          <Label>Orden de Compra</Label>
          <Button
            type="button"
            variant="outline"
            className={`w-full justify-start ${poIncomplete ? 'border-amber-400 text-amber-600' : ''}`}
            onClick={openPurchaseOrderModal}
          >
            <ShoppingCart className="h-4 w-4 mr-2 flex-shrink-0" />
            {hasPurchaseOrder ? (
              <span className="text-sm truncate">
                {purchaseOrderConsecutive || '(sin N°)'}
                {purchaseOrderDate ? ` — ${purchaseOrderDate.slice(0, 10)}` : ''}
                {poIncomplete && <span className="text-amber-500 ml-1">⚠</span>}
              </span>
            ) : (
              <span className="text-muted-foreground">Agregar orden...</span>
            )}
          </Button>
        </div>

        <div className="space-y-1.5">
          <Label>Descripción</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Términos, condiciones, observaciones..."
            className="h-10 min-h-[40px] resize-none py-2 text-sm"
          />
        </div>
      </div>

      {/* ── Items table ── */}
      <DocumentItemsTable items={items} onItemsChange={handleItemsChange} taxLocked={isAIU} isAIU={isAIU} />

      {/* ── Totals + Retenciones ── */}
      <div className="flex justify-end">
        <div className="w-full max-w-sm space-y-1 text-sm">
          {/* 1. SUBTOTAL */}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <FormattedNumber value={subtotalGross} type="currency" />
          </div>

          {/* 2. DESCUENTO LÍNEAS (-) */}
          {lineDiscounts > 0 && (
            <div className="flex justify-between text-red-600">
              <span>Descuento líneas (-)</span>
              <span>- <FormattedNumber value={lineDiscounts} type="currency" /></span>
            </div>
          )}

          {/* 3. BASE GRAVABLE */}
          {lineDiscounts > 0 && (
            <div className="flex justify-between border-t pt-1">
              <span className="font-medium">Base gravable</span>
              <span className="font-medium"><FormattedNumber value={subtotal.toNumber()} type="currency" /></span>
            </div>
          )}

          {/* 4a. AIU breakdown (only when type 09) */}
          {isAIU && (aiuAdminValue.gt(0) || aiuUnexpectedValue.gt(0) || aiuUtilityValue.gt(0)) && (
            <>
              {aiuAdminValue.gt(0) && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Administración ({aiuAdminPct}%) (+)</span>
                  <FormattedNumber value={aiuAdminValue.toNumber()} type="currency" />
                </div>
              )}
              {aiuUnexpectedValue.gt(0) && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Imprevistos ({aiuUnexpectedPct}%) (+)</span>
                  <FormattedNumber value={aiuUnexpectedValue.toNumber()} type="currency" />
                </div>
              )}
              {aiuUtilityValue.gt(0) && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Utilidad ({aiuUtilityPct}%) (+)</span>
                  <FormattedNumber value={aiuUtilityValue.toNumber()} type="currency" />
                </div>
              )}
              {aiuUtilityIVA.gt(0) && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">IVA Utilidad ({aiuUtilityTaxRate}%) (+)</span>
                  <FormattedNumber value={aiuUtilityIVA.toNumber()} type="currency" />
                </div>
              )}
            </>
          )}

          {/* 4b. Impuestos 1×1 (standard mode) */}
          {!isAIU && taxList.map((tax) => (
            <div key={tax.id} className="flex justify-between">
              <span className="text-muted-foreground">{tax.name} (+)</span>
              <FormattedNumber value={tax.amount} type="currency" />
            </div>
          ))}

          {/* 5. SUBTOTAL + IMPUESTOS / AIU */}
          <div className="flex justify-between border-t pt-1">
            <span className="font-medium">{isAIU ? 'Subtotal + AIU + IVA' : 'Subtotal + Impuestos'}</span>
            <span className="font-medium"><FormattedNumber value={totalInvoice.toNumber()} type="currency" /></span>
          </div>

          {/* 6. RETENCIONES */}
          <div
            className="flex justify-between items-center cursor-pointer hover:bg-muted/50 -mx-3 px-3 py-1 rounded transition-colors"
            onClick={() => setWithholdingsModalOpen(true)}
          >
            <span className="text-muted-foreground flex items-center gap-1">
              <ShieldMinus className="h-3.5 w-3.5" />
              Retenciones
              {withholdings.length > 0 && (
                <span className="text-xs text-muted-foreground">({withholdings.length})</span>
              )}
            </span>
            <span className="text-red-600 font-medium">
              {totalWithholdings.gt(0) ? '- ' : ''}<FormattedNumber value={totalWithholdings.toNumber()} type="currency" />
            </span>
          </div>

          {withholdings.map((wh) => {
            const amt = withholdingAmounts.find(w => w.id === wh.id)?.amount.toNumber() ?? 0;
            return (
              <div key={wh.id} className="flex justify-between text-red-600 pl-4 text-xs">
                <span>{wh.name} ({wh.rate}%)</span>
                <span>- <FormattedNumber value={amt} type="currency" /></span>
              </div>
            );
          })}

          {/* 7. TOTAL A PAGAR */}
          <div className="flex justify-between border-t pt-1 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 -mx-3 px-3 py-2 rounded">
            <span className="font-semibold">Total a pagar</span>
            <span className="font-semibold"><FormattedNumber value={netPayable.toNumber()} type="currency" /></span>
          </div>
        </div>
      </div>

      {/* ── Action buttons ── */}
      <div className="flex justify-end gap-3 pt-2 border-t">
        <Button type="button" variant="ghost" onClick={handleCancel} disabled={saving}>
          Cancelar
        </Button>
        <Button type="button" variant="secondary" onClick={handleSaveDraft} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Guardar Borrador
        </Button>
        <Button type="button" onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Guardar
        </Button>
      </div>

      {/* Purchase order modal */}
      <Dialog open={purchaseOrderModalOpen} onOpenChange={setPurchaseOrderModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Orden de Compra</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Consecutivo</Label>
              <Input
                value={tempPOConsecutive}
                onChange={(e) => setTempPOConsecutive(e.target.value)}
                placeholder="Ej: OC-001"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Fecha</Label>
              <DatePicker
                value={tempPODate}
                onChange={(v) => setTempPODate(v)}
                placeholder="Seleccionar fecha"
              />
            </div>

            {((!!tempPOConsecutive && !tempPODate) || (!tempPOConsecutive && !!tempPODate)) && (
              <p className="text-xs text-amber-600">
                Se recomienda llenar ambos campos (consecutivo y fecha).
              </p>
            )}
          </div>

          <DialogFooter className="flex gap-2">
            {(!!tempPOConsecutive || !!tempPODate) && (
              <Button type="button" variant="ghost" size="sm" onClick={clearPurchaseOrder}>
                Quitar OC
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => setPurchaseOrderModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={confirmPurchaseOrder}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AIU config modal */}
      {isAIU && (
        <Dialog open={aiuModalOpen} onOpenChange={setAiuModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Configuración AIU</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Administración (%)</Label>
                <div className="flex items-center gap-3">
                  <NumericInput
                    value={aiuAdminPct}
                    onChange={(e) => setAiuAdminPct(e.target.value)}
                    className="h-9 flex-1"
                    maxDecimals={2}
                  />
                  <span className="text-sm text-muted-foreground w-28 text-right">
                    <FormattedNumber value={aiuAdminValue.toNumber()} type="currency" />
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Imprevistos (%)</Label>
                <div className="flex items-center gap-3">
                  <NumericInput
                    value={aiuUnexpectedPct}
                    onChange={(e) => setAiuUnexpectedPct(e.target.value)}
                    className="h-9 flex-1"
                    maxDecimals={2}
                  />
                  <span className="text-sm text-muted-foreground w-28 text-right">
                    <FormattedNumber value={aiuUnexpectedValue.toNumber()} type="currency" />
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Utilidad (%)</Label>
                <div className="flex items-center gap-3">
                  <NumericInput
                    value={aiuUtilityPct}
                    onChange={(e) => setAiuUtilityPct(e.target.value)}
                    className="h-9 flex-1"
                    maxDecimals={2}
                  />
                  <span className="text-sm text-muted-foreground w-28 text-right">
                    <FormattedNumber value={aiuUtilityValue.toNumber()} type="currency" />
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>IVA para Utilidad <span className="text-red-500">*</span></Label>
                <TaxSelect
                  value={aiuUtilityTaxId}
                  valueLabel={aiuUtilityTaxLabel}
                  onChange={(id, label, data) => {
                    setAiuUtilityTaxId(id);
                    setAiuUtilityTaxLabel(label);
                    setAiuUtilityTaxRate(data.rate);
                  }}
                  isTax={true}
                  excludeCostTax
                  usePortal
                  includeTypeIds={[1]}
                  placeholder="Seleccionar IVA..."
                />
                {aiuUtilityIVA.gt(0) && (
                  <p className="text-xs text-muted-foreground">
                    IVA: <FormattedNumber value={aiuUtilityIVA.toNumber()} type="currency" />
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t text-sm">
              <span className="text-muted-foreground">Total AIU + IVA:</span>
              <span className="font-medium">
                <FormattedNumber value={aiuTotal.plus(aiuUtilityIVA).toNumber()} type="currency" />
              </span>
            </div>

            <DialogFooter>
              <Button type="button" onClick={() => setAiuModalOpen(false)}>
                Confirmar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Payment / Credit config modal */}
      <DocumentPaymentsModal
        open={paymentsModalOpen}
        onOpenChange={setPaymentsModalOpen}
        lines={paymentLines}
        onLinesChange={setPaymentLines}
        documentTotal={netPayable.toNumber()}
        thirdPartyId={thirdPartyId}
        creditConfig={creditConfig}
        onCreditConfigChange={setCreditConfig}
        paymentType={paymentType}
        onPaymentTypeChange={setPaymentType}
      />

      {/* Withholdings modal */}
      <DocumentWithholdingsModal
        open={withholdingsModalOpen}
        onOpenChange={setWithholdingsModalOpen}
        lines={withholdings}
        onLinesChange={setWithholdings}
        subtotal={subtotal.toNumber()}
        totalIVA={effectiveTotalIVA.toNumber()}
      />
    </div>
  );
}
