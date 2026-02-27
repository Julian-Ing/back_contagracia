'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/shared/components/ui/button';
import { NumericInput } from '@/shared/components/ui/numeric-input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/shared/components/ui/dialog';
import { WarehouseSelect } from '@/shared/components/ui/warehouse-select';
import { StorageSelect } from '@/shared/components/ui/storage-select';
import { AccountSelect } from '@/shared/components/ui/account-select';
import { DatePicker } from '@/shared/components/ui/date-picker';
import { format } from 'date-fns';
import { ArrowDownCircle, ArrowUpCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCompanyModules } from '@/shared/hooks/useCompanyModules';
import { useCostCenterTree, CostCenterCascadeSelect } from '@/modules/cost-centers';
import { productsService } from '../services/products.service';
import { accountingConfigService } from '@/modules/accounting/services/accountingConfig.service';

interface AdjustStockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  onAdjusted: () => void;
}

export const AdjustStockDialog = ({
  open, onOpenChange, productId, onAdjusted,
}: AdjustStockDialogProps) => {
  const { hasModule } = useCompanyModules();
  const showStorage = hasModule('inventory_management');
  const showAccounting = hasModule('accounting');
  const hasCCModule = hasModule('cost_centers');

  const [direction, setDirection] = useState<'IN' | 'OUT'>('IN');
  const [warehouseId, setWarehouseId] = useState('');
  const [storageId, setStorageId] = useState('');
  const [storageLabel, setStorageLabel] = useState('');
  const [quantity, setQuantity] = useState<number>(0);
  const [reason, setReason] = useState('');
  const [adjustDate, setAdjustDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [counterpartCode, setCounterpartCode] = useState('');
  const [counterpartLabel, setCounterpartLabel] = useState('');
  const [defaultAccounts, setDefaultAccounts] = useState<{ in: { code: string; name: string } | null; out: { code: string; name: string } | null }>({ in: null, out: null });
  const [costCenterId, setCostCenterId] = useState('');
  const [costCenterPath, setCostCenterPath] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const { ccTree, ccFlatMap } = useCostCenterTree(hasCCModule);

  // Cargar cuentas por defecto del accounting config
  useEffect(() => {
    if (!open || !showAccounting) return;
    Promise.all([
      accountingConfigService.getByKey('inventory_surplus_income'),
      accountingConfigService.getByKey('inventory_shrinkage_cost'),
    ]).then(([surplus, shrinkage]) => {
      const inAcc = surplus?.account ? { code: surplus.account.code, name: surplus.account.name } : null;
      const outAcc = shrinkage?.account ? { code: shrinkage.account.code, name: shrinkage.account.name } : null;
      setDefaultAccounts({ in: inAcc, out: outAcc });
      // Precargar la cuenta según dirección inicial (IN)
      if (inAcc) {
        setCounterpartCode(inAcc.code);
        setCounterpartLabel(`${inAcc.code} - ${inAcc.name}`);
      }
    });
  }, [open, showAccounting]);

  useEffect(() => {
    if (!open) return;
    setDirection('IN');
    setWarehouseId('');
    setStorageId('');
    setStorageLabel('');
    setQuantity(0);
    setReason('');
    setAdjustDate(format(new Date(), 'yyyy-MM-dd'));
    setCounterpartCode('');
    setCounterpartLabel('');
    setCostCenterId('');
    setCostCenterPath([]);
  }, [open]);

  const handleWarehouseChange = (value: string) => {
    setWarehouseId(value);
    setStorageId('');
    setStorageLabel('');
  };

  const handleStorageChange = (value: string, label: string) => {
    setStorageId(value);
    setStorageLabel(label);
  };

  const canSubmit =
    quantity > 0
    && reason.trim().length > 0
    && adjustDate.length > 0
    && (!showStorage || storageId)
    && !submitting;

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const result = await productsService.adjustStock(productId, {
        direction,
        quantity,
        reason: reason.trim(),
        date: adjustDate,
        ...(showStorage && storageId ? { storage_id: storageId } : {}),
        ...(showAccounting && counterpartCode ? { counterpart_account_code: counterpartCode } : {}),
        ...(costCenterId ? { cost_center_id: costCenterId, cost_center_path: costCenterPath } : {}),
      });
      toast.success(`Ajuste ${result.consecutive} registrado`);
      onOpenChange(false);
      onAdjusted();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error registrando ajuste');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ajustar Stock</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Direction toggle */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Tipo de ajuste</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setDirection('IN');
                  const acc = defaultAccounts.in;
                  if (acc) { setCounterpartCode(acc.code); setCounterpartLabel(`${acc.code} - ${acc.name}`); }
                  else { setCounterpartCode(''); setCounterpartLabel(''); }
                }}
                className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                  direction === 'IN'
                    ? 'bg-green-50 border-green-300 text-green-700 dark:bg-green-900/20 dark:border-green-700 dark:text-green-400'
                    : 'border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-slate-800'
                }`}
              >
                <ArrowDownCircle className="h-4 w-4" />
                Entrada
              </button>
              <button
                type="button"
                onClick={() => {
                  setDirection('OUT');
                  const acc = defaultAccounts.out;
                  if (acc) { setCounterpartCode(acc.code); setCounterpartLabel(`${acc.code} - ${acc.name}`); }
                  else { setCounterpartCode(''); setCounterpartLabel(''); }
                }}
                className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                  direction === 'OUT'
                    ? 'bg-red-50 border-red-300 text-red-700 dark:bg-red-900/20 dark:border-red-700 dark:text-red-400'
                    : 'border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-slate-800'
                }`}
              >
                <ArrowUpCircle className="h-4 w-4" />
                Salida
              </button>
            </div>
          </div>

          {/* Fecha */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Fecha</label>
            <DatePicker
              value={adjustDate}
              onChange={setAdjustDate}
              clearable={false}
              usePortal
            />
          </div>

          {/* Warehouse + Storage (solo si tiene inventory_management) */}
          {showStorage && (
            <>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Almacen</label>
                <WarehouseSelect
                  value={warehouseId}
                  onChange={(value) => handleWarehouseChange(value)}
                  placeholder="Seleccionar almacen..."
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Bodega</label>
                <StorageSelect
                  value={storageId}
                  valueLabel={storageLabel}
                  onChange={handleStorageChange}
                  warehouseId={warehouseId || undefined}
                  placeholder="Seleccionar bodega..."
                  disabled={!warehouseId}
                />
              </div>
            </>
          )}

          {/* Cuenta contrapartida (solo si tiene accounting) */}
          {showAccounting && (
            <div>
              <label className="text-sm font-medium mb-1.5 block">Cuenta contrapartida</label>
              <AccountSelect
                value={counterpartCode}
                valueLabel={counterpartLabel}
                onChange={(code, account) => {
                  setCounterpartCode(code);
                  setCounterpartLabel(account ? `${account.code} - ${account.name}` : '');
                }}
                excludePrefixes="1110,1105"
                placeholder="Seleccionar cuenta..."
                showCreateButton={false}
                clearable={false}
              />
            </div>
          )}

          {/* Centro de costos */}
          {hasCCModule && (
            <div>
              <label className="text-sm font-medium mb-1.5 block">Centro de costos</label>
              <div className="flex items-center gap-2">
                <CostCenterCascadeSelect
                  ccTree={ccTree}
                  ccFlatMap={ccFlatMap}
                  value={costCenterId}
                  path={costCenterPath}
                  onChange={(id, _label, path) => {
                    setCostCenterId(id);
                    setCostCenterPath(path);
                  }}
                  size="md"
                  itemWidth="auto"
                />
              </div>
            </div>
          )}

          {/* Quantity */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Cantidad</label>
            <NumericInput
              value={quantity || ''}
              onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
              placeholder="0"
              allowNegative={false}
            />
          </div>

          {/* Reason */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Motivo</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej: Ajuste por conteo físico"
              rows={2}
              className="flex w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={!canSubmit}>
              {submitting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Ajustar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
