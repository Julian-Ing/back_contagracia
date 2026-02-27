'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Switch } from '@/shared/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { NumericInput } from '@/shared/components/ui/numeric-input';
import { Label } from '@/shared/components/ui/label';
import { SearchableSelect } from '@/shared/components/ui/searchable-select';
import { AccountSelect } from '@/shared/components/ui/account-select';
import { usePermissions } from '@/shared/hooks/usePermissions';
import { useCompanyModules } from '@/shared/hooks/useCompanyModules';
import { taxesService } from '../services/taxes.service';
import { accountingConfigService } from '@/modules/accounting/services/accountingConfig.service';
import type { Tax, TaxType, CreateTaxData, UpdateTaxData } from '../types';

// Tipos por defecto
const DEFAULT_TAX_TYPE_ID = '1'; // IVA
const DEFAULT_WITHHOLDING_TYPE_ID = '6'; // ReteRenta

// Tipos que solo tienen cuenta de ventas (no compras)
const SALES_ONLY_TYPES = [4, 10]; // INC, INC Bolsas

// Mapeo tipo_id → keys de accounting config
const TAX_TYPE_ACCOUNT_KEYS: Record<number, { sales: string; purchases?: string }> = {
  // Impuestos
  1: { sales: 'sales_iva', purchases: 'purchases_iva' },
  4: { sales: 'finance_inc_sales' }, // INC solo ventas
  10: { sales: 'finance_bag_tax_sales' }, // Bolsas solo ventas
  // Retenciones
  5: { sales: 'sales_reteiva', purchases: 'purchases_reteiva' },
  6: { sales: 'sales_retefuente', purchases: 'purchases_retefuente' },
  7: { sales: 'sales_reteica', purchases: 'purchases_reteica' },
};

interface TaxFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tax?: Tax | null;
  is_tax: boolean;
  canActivate: boolean;
  canDeactivate: boolean;
  onSuccess: () => void;
}

