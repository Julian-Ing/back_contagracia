'use client';

import { useState, useRef, useCallback, useMemo } from 'react';
import Decimal from 'decimal.js';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Label } from '@/shared/components/ui/label';
import { NumericInput } from '@/shared/components/ui/numeric-input';
import { FormattedNumber } from '@/shared/components/ui/formatted-number';
import { DatePicker } from '@/shared/components/ui/date-picker';
import { BankAccountSelect } from '@/shared/components/ui/bank-account-select';
import { PaymentMethodSelect } from '@/shared/components/ui/payment-method-select';
import SelectPrepaymentModal, { type SelectedPrepayment } from '@/app/dashboard/accounting/journal-entries/new/SelectPrepaymentModal';
import { useCompanyModules } from '@/shared/hooks/useCompanyModules';
import { useCostCenterTree, CostCenterCascadeSelect } from '@/modules/cost-centers';
import { Trash2, Landmark, Wallet, Gift, CircleCheck } from 'lucide-react';

/* ── Types ─────────────────────────────────────────────── */

export interface DocumentPaymentLine {
  id: string;
  lineType: 'bank' | 'cash' | 'prepayment';
  bank_account_id: string;
  bank_account_label: string;
  prepayment_id: string;
  prepayment_label: string;
  prepayment_max_amount: number;
  company_payment_method_id: string;
  company_payment_method_label: string;
  amount: string;
  cost_center_id: string;
  cost_center_label: string;
  cost_center_path: string[];
}

export interface CreditConfig {
  dueDate: string;
  paymentMethodId: string;
  paymentMethodLabel: string;
  costCenterId: string;
  costCenterLabel: string;
  costCenterPath: string[];
}

export const EMPTY_CREDIT_CONFIG: CreditConfig = {
  dueDate: '',
  paymentMethodId: '',
  paymentMethodLabel: '',
  costCenterId: '',
  costCenterLabel: '',
  costCenterPath: [],
};

export type PaymentTypeChoice = 'CASH' | 'CREDIT' | '';

export interface DocumentPaymentsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lines: DocumentPaymentLine[];
  onLinesChange: (lines: DocumentPaymentLine[]) => void;
  documentTotal: number;
  thirdPartyId: string;
  creditConfig: CreditConfig;
  onCreditConfigChange: (config: CreditConfig) => void;
  /** Only used when documentTotal <= 0 */
  paymentType: PaymentTypeChoice;
  onPaymentTypeChange: (type: PaymentTypeChoice) => void;
}

/* ── Helpers ───────────────────────────────────────────── */

function emptyLine(lineType: 'bank' | 'cash' | 'prepayment'): DocumentPaymentLine {
  return {
    id: crypto.randomUUID(),
    lineType,
    bank_account_id: '',
    bank_account_label: '',
    prepayment_id: '',
    prepayment_label: '',
    prepayment_max_amount: 0,
    company_payment_method_id: '',
    company_payment_method_label: '',
    amount: '',
    cost_center_id: '',
    cost_center_label: '',
    cost_center_path: [],
  };
}

