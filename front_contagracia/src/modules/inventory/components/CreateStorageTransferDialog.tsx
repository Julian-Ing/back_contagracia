'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { NumericInput } from '@/shared/components/ui/numeric-input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/shared/components/ui/dialog';
import { SearchableSelect } from '@/shared/components/ui/searchable-select';
import type { SearchableSelectOption } from '@/shared/components/ui/searchable-select';
import { WarehouseSelect } from '@/shared/components/ui/warehouse-select';
import { StorageSelect } from '@/shared/components/ui/storage-select';
import { DatePicker } from '@/shared/components/ui/date-picker';
import { format } from 'date-fns';
import {
  Plus, Trash2, ArrowRight, Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { productsService } from '../services/products.service';
import { storageTransfersService } from '../services/storage-transfers.service';
import { warehousesService } from '../services/warehouses.service';

interface CreateStorageTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

interface TransferPair {
  key: number;
  product_id: string;
  quantity: number;
  out_warehouse_id: string;
  out_storage_id: string;
  in_warehouse_id: string;
  in_storage_id: string;
}

interface StorageStockEntry {
  storage_id: string;
  storage_name: string;
  storage_consecutive: string;
  warehouse_id: string;
  warehouse_name: string;
  warehouse_consecutive: string;
  stock: number;
}

interface StorageSelectItem {
  id: string;
  name: string;
  consecutive: string;
  warehouse_id: string;
  warehouse_name: string;
  warehouse_consecutive: string;
}

let lineKeyCounter = 0;
const nextKey = () => ++lineKeyCounter;

const emptyPair = (): TransferPair => ({
  key: nextKey(),
  product_id: '',
  quantity: 0,
  out_warehouse_id: '',
  out_storage_id: '',
  in_warehouse_id: '',
  in_storage_id: '',
});

export const CreateStorageTransferDialog = ({
  open, onOpenChange, onCreated,
}: CreateStorageTransferDialogProps) => {
  const [submitting, setSubmitting] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [reason, setReason] = useState('');
  const [transferDate, setTransferDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [pairs, setPairs] = useState<TransferPair[]>([]);

  const [productOptions, setProductOptions] = useState<SearchableSelectOption[]>([]);
  const [allStorages, setAllStorages] = useState<StorageSelectItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Cache: product_id → storage stocks
  const stockCacheRef = useRef<Map<string, StorageStockEntry[]>>(new Map());
  const [stockCache, setStockCache] = useState<Map<string, StorageStockEntry[]>>(new Map());

  // Reset on open + load products + storages
  useEffect(() => {
    if (!open) return;
    setReason('');
    setAttempted(false);
    setTransferDate(format(new Date(), 'yyyy-MM-dd'));
    setPairs([emptyPair()]);
    stockCacheRef.current = new Map();
    setStockCache(new Map());
    setLoading(true);
    Promise.all([
      productsService.getForSelect({ is_service: false }),
      warehousesService.getStoragesForSelect(),
    ])
      .then(([products, storages]) => {
        setProductOptions(products.data.map((i) => ({
          value: i.value,
          label: i.label,
          description: i.description,
        })));
        setAllStorages(storages.map(s => ({
          id: s.id,
          name: s.name,
          consecutive: s.consecutive,
          warehouse_id: s.warehouse_id,
          warehouse_name: s.warehouse_name,
          warehouse_consecutive: s.warehouse_consecutive,
        })));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open]);

  // Fetch stock for a product (cached)
  const fetchProductStock = useCallback(async (productId: string) => {
    if (!productId || stockCacheRef.current.has(productId)) return;
    try {
      const res = await productsService.getStockSummary(productId);
      const item = res.items.find(i => i.id === productId);
      const entries: StorageStockEntry[] = (item?.storages || []).map(s => {
        const storageInfo = allStorages.find(st => st.id === s.storage_id);
        return {
          storage_id: s.storage_id,
          storage_name: s.storage_name,
          storage_consecutive: storageInfo?.consecutive || '',
          warehouse_id: storageInfo?.warehouse_id || '',
          warehouse_name: s.warehouse_name,
          warehouse_consecutive: storageInfo?.warehouse_consecutive || '',
          stock: s.stock,
        };
      });
      stockCacheRef.current.set(productId, entries);
      setStockCache(new Map(stockCacheRef.current));
    } catch {
      // Silently fail — backend will validate
    }
  }, [allStorages]);

  // OUT warehouse options — only warehouses where product has stock
  const getOutWarehouseOptions = useCallback((productId: string): SearchableSelectOption[] => {
    const entries = stockCache.get(productId);
    if (!entries) return [];
    const seen = new Map<string, { name: string; consecutive: string }>();
    for (const e of entries) {
      if (e.stock > 0 && e.warehouse_id && !seen.has(e.warehouse_id)) {
        seen.set(e.warehouse_id, { name: e.warehouse_name, consecutive: e.warehouse_consecutive });
      }
    }
    return [...seen.entries()].map(([id, w]) => ({
      value: id,
      label: `${w.name} (${w.consecutive})`,
    }));
  }, [stockCache]);

  // OUT storage options — filtered by warehouse, only with stock
  const getOutStorageOptions = useCallback((productId: string, warehouseId: string): SearchableSelectOption[] => {
    const entries = stockCache.get(productId);
    if (!entries) return [];
    return entries
      .filter(s => s.stock > 0 && s.warehouse_id === warehouseId)
      .map(s => ({
        value: s.storage_id,
        label: `${s.storage_name} (${s.storage_consecutive})`,
        description: `Stock: ${s.stock}`,
      }));
  }, [stockCache]);

  // Max quantity — shared across pairs with same product + same out_storage
  const getMaxQuantity = useCallback((pairKey: number, productId: string, outStorageId: string): number => {
    if (!productId || !outStorageId) return 0;
    const entries = stockCache.get(productId);
    if (!entries) return 0;
    const storageStock = entries.find(s => s.storage_id === outStorageId)?.stock || 0;
    const consumed = pairs
      .filter(p => p.key !== pairKey && p.product_id === productId && p.out_storage_id === outStorageId)
      .reduce((sum, p) => sum + (p.quantity || 0), 0);
    return Math.max(0, storageStock - consumed);
  }, [stockCache, pairs]);

  // Pair management
  const addPair = () => setPairs(prev => [...prev, emptyPair()]);
  const removePair = (key: number) => setPairs(prev => prev.filter(p => p.key !== key));

  const updatePair = (key: number, field: keyof TransferPair, value: string | number) => {
    setPairs(prev => prev.map(p => {
      if (p.key !== key) return p;
      const updated = { ...p, [field]: value };
      if (field === 'product_id') {
        updated.quantity = 0;
        updated.out_warehouse_id = '';
        updated.out_storage_id = '';
        updated.in_warehouse_id = '';
        updated.in_storage_id = '';
        if (value) fetchProductStock(value as string);
      }
      if (field === 'out_warehouse_id') { updated.out_storage_id = ''; updated.quantity = 0; }
      if (field === 'out_storage_id') { updated.quantity = 0; }
      if (field === 'in_warehouse_id') { updated.in_storage_id = ''; }
      return updated;
    }));
  };

  // Validation
  const validPairs = pairs.filter(p =>
    p.product_id && p.out_storage_id && p.in_storage_id && p.quantity > 0
  );

  const hasOverflow = pairs.some(p => {
    if (!p.product_id || !p.out_storage_id || p.quantity <= 0) return false;
    const max = getMaxQuantity(p.key, p.product_id, p.out_storage_id);
    return p.quantity > max;
  });

  const hasSameOriginDest = pairs.some(p =>
    p.out_storage_id && p.in_storage_id && p.out_storage_id === p.in_storage_id
  );

  const canSubmit = reason.trim().length > 0 && transferDate.length > 0
    && validPairs.length >= 1 && !submitting && !hasOverflow && !hasSameOriginDest;

  const handleSubmit = async () => {
    setAttempted(true);
    if (!canSubmit) return;
    const items = validPairs.flatMap(p => [
      { product_id: p.product_id, storage_id: p.out_storage_id, direction: 'OUT' as const, quantity: p.quantity },
      { product_id: p.product_id, storage_id: p.in_storage_id, direction: 'IN' as const, quantity: p.quantity },
    ]);
    setSubmitting(true);
    try {
      await storageTransfersService.create({ reason: reason.trim(), date: transferDate, items });
      toast.success('Transferencia solicitada exitosamente');
      onOpenChange(false);
      onCreated();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error creando transferencia');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Solicitar Transferencia entre Bodegas</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
        <div className="space-y-5">
          {/* Razón + Fecha */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Razón <span className="text-red-500">*</span></label>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ej: Reabastecimiento de bodega secundaria"
                className={attempted && !reason.trim() ? 'border-red-500' : ''}
              />
              {attempted && !reason.trim() && <p className="text-xs text-red-500 mt-1">La razón es requerida</p>}
            </div>
            <div>
              <label className="text-sm font-medium">Fecha</label>
              <DatePicker value={transferDate} onChange={setTransferDate} clearable={false} usePortal />
            </div>
          </div>

          {/* Líneas de transferencia */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">Líneas de transferencia</h4>
              <Button variant="outline" size="sm" onClick={addPair}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Agregar línea
              </Button>
            </div>

            {pairs.map((pair) => {
              const maxQty = getMaxQuantity(pair.key, pair.product_id, pair.out_storage_id);
              const isOver = pair.product_id && pair.out_storage_id && pair.quantity > 0 && pair.quantity > maxQty;
              const sameStorage = pair.out_storage_id && pair.in_storage_id && pair.out_storage_id === pair.in_storage_id;

              return (
                <div key={pair.key} className="p-3 border rounded-lg space-y-3">
                  {/* Producto + Cantidad + Eliminar */}
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <label className="text-xs text-muted-foreground mb-1 block">Producto</label>
                      <SearchableSelect
                        options={productOptions}
                        value={pair.product_id}
                        onChange={(v) => updatePair(pair.key, 'product_id', v)}
                        placeholder="Seleccionar producto..."
                        searchPlaceholder="Buscar producto..."
                      />
                    </div>
                    <div className="w-32">
                      <label className="text-xs text-muted-foreground mb-1 block">
                        Cant.{pair.out_storage_id ? ` (máx ${maxQty})` : ''}
                      </label>
                      <NumericInput
                        value={pair.quantity || ''}
                        onChange={(e) => updatePair(pair.key, 'quantity', parseFloat(e.target.value) || 0)}
                        disabled={!pair.out_storage_id}
                        placeholder="0"
                        allowNegative={false}
                        className={isOver ? 'border-red-500' : ''}
                      />
                    </div>
                    <div className="pt-5">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removePair(pair.key)}
                        disabled={pairs.length <= 1}
                        className="text-muted-foreground hover:text-red-600 h-8 w-8"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Origen → Destino */}
                  <div className="flex items-end gap-2">
                    {/* Origen (Sale de) */}
                    <div className="flex-1 min-w-0">
                      <label className="text-xs font-medium text-red-600 mb-1 block">Sale de</label>
                      <div className="grid grid-cols-2 gap-2">
                        <SearchableSelect
                          options={pair.product_id ? getOutWarehouseOptions(pair.product_id) : []}
                          value={pair.out_warehouse_id}
                          onChange={(v) => updatePair(pair.key, 'out_warehouse_id', v)}
                          placeholder="Almacén..."
                          disabled={!pair.product_id}
                        />
                        <SearchableSelect
                          options={pair.product_id && pair.out_warehouse_id ? getOutStorageOptions(pair.product_id, pair.out_warehouse_id) : []}
                          value={pair.out_storage_id}
                          onChange={(v) => updatePair(pair.key, 'out_storage_id', v)}
                          placeholder="Bodega..."
                          disabled={!pair.out_warehouse_id}
                        />
                      </div>
                    </div>

                    {/* Flecha */}
                    <div className="pb-2">
                      <ArrowRight className="h-5 w-5 text-muted-foreground" />
                    </div>

                    {/* Destino (Entra a) */}
                    <div className="flex-1 min-w-0">
                      <label className="text-xs font-medium text-green-600 mb-1 block">Entra a</label>
                      <div className="grid grid-cols-2 gap-2">
                        <WarehouseSelect
                          value={pair.in_warehouse_id}
                          onChange={(v) => updatePair(pair.key, 'in_warehouse_id', v)}
                          placeholder="Almacén..."
                          disabled={!pair.product_id}
                          clearable={false}
                        />
                        <StorageSelect
                          value={pair.in_storage_id}
                          onChange={(v) => updatePair(pair.key, 'in_storage_id', v)}
                          warehouseId={pair.in_warehouse_id || undefined}
                          placeholder="Bodega..."
                          disabled={!pair.in_warehouse_id}
                          clearable={false}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Errores inline */}
                  {isOver && <p className="text-xs text-red-500">Excede el stock disponible ({maxQty})</p>}
                  {sameStorage && <p className="text-xs text-red-500">La bodega de origen y destino no pueden ser la misma</p>}
                </div>
              );
            })}
          </div>

          {/* Errores globales */}
          {attempted && (
            <div className="space-y-1">
              {!reason.trim() && <p className="text-sm text-red-500">Ingresa una razón para la transferencia</p>}
              {validPairs.length === 0 && <p className="text-sm text-red-500">Completa al menos una línea (producto, origen, destino y cantidad)</p>}
              {hasOverflow && <p className="text-sm text-red-500">Una o más líneas exceden el stock disponible</p>}
              {hasSameOriginDest && <p className="text-sm text-red-500">La bodega de origen y destino no pueden ser la misma</p>}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Solicitar Transferencia
            </Button>
          </div>
        </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