export function TaxFormModal({ open, onOpenChange, tax, is_tax, canActivate, canDeactivate, onSuccess }: TaxFormModalProps) {
  const { can } = usePermissions();
  const { hasModule } = useCompanyModules();
  const canEdit = can('tax.rates.edit');
  const canAssignAccounts = can('accounting.tax.accounts.assign');
  const hasAccountingModule = hasModule('accounting');

  const isEdit = !!tax;

  // Creación: mostrar cuentas si tiene módulo accounting
  // Edición: mostrar cuentas si tiene permiso
  const showAccountFields = isEdit ? canAssignAccounts : hasAccountingModule;

  const [loading, setLoading] = useState(false);
  const [taxTypes, setTaxTypes] = useState<TaxType[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [rate, setRate] = useState('');
  const [perUnitAmount, setPerUnitAmount] = useState('');
  const [taxTypeId, setTaxTypeId] = useState<string>('');
  const [description, setDescription] = useState('');
  const [isCostTax, setIsCostTax] = useState(false);
  const [isActive, setIsActive] = useState(true);

  // INC Bolsas (tax_type_id=10) uses per-unit amount instead of rate
  const isPerUnit = parseInt(taxTypeId, 10) === 10;

  // Account codes
  const [taxSalesAccountCode, setTaxSalesAccountCode] = useState('');
  const [taxPurchasesAccountCode, setTaxPurchasesAccountCode] = useState('');
  const [taxCostAccountCode, setTaxCostAccountCode] = useState('');
  const [withholdingSalesAccountCode, setWithholdingSalesAccountCode] = useState('');
  const [withholdingPurchasesAccountCode, setWithholdingPurchasesAccountCode] = useState('');

  // Account labels (for display)
  const [taxSalesAccountLabel, setTaxSalesAccountLabel] = useState('');
  const [taxPurchasesAccountLabel, setTaxPurchasesAccountLabel] = useState('');
  const [taxCostAccountLabel, setTaxCostAccountLabel] = useState('');
  const [withholdingSalesAccountLabel, setWithholdingSalesAccountLabel] = useState('');
  const [withholdingPurchasesAccountLabel, setWithholdingPurchasesAccountLabel] = useState('');

  // Cargar cuentas desde accounting config según el tipo
  const loadAccountsForType = async (typeId: number) => {
    const keys = TAX_TYPE_ACCOUNT_KEYS[typeId];
    if (!keys) return;

    // Cargar cuenta de ventas
    if (keys.sales) {
      const salesConfig = await accountingConfigService.getByKey(keys.sales);
      if (salesConfig?.account) {
        if (is_tax) {
          setTaxSalesAccountCode(salesConfig.account.code);
          setTaxSalesAccountLabel(`${salesConfig.account.code} - ${salesConfig.account.name}`);
        } else {
          setWithholdingSalesAccountCode(salesConfig.account.code);
          setWithholdingSalesAccountLabel(`${salesConfig.account.code} - ${salesConfig.account.name}`);
        }
      }
    }

    // Cargar cuenta de compras (si existe para este tipo)
    if (keys.purchases) {
      const purchasesConfig = await accountingConfigService.getByKey(keys.purchases);
      if (purchasesConfig?.account) {
        if (is_tax) {
          setTaxPurchasesAccountCode(purchasesConfig.account.code);
          setTaxPurchasesAccountLabel(`${purchasesConfig.account.code} - ${purchasesConfig.account.name}`);
        } else {
          setWithholdingPurchasesAccountCode(purchasesConfig.account.code);
          setWithholdingPurchasesAccountLabel(`${purchasesConfig.account.code} - ${purchasesConfig.account.name}`);
        }
      }
    }
  };

  // Load tax types
  useEffect(() => {
    const loadTaxTypes = async () => {
      try {
        const types = await taxesService.getTaxTypes(is_tax);
        setTaxTypes(types);
      } catch (err) {
        console.error('Error loading tax types:', err);
      }
    };
    if (open) loadTaxTypes();
  }, [open, is_tax]);

  // Populate form
  useEffect(() => {
    if (!open) return;

    const initForm = async () => {
      if (tax) {
        // EDICIÓN
        setName(tax.name);
        setRate(String(tax.rate));
        setPerUnitAmount(tax.per_unit_amount != null ? String(tax.per_unit_amount) : '');
        setTaxTypeId(String(tax.tax_type_id));
        setDescription(tax.description || '');
        setIsCostTax(tax.is_cost_tax || false);
        setIsActive(tax.is_active !== false);

        // Account codes desde el tax existente
        if (is_tax) {
          setTaxSalesAccountCode(tax.tax_sales_account?.code || '');
          setTaxSalesAccountLabel(tax.tax_sales_account ? `${tax.tax_sales_account.code} - ${tax.tax_sales_account.name}` : '');
          setTaxPurchasesAccountCode(tax.tax_purchases_account?.code || '');
          setTaxPurchasesAccountLabel(tax.tax_purchases_account ? `${tax.tax_purchases_account.code} - ${tax.tax_purchases_account.name}` : '');
          setTaxCostAccountCode(tax.tax_cost_account?.code || '');
          setTaxCostAccountLabel(tax.tax_cost_account ? `${tax.tax_cost_account.code} - ${tax.tax_cost_account.name}` : '');

          // Si tiene permiso y las cuentas están vacías, precargar desde config
          if (canAssignAccounts && !tax.tax_sales_account && !tax.tax_purchases_account) {
            await loadAccountsForType(tax.tax_type_id);
          }
        } else {
          setWithholdingSalesAccountCode(tax.withholding_sales_account?.code || '');
          setWithholdingSalesAccountLabel(tax.withholding_sales_account ? `${tax.withholding_sales_account.code} - ${tax.withholding_sales_account.name}` : '');
          setWithholdingPurchasesAccountCode(tax.withholding_purchases_account?.code || '');
          setWithholdingPurchasesAccountLabel(tax.withholding_purchases_account ? `${tax.withholding_purchases_account.code} - ${tax.withholding_purchases_account.name}` : '');

          // Si tiene permiso y las cuentas están vacías, precargar desde config
          if (canAssignAccounts && !tax.withholding_sales_account && !tax.withholding_purchases_account) {
            await loadAccountsForType(tax.tax_type_id);
          }
        }
      } else {
        // CREACIÓN - Reset y precargar
        setName('');
        setRate('');
        setPerUnitAmount('');
        setDescription('');
        setIsCostTax(false);
        setIsActive(true);
        setTaxSalesAccountCode('');
        setTaxSalesAccountLabel('');
        setTaxPurchasesAccountCode('');
        setTaxPurchasesAccountLabel('');
        setTaxCostAccountCode('');
        setTaxCostAccountLabel('');
        setWithholdingSalesAccountCode('');
        setWithholdingSalesAccountLabel('');
        setWithholdingPurchasesAccountCode('');
        setWithholdingPurchasesAccountLabel('');

        // Precargar tipo por defecto
        const defaultTypeId = is_tax ? DEFAULT_TAX_TYPE_ID : DEFAULT_WITHHOLDING_TYPE_ID;
        setTaxTypeId(defaultTypeId);

        // Precargar cuentas si tiene módulo accounting
        if (hasAccountingModule) {
          await loadAccountsForType(parseInt(defaultTypeId, 10));
        }
      }
      setError(null);
    };

    initForm();
  }, [tax, is_tax, open, canAssignAccounts, hasAccountingModule]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isPerUnit) {
      const puaNum = parseFloat(perUnitAmount);
      if (isNaN(puaNum) || puaNum < 0) {
        setError('El monto por unidad debe ser >= 0');
        return;
      }
    } else {
      const rateNum = parseFloat(rate);
      if (isNaN(rateNum) || rateNum < 0 || rateNum > 100) {
        setError('La tasa debe estar entre 0 y 100');
        return;
      }
    }

    setLoading(true);

    try {
      // Determinar si ocultar cuenta compras (INC, Bolsas, o IVA con is_cost_tax)
      const isIvaType = parseInt(taxTypeId, 10) === 1;
      const hidePurchasesAccount = isSalesOnlyType || (isIvaType && isCostTax);

      if (isEdit && tax) {
        const data: UpdateTaxData = {
          name,
          rate: isPerUnit ? 0 : parseFloat(rate),
          per_unit_amount: isPerUnit ? parseFloat(perUnitAmount) : null,
          description: description || undefined,
        };

        // Solo enviar is_cost_tax para IVA
        if (isIvaType) {
          data.is_cost_tax = isCostTax;
        }

        // Solo enviar is_active si tiene permiso para cambiar el estado
        const canChangeStatus = (tax.is_active && canDeactivate) || (!tax.is_active && canActivate);
        if (canChangeStatus) {
          data.is_active = isActive;
        }

        if (canAssignAccounts) {
          if (is_tax) {
            data.tax_sales_account_code = taxSalesAccountCode || null;
            data.tax_purchases_account_code = hidePurchasesAccount ? null : (taxPurchasesAccountCode || null);
            data.tax_cost_account_code = (isSalesOnlyType || !isCostTax) ? null : (taxCostAccountCode || null);
          } else {
            data.withholding_sales_account_code = withholdingSalesAccountCode || null;
            data.withholding_purchases_account_code = withholdingPurchasesAccountCode || null;
          }
        }

        await taxesService.update(tax.id, data);
      } else {
        const data: CreateTaxData = {
          name,
          rate: isPerUnit ? 0 : parseFloat(rate),
          per_unit_amount: isPerUnit ? parseFloat(perUnitAmount) : undefined,
          tax_type_id: parseInt(taxTypeId, 10),
          description: description || undefined,
        };

        // Solo enviar is_cost_tax para IVA
        if (isIvaType) {
          data.is_cost_tax = isCostTax;
        }

        if (hasAccountingModule) {
          if (is_tax) {
            data.tax_sales_account_code = taxSalesAccountCode || undefined;
            data.tax_purchases_account_code = hidePurchasesAccount ? undefined : (taxPurchasesAccountCode || undefined);
            data.tax_cost_account_code = (isSalesOnlyType || !isCostTax) ? undefined : (taxCostAccountCode || undefined);
          } else {
            data.withholding_sales_account_code = withholdingSalesAccountCode || undefined;
            data.withholding_purchases_account_code = withholdingPurchasesAccountCode || undefined;
          }
        }

        await taxesService.create(data);
      }

      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  // Handler cuando cambia el tipo
  const handleTaxTypeChange = async (newTypeId: string) => {
    setTaxTypeId(newTypeId);

    // Solo recargar cuentas en creación si tiene módulo
    if (!isEdit && hasAccountingModule && newTypeId) {
      // Limpiar cuentas actuales
      if (is_tax) {
        setTaxSalesAccountCode('');
        setTaxSalesAccountLabel('');
        setTaxPurchasesAccountCode('');
        setTaxPurchasesAccountLabel('');
      } else {
        setWithholdingSalesAccountCode('');
        setWithholdingSalesAccountLabel('');
        setWithholdingPurchasesAccountCode('');
        setWithholdingPurchasesAccountLabel('');
      }
      // Cargar nuevas cuentas
      await loadAccountsForType(parseInt(newTypeId, 10));
    }
  };

  const taxTypeOptions = taxTypes.map((tt) => ({
    value: String(tt.id),
    label: tt.name,
  }));

  // Determinar si el tipo actual solo tiene cuenta de ventas (INC, Bolsas)
  const isSalesOnlyType = SALES_ONLY_TYPES.includes(parseInt(taxTypeId, 10));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Editar' : 'Crear'} {is_tax ? 'Impuesto' : 'Retención'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-md">
              {error}
            </div>
          )}

          {/* Tasa / Monto por Unidad */}
          {isPerUnit ? (
            <div className="space-y-2">
              <Label htmlFor="perUnitAmount">Monto por Unidad ($)</Label>
              <NumericInput
                id="perUnitAmount"
                value={perUnitAmount}
                onChange={(e) => setPerUnitAmount(e.target.value)}
                allowNegative={false}
                disabled={isEdit && !canEdit}
                required
                placeholder="75,00"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="rate">Tasa %</Label>
              <NumericInput
                id="rate"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                allowNegative={false}
                disabled={isEdit && !canEdit}
                required
                placeholder="19,00"
              />
            </div>
          )}

          {/* Nombre */}
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="IVA 19%"
            />
          </div>

          {/* Tipo de impuesto */}
          <div className="space-y-2">
            <Label>Tipo</Label>
            <SearchableSelect
              options={taxTypeOptions}
              value={taxTypeId}
              onChange={handleTaxTypeChange}
              placeholder="Seleccionar tipo..."
              disabled={isEdit}
            />
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción opcional"
            />
          </div>

          {/* Toggle IVA como Mayor Costo - Solo para tipo IVA */}
          {is_tax && parseInt(taxTypeId, 10) === 1 && (
            <div className="flex items-center justify-between py-2">
              <div className="space-y-0.5">
                <Label>IVA como Mayor Costo</Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Usa cuenta de costo en lugar de cuenta de compras
                </p>
              </div>
              <Switch
                checked={isCostTax}
                onCheckedChange={setIsCostTax}
              />
            </div>
          )}

          {/* Toggle Estado - Solo en edición si tiene permiso */}
          {isEdit && tax && ((tax.is_active && canDeactivate) || (!tax.is_active && canActivate)) && (
            <div className="flex items-center justify-between py-2">
              <div className="space-y-0.5">
                <Label>Estado</Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {isActive ? 'Activo' : 'Inactivo'}
                </p>
              </div>
              <Switch
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>
          )}

          {/* Cuentas contables - Creación: si tiene módulo / Edición: si tiene permiso */}
          {showAccountFields && (
            <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-slate-700">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Cuentas Contables
              </h4>

              {is_tax ? (
                <>
                  {/* Cuenta Ventas */}
                  <div className="space-y-2">
                    <Label>Cuenta Ventas</Label>
                    <AccountSelect
                      value={taxSalesAccountCode}
                      valueLabel={taxSalesAccountLabel}
                      onChange={(code, acc) => {
                        setTaxSalesAccountCode(code);
                        setTaxSalesAccountLabel(acc ? `${acc.code} - ${acc.name}` : '');
                      }}
                      placeholder="Seleccionar cuenta de ventas..."
                      excludePrefixes="1105,1110"
                      dropdownPosition="top"
                    />
                  </div>

                  {/* Cuenta Compras - NO mostrar para INC, Bolsas, o IVA con is_cost_tax */}
                  {!isSalesOnlyType && !isCostTax && (
                    <div className="space-y-2">
                      <Label>Cuenta Compras</Label>
                      <AccountSelect
                        value={taxPurchasesAccountCode}
                        valueLabel={taxPurchasesAccountLabel}
                        onChange={(code, acc) => {
                          setTaxPurchasesAccountCode(code);
                          setTaxPurchasesAccountLabel(acc ? `${acc.code} - ${acc.name}` : '');
                        }}
                        placeholder="Seleccionar cuenta de compras..."
                        excludePrefixes="1105,1110"
                        dropdownPosition="top"
                      />
                    </div>
                  )}

                  {/* Cuenta Costo - Solo mostrar para IVA con is_cost_tax */}
                  {!isSalesOnlyType && isCostTax && (
                    <div className="space-y-2">
                      <Label>Cuenta Mayor Costo</Label>
                      <AccountSelect
                        value={taxCostAccountCode}
                        valueLabel={taxCostAccountLabel}
                        onChange={(code, acc) => {
                          setTaxCostAccountCode(code);
                          setTaxCostAccountLabel(acc ? `${acc.code} - ${acc.name}` : '');
                        }}
                        placeholder="Seleccionar cuenta de costo..."
                        excludePrefixes="1105,1110"
                        dropdownPosition="top"
                      />
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Cuenta Retención Ventas (a favor) */}
                  <div className="space-y-2">
                    <Label>Cuenta Retención Ventas (a favor)</Label>
                    <AccountSelect
                      value={withholdingSalesAccountCode}
                      valueLabel={withholdingSalesAccountLabel}
                      onChange={(code, acc) => {
                        setWithholdingSalesAccountCode(code);
                        setWithholdingSalesAccountLabel(acc ? `${acc.code} - ${acc.name}` : '');
                      }}
                      placeholder="Seleccionar cuenta..."
                      excludePrefixes="1105,1110"
                      dropdownPosition="top"
                    />
                  </div>

                  {/* Cuenta Retención Compras (por pagar) */}
                  <div className="space-y-2">
                    <Label>Cuenta Retención Compras (por pagar)</Label>
                    <AccountSelect
                      value={withholdingPurchasesAccountCode}
                      valueLabel={withholdingPurchasesAccountLabel}
                      onChange={(code, acc) => {
                        setWithholdingPurchasesAccountCode(code);
                        setWithholdingPurchasesAccountLabel(acc ? `${acc.code} - ${acc.name}` : '');
                      }}
                      placeholder="Seleccionar cuenta..."
                      excludePrefixes="1105,1110"
                      dropdownPosition="top"
                    />
                  </div>
                </>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEdit ? 'Guardar' : 'Crear'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