const LINE_TYPE_CONFIG = {
  bank: { label: 'Banco', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  cash: { label: 'Caja', color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
  prepayment: { label: 'Anticipo', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' },
} as const;

/* ── Component ─────────────────────────────────────────── */

export function DocumentPaymentsModal({
  open,
  onOpenChange,
  lines,
  onLinesChange,
  documentTotal,
  thirdPartyId,
  creditConfig,
  onCreditConfigChange,
  paymentType,
  onPaymentTypeChange,
}: DocumentPaymentsModalProps) {
  const dialogContentRef = useRef<HTMLDivElement>(null);
  const [prepaymentModalOpen, setPrepaymentModalOpen] = useState(false);

  const { hasModule } = useCompanyModules();
  const hasCCModule = hasModule('cost_centers');
  const { ccTree, ccFlatMap } = useCostCenterTree(hasCCModule);

  /* ── Line operations ─────────────────────── */

  const updateLine = useCallback((lineId: string, patch: Partial<DocumentPaymentLine>) => {
    onLinesChange(lines.map(l => l.id === lineId ? { ...l, ...patch } : l));
  }, [lines, onLinesChange]);

  const removeLine = useCallback((lineId: string) => {
    onLinesChange(lines.filter(l => l.id !== lineId));
  }, [lines, onLinesChange]);

  const addBankLine = useCallback(() => {
    onLinesChange([...lines, emptyLine('bank')]);
  }, [lines, onLinesChange]);

  const addCashLine = useCallback(() => {
    onLinesChange([...lines, emptyLine('cash')]);
  }, [lines, onLinesChange]);

  const handlePrepaymentSelect = useCallback((prep: SelectedPrepayment) => {
    const line: DocumentPaymentLine = {
      ...emptyLine('prepayment'),
      prepayment_id: prep.id,
      prepayment_label: `${prep.consecutive || 'S/N'} - ${prep.third_party_name}`,
      prepayment_max_amount: prep.balance,
      amount: String(prep.balance),
    };
    onLinesChange([...lines, line]);
  }, [lines, onLinesChange]);

  /* ── Totals ──────────────────────────────── */

  const totalPayments = useMemo(() => {
    return lines.reduce((acc, l) => acc.plus(new Decimal(l.amount || '0')), new Decimal(0));
  }, [lines]);

  const docTotalDec = useMemo(() => new Decimal(documentTotal || 0), [documentTotal]);
  const difference = useMemo(() => docTotalDec.minus(totalPayments), [docTotalDec, totalPayments]);

  // Zero-total edge case: user explicitly picks CASH or CREDIT (for DIAN)
  const isZeroTotal = docTotalDec.isZero();

  // Normal flow (total > 0): auto-detect from amounts
  const isFullyPaid = !isZeroTotal && difference.isZero() && totalPayments.gt(0);
  const hasChange = !isZeroTotal && difference.lt(0);
  const showCreditSection = isZeroTotal
    ? paymentType === 'CREDIT'
    : !isFullyPaid && !hasChange;
  const showPaymentLines = isZeroTotal
    ? paymentType === 'CASH'
    : true;

  // Change validation: overpayment can only come from cash lines
  const totalCash = useMemo(() => {
    return lines
      .filter(l => l.lineType === 'cash')
      .reduce((acc, l) => acc.plus(new Decimal(l.amount || '0')), new Decimal(0));
  }, [lines]);
  const changeAmount = hasChange ? difference.abs() : new Decimal(0);
  const invalidChange = hasChange && changeAmount.gt(totalCash);

  /* ── Credit helpers ──────────────────────── */

  const updateCredit = (patch: Partial<CreditConfig>) => {
    onCreditConfigChange({ ...creditConfig, ...patch });
  };

  /* ── Render ──────────────────────────────── */

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          ref={dialogContentRef}
          className={`${hasCCModule ? 'max-w-5xl' : 'max-w-3xl'} max-h-[90vh] overflow-y-auto`}
        >
          <DialogHeader>
            <DialogTitle>Configuración de Pago</DialogTitle>
          </DialogHeader>

          {/* ── Zero-total toggle (DIAN edge case) ── */}
          {isZeroTotal && (
            <div className="space-y-1.5">
              <Label>Tipo de Pago <span className="text-red-500">*</span></Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={paymentType === 'CASH' ? 'default' : 'outline'}
                  onClick={() => onPaymentTypeChange('CASH')}
                >
                  Contado
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={paymentType === 'CREDIT' ? 'default' : 'outline'}
                  onClick={() => onPaymentTypeChange('CREDIT')}
                >
                  Crédito
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Documento sin valor — no se generarán movimientos.
              </p>
            </div>
          )}

          {/* ── Payment lines ── */}
          {showPaymentLines && (
          <div className="space-y-3">
            <div className="flex gap-2 flex-wrap">
              <Button type="button" variant="outline" size="sm" onClick={addBankLine}>
                <Landmark className="h-4 w-4 mr-1" /> Banco
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={addCashLine}>
                <Wallet className="h-4 w-4 mr-1" /> Caja
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setPrepaymentModalOpen(true)}>
                <Gift className="h-4 w-4 mr-1" /> Anticipo
              </Button>
            </div>

            {lines.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {isZeroTotal
                  ? 'Agregue líneas de pago (montos en $0).'
                  : 'Sin pagos registrados — el total quedará a crédito.'}
              </p>
            ) : (
              <div className="border rounded-md overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-3 py-2 text-left font-medium w-[90px]">Tipo</th>
                      <th className="px-3 py-2 text-left font-medium">Recurso</th>
                      <th className="px-3 py-2 text-left font-medium w-[200px]">Medio de Pago</th>
                      {hasCCModule && (
                        <th className="px-3 py-2 text-left font-medium w-[220px]">Centro de Costos</th>
                      )}
                      <th className="px-3 py-2 text-right font-medium w-[150px]">Monto</th>
                      <th className="px-3 py-2 w-[50px]"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line) => {
                      const cfg = LINE_TYPE_CONFIG[line.lineType];
                      return (
                        <tr key={line.id} className="border-b last:border-b-0">
                          <td className="px-3 py-2">
                            <Badge variant="secondary" className={`text-xs ${cfg.color}`}>
                              {cfg.label}
                            </Badge>
                          </td>
                          <td className="px-3 py-2">
                            {line.lineType === 'prepayment' ? (
                              <span className="text-sm">{line.prepayment_label || '-'}</span>
                            ) : (
                              <BankAccountSelect
                                value={line.bank_account_id}
                                valueLabel={line.bank_account_label}
                                onChange={(val, opt) => updateLine(line.id, {
                                  bank_account_id: val,
                                  bank_account_label: opt?.label || '',
                                })}
                                filterType={line.lineType === 'bank' ? 'bank' : 'cash'}
                                placeholder={line.lineType === 'bank' ? 'Seleccionar banco...' : 'Seleccionar caja...'}
                                usePortal
                                portalContainer={dialogContentRef}
                              />
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <PaymentMethodSelect
                              value={line.company_payment_method_id}
                              valueLabel={line.company_payment_method_label}
                              onChange={(val, opt) => updateLine(line.id, {
                                company_payment_method_id: val,
                                company_payment_method_label: opt?.label || '',
                              })}
                              placeholder="Medio..."
                              usePortal
                              portalContainer={dialogContentRef}
                            />
                          </td>
                          {hasCCModule && (
                            <td className="px-3 py-2">
                              <CostCenterCascadeSelect
                                ccTree={ccTree}
                                ccFlatMap={ccFlatMap}
                                value={line.cost_center_id}
                                path={line.cost_center_path}
                                onChange={(id, label, path) => updateLine(line.id, {
                                  cost_center_id: id,
                                  cost_center_label: label,
                                  cost_center_path: path,
                                })}
                                size="sm"
                                itemWidth="fixed"
                              />
                            </td>
                          )}
                          <td className="px-3 py-2">
                            <NumericInput
                              value={line.amount}
                              onChange={(e) => updateLine(line.id, { amount: e.target.value })}
                            />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span
                              role="button"
                              tabIndex={0}
                              title="Eliminar línea"
                              className="inline-flex items-center justify-center cursor-pointer text-red-500 hover:text-red-700"
                              onClick={() => removeLine(line.id)}
                              onKeyDown={(e) => { if (e.key === 'Enter') removeLine(line.id); }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          )}

          {/* ── Summary card ── */}
          <div className="rounded-lg border bg-muted/30 p-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total documento</span>
              <span className="font-medium"><FormattedNumber value={documentTotal} type="currency" /></span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total pagos</span>
              <span className="font-medium"><FormattedNumber value={totalPayments.toNumber()} type="currency" /></span>
            </div>
            <div className="border-t pt-1.5 mt-1.5">
              {isFullyPaid && (
                <div className="flex justify-between items-center text-green-600 dark:text-green-400">
                  <span className="flex items-center gap-1.5 font-medium">
                    <CircleCheck className="h-4 w-4" />
                    Pagado completo
                  </span>
                </div>
              )}
              {hasChange && (
                <>
                  <div className={`flex justify-between font-medium ${invalidChange ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                    <span>Cambio</span>
                    <FormattedNumber value={changeAmount.toNumber()} type="currency" />
                  </div>
                  {invalidChange && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                      El cambio solo puede provenir de líneas de caja.
                      {totalCash.isZero()
                        ? ' No hay líneas de caja.'
                        : <> Caja cubre solo <FormattedNumber value={totalCash.toNumber()} type="currency" /> del cambio.</>
                      }
                    </p>
                  )}
                </>
              )}
              {showCreditSection && difference.gt(0) && (
                <div className="flex justify-between text-amber-600 dark:text-amber-400 font-medium">
                  <span>Saldo a crédito</span>
                  <FormattedNumber value={difference.toNumber()} type="currency" />
                </div>
              )}
            </div>
          </div>

          {/* ── Credit config (when not fully paid / not overpaid) ── */}
          {showCreditSection && (
            <div className="space-y-3 border-t pt-3">
              <h4 className="text-sm font-medium text-amber-700 dark:text-amber-400">
                Condiciones de Crédito
                {difference.gt(0) && (
                  <span className="text-muted-foreground font-normal ml-2 text-xs">
                    (saldo: <FormattedNumber value={difference.toNumber()} type="currency" />)
                  </span>
                )}
              </h4>
              <div className={`grid grid-cols-1 ${hasCCModule ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-3`}>
                <div className="space-y-1.5">
                  <Label>Fecha de Vencimiento <span className="text-red-500">*</span></Label>
                  <DatePicker
                    value={creditConfig.dueDate}
                    onChange={(v) => updateCredit({ dueDate: v })}
                    placeholder="Seleccionar vencimiento"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Medio de Pago <span className="text-red-500">*</span></Label>
                  <PaymentMethodSelect
                    value={creditConfig.paymentMethodId}
                    valueLabel={creditConfig.paymentMethodLabel}
                    onChange={(val, opt) => updateCredit({
                      paymentMethodId: val,
                      paymentMethodLabel: opt?.label || '',
                    })}
                    placeholder="Seleccionar medio..."
                  />
                </div>

                {hasCCModule && (
                  <div className="space-y-1.5">
                    <Label>Centro de Costos <span className="text-red-500">*</span></Label>
                    <CostCenterCascadeSelect
                      ccTree={ccTree}
                      ccFlatMap={ccFlatMap}
                      value={creditConfig.costCenterId}
                      path={creditConfig.costCenterPath}
                      onChange={(id, label, path) => updateCredit({
                        costCenterId: id,
                        costCenterLabel: label,
                        costCenterPath: path,
                      })}
                      size="sm"
                      placeholder="Seleccionar CC..."
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => onOpenChange(false)} disabled={invalidChange}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Prepayment selection sub-modal */}
      <SelectPrepaymentModal
        open={prepaymentModalOpen}
        onClose={() => setPrepaymentModalOpen(false)}
        onSelect={handlePrepaymentSelect}
        thirdPartyId={thirdPartyId || undefined}
        allowedTypes={['CLIENT']}
      />
    </>
  );
}
