'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Label } from '@/shared/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/shared/components/ui/dialog';
import { ThirdPartySelect } from '@/shared/components/ui/third-party-select';
import type { ThirdPartyOption } from '@/shared/components/ui/third-party-select';
import { AccountSelect } from '@/shared/components/ui/account-select';
import type { AccountOption } from '@/shared/components/ui/account-select';
import { BankAccountSelect } from '@/shared/components/ui/bank-account-select';
import { PaymentMethodSelect } from '@/shared/components/ui/payment-method-select';
import { NumericInput } from '@/shared/components/ui/numeric-input';
import { DatePicker } from '@/shared/components/ui/date-picker';
import toast from 'react-hot-toast';
import { Users, Truck, Briefcase, Landmark, BookOpen } from 'lucide-react';
import { useCompanyModules } from '@/shared/hooks/useCompanyModules';
import type { PrepaymentType } from '@/modules/ar-ap';
import { prepaymentsService } from '@/modules/ar-ap/services/prepayments.service';
import type { CreatePrepaymentPayload } from '@/modules/ar-ap/services/prepayments.service';
import { accountingConfigService } from '@/modules/accounting';
import { useCostCenterTree, CostCenterCascadeSelect } from '@/modules/cost-centers';

interface CreatePrepaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

function getAvailableTypes(roles: string[]): PrepaymentType[] {
  const hasEmployee = roles.includes('EMPLOYEE');
  const hasOther = roles.some((r) => r !== 'EMPLOYEE' && r !== 'CONTACT');

  if (hasEmployee && hasOther) return ['CLIENT', 'SUPPLIER', 'EMPLOYEE'];
  if (hasEmployee) return ['EMPLOYEE'];
  return ['CLIENT', 'SUPPLIER'];
}

const TYPE_CONFIG: Record<PrepaymentType, { label: string; icon: typeof Users; color: string; configKey: string }> = {
  CLIENT: { label: 'Cliente', icon: Users, color: 'bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700 dark:hover:bg-blue-900/50', configKey: 'sales_customer_advance' },
  SUPPLIER: { label: 'Proveedor', icon: Truck, color: 'bg-purple-100 text-purple-700 border-purple-300 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-700 dark:hover:bg-purple-900/50', configKey: 'purchases_supplier_advance' },
  EMPLOYEE: { label: 'Empleado', icon: Briefcase, color: 'bg-orange-100 text-orange-700 border-orange-300 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-700 dark:hover:bg-orange-900/50', configKey: 'accounting_employee_advance' },
};

