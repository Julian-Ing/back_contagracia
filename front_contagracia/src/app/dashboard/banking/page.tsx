'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { ProtectedRoute } from '@/shared/components/auth';
import { usePermissions } from '@/shared/hooks/usePermissions';
import { useCompanyModules } from '@/shared/hooks/useCompanyModules';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { AccountSelect } from '@/shared/components/ui/account-select';
import { NumericInput } from '@/shared/components/ui/numeric-input';
import { AsyncSearchableSelect, LoadOptionsResult } from '@/shared/components/ui/async-searchable-select';
import { accountingClient } from '@/shared/services/api/apiClient';
import { accountingConfigService } from '@/modules/accounting';
import { useCostCenterTree, CostCenterCascadeSelect } from '@/modules/cost-centers';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Banknote, Plus, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { BankAccountsList } from '@/modules/banking';

type BankAccountType = 'SAVINGS' | 'CHECKING' | 'CASH';

interface BankAccountForm {
  account_type: BankAccountType;
  bank_id: string;
  bank_label: string;
  account_number: string;
  account_name: string;
  account_id: string;
  account_label: string;
  initial_balance: string;
  counterpart_account_id: string;
  counterpart_account_label: string;
  cost_center_id: string;
  cost_center_label: string;
  cost_center_path: string[];
}

const initialForm: BankAccountForm = {
  account_type: 'SAVINGS',
  bank_id: '',
  bank_label: '',
  account_number: '',
  account_name: '',
  account_id: '',
  account_label: '',
  initial_balance: '',
  counterpart_account_id: '',
  counterpart_account_label: '',
  cost_center_id: '',
  cost_center_label: '',
  cost_center_path: [],
};