export function CreatePrepaymentModal({ open, onOpenChange, onSuccess }: CreatePrepaymentModalProps) {
  const { hasModule } = useCompanyModules();
  const hasAccounting = hasModule('accounting');
  const hasCCModule = hasModule('cost_centers');

  const [selectedThirdParty, setSelectedThirdParty] = useState<ThirdPartyOption | null>(null);
  const [selectedType, setSelectedType] = useState<PrepaymentType | null>(null);
  const [accountCode, setAccountCode] = useState('');
  const [accountLabel, setAccountLabel] = useState('');
  const [paymentMode, setPaymentMode] = useState<'BANK' | 'ACCOUNT'>('BANK');
  const [bankAccountId, setBankAccountId] = useState('');
  const [bankAccountLabel, setBankAccountLabel] = useState('');
  const [counterpartCode, setCounterpartCode] = useState('');
  const [counterpartLabel, setCounterpartLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [paymentMethodLabel, setPaymentMethodLabel] = useState('');
  const [costCenterId, setCostCenterId] = useState('');
  const [costCenterLabel, setCostCenterLabel] = useState('');
  const [costCenterPath, setCostCenterPath] = useState<string[]>([]);

  const { ccTree, ccFlatMap } = useCostCenterTree(hasCCModule);

  const availableTypes = selectedThirdParty ? getAvailableTypes(selectedThirdParty.roles) : [];

  // Load default account from accounting config when type changes
  useEffect(() => {
    if (!selectedType || !hasAccounting) {
      setAccountCode('');
      setAccountLabel('');
      return;
    }

    const configKey = TYPE_CONFIG[selectedType].configKey;
    accountingConfigService.getByKey(configKey).then((config) => {
      if (config?.account_code && config.account) {
        setAccountCode(config.account_code);
        setAccountLabel(`${config.account.code} - ${config.account.name}`);
      } else {
        setAccountCode('');
        setAccountLabel('');
      }
    });
  }, [selectedType, hasAccounting]);

  const handleThirdPartyChange = (id: string, tp?: ThirdPartyOption) => {
    setSelectedThirdParty(tp || null);
    setSelectedType(null);
  };

  const handleAccountChange = (code: string, account?: AccountOption) => {
    setAccountCode(code);
    setAccountLabel(account ? `${account.code} - ${account.name}` : '');
  };

  const handlePaymentModeChange = (mode: 'BANK' | 'ACCOUNT') => {
    setPaymentMode(mode);
    setBankAccountId(''); setBankAccountLabel('');
    setCounterpartCode(''); setCounterpartLabel('');
    setPaymentMethodId(''); setPaymentMethodLabel('');
  };

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedThirdParty) return toast.error('Selecciona un tercero');
    if (!selectedType) return toast.error('Selecciona un tipo de anticipo');
    if (hasAccounting && !accountCode) return toast.error('Selecciona la cuenta de anticipo');
    if (hasAccounting && paymentMode === 'ACCOUNT' && !counterpartCode) return toast.error('Selecciona la cuenta de cruce');
    if (!hasAccounting || paymentMode === 'BANK') {
      if (!bankAccountId) return toast.error('Selecciona un banco o caja');
      if (!paymentMethodId) return toast.error('Selecciona un método de pago');
    }
    if (!amount || parseFloat(amount) <= 0) return toast.error('El monto debe ser mayor a 0');
    if (!date) return toast.error('Selecciona la fecha del anticipo');

    const payload: CreatePrepaymentPayload = {
      third_party_id: selectedThirdParty.id,
      prepayment_type: selectedType,
      prepayment_date: date,
      original_amount: parseFloat(amount),
      ...(hasAccounting && accountCode ? { account_code: accountCode } : {}),
      ...(hasAccounting && paymentMode === 'ACCOUNT' && counterpartCode ? { counterpart_account_code: counterpartCode } : {}),
      ...(!hasAccounting || paymentMode === 'BANK' ? { bank_account_id: bankAccountId, company_payment_method_id: paymentMethodId } : {}),
      ...(notes ? { notes } : {}),
      ...(costCenterId ? { cost_center_id: costCenterId, cost_center_path: costCenterPath } : {}),
    };

    setSubmitting(true);
    try {
      await prepaymentsService.create(payload);
      toast.success('Anticipo creado exitosamente');
      onSuccess?.();
      handleOpenChange(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al crear el anticipo');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) {
      setSelectedThirdParty(null);
      setSelectedType(null);
      setAccountCode('');
      setAccountLabel('');
      setPaymentMode('BANK');
      setBankAccountId(''); setBankAccountLabel('');
      setCounterpartCode(''); setCounterpartLabel('');
      setAmount('');
      setDate(new Date().toISOString().slice(0, 10));
      setNotes('');
      setPaymentMethodId(''); setPaymentMethodLabel('');
      setCostCenterId(''); setCostCenterLabel(''); setCostCenterPath([]);
    }
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nuevo Anticipo</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Tercero *</Label>
            <ThirdPartySelect
              value={selectedThirdParty?.id || ''}
              onChange={handleThirdPartyChange}
              placeholder="Seleccionar tercero..."
              excludeRoles={['CONTACT']}
            />
          </div>

          <div className="space-y-2">
            <Label>Tipo de anticipo *</Label>
            <div className="flex gap-2">
              {availableTypes.map((type) => {
                const config = TYPE_CONFIG[type];
                const Icon = config.icon;
                const isSelected = selectedType === type;
                return (
                  <Button
                    key={type}
                    type="button"
                    variant="outline"
                    disabled={!selectedThirdParty}
                    onClick={() => setSelectedType(type)}
                    className={`flex items-center gap-2 border ${
                      isSelected
                        ? `${config.color} ring-2 ring-offset-1 ring-current`
                        : 'hover:bg-muted'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {config.label}
                  </Button>
                );
              })}
              {availableTypes.length === 0 && (
                <span className="text-sm text-muted-foreground">Seleccione un tercero</span>
              )}
            </div>
          </div>

          {hasAccounting && (
            <div className="space-y-2">
              <Label>Cuenta de anticipo *</Label>
              <AccountSelect
                value={accountCode}
                valueLabel={accountLabel}
                onChange={handleAccountChange}
                placeholder="Seleccionar cuenta..."
                disabled={!selectedType}
                dropdownPosition="top"
              />
            </div>
          )}

          {hasAccounting && (
            <div className="space-y-2">
              <Label>Cruce con *</Label>
              <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
                <button
                  type="button"
                  disabled={!selectedType}
                  onClick={() => handlePaymentModeChange('BANK')}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                    paymentMode === 'BANK'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'
                  } ${!selectedType ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <Landmark className="h-4 w-4" />
                  Banco y método de pago
                </button>
                <button
                  type="button"
                  disabled={!selectedType}
                  onClick={() => handlePaymentModeChange('ACCOUNT')}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium transition-colors border-l border-gray-300 dark:border-gray-600 ${
                    paymentMode === 'ACCOUNT'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'
                  } ${!selectedType ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <BookOpen className="h-4 w-4" />
                  Cuenta contable
                </button>
              </div>
            </div>
          )}

          {(!hasAccounting || paymentMode === 'BANK') ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Banco / Caja *</Label>
                <BankAccountSelect
                  value={bankAccountId}
                  valueLabel={bankAccountLabel}
                  onChange={(id, opt) => { setBankAccountId(id); setBankAccountLabel(opt?.label || ''); }}
                  placeholder="Seleccionar banco o caja..."
                  disabled={!selectedType}
                  dropdownPosition="top"
                />
              </div>
              <div className="space-y-2">
                <Label>Método de pago *</Label>
                <PaymentMethodSelect
                  value={paymentMethodId}
                  valueLabel={paymentMethodLabel}
                  onChange={(id, opt) => { setPaymentMethodId(id); setPaymentMethodLabel(opt?.label || ''); }}
                  placeholder="Seleccionar método..."
                  disabled={!selectedType}
                  dropdownPosition="top"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Cuenta de cruce *</Label>
              <AccountSelect
                value={counterpartCode}
                valueLabel={counterpartLabel}
                onChange={(code, acc) => { setCounterpartCode(code); setCounterpartLabel(acc ? `${acc.code} - ${acc.name}` : ''); }}
                placeholder="Seleccionar cuenta de cruce..."
                disabled={!selectedType}
                dropdownPosition="top"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Monto *</Label>
              <NumericInput
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                allowNegative={false}
                disabled={!selectedType}
              />
            </div>
            <div className="space-y-2">
              <Label>Fecha del anticipo *</Label>
              <DatePicker
                value={date}
                onChange={setDate}
                placeholder="Seleccionar fecha..."
                disabled={!selectedType}
              />
            </div>
          </div>

          {hasCCModule && (
            <div className="space-y-2">
              <Label>Centro de costos</Label>
              <div className="flex items-center gap-2">
                <CostCenterCascadeSelect
                  ccTree={ccTree}
                  ccFlatMap={ccFlatMap}
                  value={costCenterId}
                  path={costCenterPath}
                  onChange={(id, label, path) => {
                    setCostCenterId(id);
                    setCostCenterLabel(label);
                    setCostCenterPath(path);
                  }}
                  disabled={!selectedType}
                  size="md"
                  itemWidth="auto"
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Notas (opcional)</Label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Descripción adicional..."
              disabled={!selectedType}
              rows={2}
              className="flex w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