export default function BankingPage() {
  const { can } = usePermissions();
  const { hasModule } = useCompanyModules();
  const canCreate = can('bank_accounts.create');
  const canEdit = can('bank_accounts.edit');
  const canDelete = can('bank_accounts.delete');
  const canActivate = can('bank_accounts.activate');
  const canDeactivate = can('bank_accounts.deactivate');
  const canViewMovements = can('bank_transactions.view');
  // Si la compañía tiene módulo de contabilidad, debe asignar cuentas contables
  const hasAccountingModule = hasModule('accounting');
  const hasCCModule = hasModule('cost_centers');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState<BankAccountForm>(initialForm);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // CC tree
  const { ccTree, ccFlatMap } = useCostCenterTree(hasCCModule);

  const isCash = form.account_type === 'CASH';
  const hasInitialBalance = parseFloat(form.initial_balance) > 0;

  // Cargar cuentas por defecto al abrir modal
  const handleOpenModal = async () => {
    setForm(initialForm);
    setShowCreateModal(true);

    if (hasAccountingModule) {
      try {
        // Cargar cuenta contable por defecto (bancos por defecto, ya que SAVINGS es el default)
        const bankConfig = await accountingConfigService.getByKey('finance_bank_account');
        const counterpartConfig = await accountingConfigService.getByKey('accounting_social_capital');

        setForm(prev => ({
          ...prev,
          ...(bankConfig?.account_code && bankConfig.account && {
            account_id: bankConfig.account_code,
            account_label: `${bankConfig.account.code} - ${bankConfig.account.name}`,
          }),
          ...(counterpartConfig?.account_code && counterpartConfig.account && {
            counterpart_account_id: counterpartConfig.account_code,
            counterpart_account_label: `${counterpartConfig.account.code} - ${counterpartConfig.account.name}`,
          }),
        }));
      } catch (err) {
        console.error('[BankingPage] Error loading default accounts:', err);
      }
    }
  };


  const loadBanks = useCallback(async (search: string, page: number): Promise<LoadOptionsResult> => {
    try {
      const response = await accountingClient.get('/banks', {
        params: { search, page, limit: 50 },
      });
      return {
        data: response.data.data.map((b: any) => ({
          value: b.id,
          label: b.name,
        })),
        hasMore: response.data.hasMore,
        total: response.data.total,
      };
    } catch {
      return { data: [], hasMore: false, total: 0 };
    }
  }, []);

  // Validación del formulario
  const isValid = (() => {
    if (!form.account_name.trim()) return false;
    if (!isCash && !form.bank_id) return false;
    if (!isCash && !form.account_number.trim()) return false;
    // Si tiene saldo inicial y módulo contable, requiere cuenta contable y contrapartida
    if (hasInitialBalance && hasAccountingModule) {
      if (!form.account_id) return false;
      if (!form.counterpart_account_id) return false;
    }
    // Si tiene saldo inicial y módulo CC, requiere centro de costos
    if (hasInitialBalance && hasCCModule) {
      if (!form.cost_center_id) return false;
    }
    return true;
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validación frontend
    if (!form.account_name.trim()) {
      toast.error('El nombre de la cuenta es requerido');
      return;
    }
    if (!isCash && !form.bank_id) {
      toast.error('Debe seleccionar un banco');
      return;
    }
    if (!isCash && !form.account_number.trim()) {
      toast.error('El número de cuenta es requerido');
      return;
    }

    setLoading(true);

    try {
      const initialBalance = parseFloat(form.initial_balance) || 0;

      const payload = {
        account_type: form.account_type,
        account_name: form.account_name.trim(),
        ...(form.account_type !== 'CASH' && {
          bank_id: form.bank_id || undefined,
          account_number: form.account_number.trim() || undefined,
        }),
        ...(hasAccountingModule && form.account_id && {
          account_id: form.account_id,
        }),
        ...(initialBalance > 0 && {
          initial_balance: initialBalance,
          ...(hasAccountingModule && {
            counterpart_account_id: form.counterpart_account_id || undefined,
          }),
          ...(hasCCModule && form.cost_center_id && {
            cost_center_id: form.cost_center_id,
          }),
        }),
      };

      await accountingClient.post('/bank-accounts', payload);
      toast.success('Cuenta bancaria creada exitosamente');
      setShowCreateModal(false);
      setForm(initialForm);
      setRefreshKey((k) => k + 1);
    } catch (err: any) {
      const message = err.response?.data?.message || 'Error al crear la cuenta bancaria';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute permission="bank_accounts.view" deniedMessage="No tienes permisos para ver Bancos y Cuentas.">
      <div className="p-6">
        <header className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 grid place-items-center rounded-lg bg-emerald-500 text-white">
              <Banknote className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bancos y Cuentas</h1>
              <p className="text-sm text-muted-foreground">Gestiona tus cuentas bancarias y movimientos.</p>
            </div>
          </div>
          {canCreate && (
            <Button onClick={handleOpenModal}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Cuenta
            </Button>
          )}
        </header>

        <BankAccountsList
          key={refreshKey}
          canEdit={canEdit}
          canDelete={canDelete}
          canActivate={canActivate}
          canDeactivate={canDeactivate}
          canViewMovements={canViewMovements}
          hasAccountingModule={hasAccountingModule}
        />
      </div>

      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nueva Cuenta Bancaria</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Tipo de cuenta */}
            <div className="space-y-2">
              <Label>Tipo de cuenta</Label>
              <div className="flex gap-2">
                {(['SAVINGS', 'CHECKING', 'CASH'] as BankAccountType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={async () => {
                      // Cargar cuenta contable según tipo
                      const configKey = type === 'CASH' ? 'finance_cash_account' : 'finance_bank_account';
                      try {
                        const config = await accountingConfigService.getByKey(configKey);
                        const accountCode = config?.account_code || '';
                        const accountLabel = config?.account
                          ? `${config.account.code} - ${config.account.name}`
                          : accountCode ? `${accountCode} - ${config?.description || ''}` : '';

                        setForm(prev => ({
                          ...prev,
                          account_type: type,
                          bank_id: '',
                          bank_label: '',
                          account_number: '',
                          account_id: accountCode,
                          account_label: accountLabel,
                        }));
                      } catch (err) {
                        console.error('[BankingPage] Error loading account for type:', err);
                        setForm(prev => ({ ...prev, account_type: type, bank_id: '', bank_label: '', account_number: '' }));
                      }
                    }}
                    className={`flex-1 px-3 py-2 text-sm rounded-md border transition-colors ${
                      form.account_type === type
                        ? 'bg-emerald-500 text-white border-emerald-500'
                        : 'bg-white dark:bg-slate-800 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-slate-700'
                    }`}
                  >
                    {type === 'SAVINGS' ? 'Ahorros' : type === 'CHECKING' ? 'Corriente' : 'Caja'}
                  </button>
                ))}
              </div>
            </div>

            {/* Banco (solo si no es CASH) */}
            {!isCash && (
              <div className="space-y-2">
                <Label>Banco</Label>
                <AsyncSearchableSelect
                  loadOptions={loadBanks}
                  value={form.bank_id}
                  valueLabel={form.bank_label}
                  onChange={(id, opt) => setForm({
                    ...form,
                    bank_id: id,
                    bank_label: opt?.label || '',
                  })}
                  placeholder="Seleccionar banco..."
                  searchPlaceholder="Buscar banco..."
                />
              </div>
            )}

            {/* Número de cuenta (solo si no es CASH) */}
            {!isCash && (
              <div className="space-y-2">
                <Label>Número de cuenta</Label>
                <Input
                  value={form.account_number}
                  onChange={(e) => setForm({ ...form, account_number: e.target.value })}
                  placeholder="Ej: 123-456789-00"
                />
              </div>
            )}

            {/* Nombre de la cuenta */}
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input
                value={form.account_name}
                onChange={(e) => setForm({ ...form, account_name: e.target.value })}
                placeholder={isCash ? 'Ej: Caja Principal' : 'Ej: Cuenta Nómina'}
                required
              />
            </div>

            {/* Saldo inicial */}
            <div className="space-y-2">
              <Label>Saldo inicial</Label>
              <NumericInput
                value={form.initial_balance}
                onChange={(e) => setForm({ ...form, initial_balance: e.target.value })}
                placeholder="0"
                allowNegative={false}
                maxDecimals={2}
              />
            </div>

            {/* Cuenta contable (solo si tiene permiso y hay saldo inicial) */}
            {hasAccountingModule && hasInitialBalance && (
              <>
                <div className="space-y-2">
                  <Label>Cuenta contable {hasInitialBalance && <span className="text-red-500">*</span>}</Label>
                  <AccountSelect
                    value={form.account_id}
                    valueLabel={form.account_label}
                    onChange={(code, account) => setForm({
                      ...form,
                      account_id: code,
                      account_label: account ? `${account.code} - ${account.name}` : '',
                    })}
                    placeholder="Seleccionar cuenta..."
                    includePrefixes={isCash ? '1105' : '1110'}
                    showCreateButton={false}
                    dropdownPosition="top"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Cuenta contrapartida <span className="text-red-500">*</span></Label>
                  <AccountSelect
                    value={form.counterpart_account_id}
                    valueLabel={form.counterpart_account_label}
                    onChange={(code, account) => setForm({
                      ...form,
                      counterpart_account_id: code,
                      counterpart_account_label: account ? `${account.code} - ${account.name}` : '',
                    })}
                    placeholder="Seleccionar cuenta..."
                    excludePrefixes="1105,1110"
                    showCreateButton={false}
                    dropdownPosition="top"
                  />
                </div>
              </>
            )}

            {/* Cuenta contable sin saldo inicial (solo si tiene permiso) */}
            {hasAccountingModule && !hasInitialBalance && (
              <div className="space-y-2">
                <Label>Cuenta contable</Label>
                <AccountSelect
                  value={form.account_id}
                  valueLabel={form.account_label}
                  onChange={(code, account) => setForm({
                    ...form,
                    account_id: code,
                    account_label: account ? `${account.code} - ${account.name}` : '',
                  })}
                  placeholder="Seleccionar cuenta..."
                  includePrefixes={isCash ? '1105' : '1110'}
                  showCreateButton={false}
                  dropdownPosition="top"
                />
              </div>
            )}

            {/* Centro de costos (solo si tiene módulo CC y saldo inicial) */}
            {hasCCModule && hasInitialBalance && (
              <div className="space-y-2">
                <Label>Centro de costos <span className="text-red-500">*</span></Label>
                <div className="flex items-center gap-2">
                  <CostCenterCascadeSelect
                    ccTree={ccTree}
                    ccFlatMap={ccFlatMap}
                    value={form.cost_center_id}
                    path={form.cost_center_path}
                    onChange={(id, label, path) => {
                      setForm(prev => ({
                        ...prev,
                        cost_center_path: path,
                        cost_center_id: id,
                        cost_center_label: label,
                      }));
                    }}
                    size="md"
                    itemWidth="auto"
                  />
                </div>
              </div>
            )}

            {/* Botones */}
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)} disabled={loading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading || !isValid}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Crear
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </ProtectedRoute>
  );
}
