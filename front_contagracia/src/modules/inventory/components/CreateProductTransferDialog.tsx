'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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
  Plus, Trash2, ArrowUpCircle, ArrowDownCircle, Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { productsService } from '../services/products.service';
import { productTransfersService } from '../services/product-transfers.service';
import { warehousesService } from '../services/warehouses.service';
import type { StockSummaryItem } from '../types';

interface CreateProductTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  parentProductId: string;
  onCreated: () => void;
}

interface TransferLine {
  key: number;
  product_id: string;
  warehouse_id: string;
  storage_id: string;
  quantity: number;
}

let lineKeyCounter = 0;
const nextKey = () => ++lineKeyCounter;

export const CreateProductTransferDialog = ({
  open, onOpenChange, productId, parentProductId, onCreated,
}: CreateProductTransferDialogProps) => {
  const [familyItems, setFamilyItems] = useState<StockSummaryItem[]>([]);
  const [hasInventoryManagement, setHasInventoryManagement] = useState(false);
  const [allStorages, setAllStorages] = useState<Array<{ id: string; name: string; consecutive: string; warehouse_id: string; warehouse_name: string; warehouse_consecutive: string }>>([]);
  const [loadingFamily, setLoadingFamily] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [attempted, setAttempted] = useState(false);

  const [reason, setReason] = useState('');
  const [transferDate, setTransferDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [outLines, setOutLines] = useState<TransferLine[]>([]);
  const [inLines, setInLines] = useState<TransferLine[]>([]);

  // Load family products + all storages on open
  useEffect(() => {
    if (!open) return;
    setReason('');
    setAttempted(false);
    setTransferDate(format(new Date(), 'yyyy-MM-dd'));
    setOutLines([{ key: nextKey(), product_id: '', warehouse_id: '', storage_id: '', quantity: 0 }]);
    setInLines([{ key: nextKey(), product_id: '', warehouse_id: '', storage_id: '', quantity: 0 }]);
    setLoadingFamily(true);
    Promise.all([
      productsService.getStockSummary(parentProductId),
      warehousesService.getStoragesForSelect(),
    ])
      .then(([stockRes, storagesRes]) => {
        setFamilyItems(stockRes.items);
        setHasInventoryManagement(stockRes.has_inventory_management);
        setAllStorages(storagesRes.map(s => ({
          id: s.id,
          name: s.name,
          consecutive: s.consecutive,
          warehouse_id: s.warehouse_id,
          warehouse_name: s.warehouse_name,
          warehouse_consecutive: s.warehouse_consecutive,
        })));
      })
      .catch((err: any) => {
        toast.error(err?.response?.data?.message || 'Error cargando productos del grupo');
      })
      .finally(() => setLoadingFamily(false));
  }, [open, parentProductId]);

  // Product options for selects
  const productOptions: SearchableSelectOption[] = useMemo(() => {
    return familyItems.map(item => ({
      value: item.id,
      label: item.is_parent
        ? `${item.name} (Principal)`
        : item.attributes.length > 0
          ? `${item.name} — ${item.attributes.map(a => a.option).join(' / ')}`
          : item.name,
      description: `Stock: ${item.stock}`,
    }));
  }, [familyItems]);

  // Warehouse options for OUT lines — only warehouses where product has stock
  const getOutWarehouseOptions = useCallback((pid: string): SearchableSelectOption[] => {
    const item = familyItems.find(i => i.id === pid);
    if (!item?.storages) return [];
    const seen = new Map<string, { name: string; consecutive: string }>();
    for (const s of item.storages) {
      if (s.stock > 0) {
        const storageInfo = allStorages.find(st => st.id === s.storage_id);
        const whId = storageInfo?.warehouse_id || '';
        if (whId && !seen.has(whId)) {
          seen.set(whId, {
            name: storageInfo?.warehouse_name || s.warehouse_name,
            consecutive: storageInfo?.warehouse_consecutive || '',
          });
        }
      }
    }
    return [...seen.entries()].map(([id, w]) => ({
      value: id,
      label: `${w.name} (${w.consecutive})`,
    }));
  }, [familyItems, allStorages]);

  // Storage options for OUT lines — filtered by warehouse, only with stock
  const getOutStorageOptions = useCallback((pid: string, warehouseId: string): SearchableSelectOption[] => {
    const item = familyItems.find(i => i.id === pid);
    if (!item?.storages) return [];
    return item.storages
      .filter(s => {
        if (s.stock <= 0) return false;
        const storageInfo = allStorages.find(st => st.id === s.storage_id);
        return storageInfo?.warehouse_id === warehouseId;
      })
      .map(s => {
        const storageInfo = allStorages.find(st => st.id === s.storage_id);
        return {
          value: s.storage_id,
          label: storageInfo ? `${storageInfo.name} (${storageInfo.consecutive})` : s.storage_name,
          description: `Stock: ${s.stock}`,
        };
      });
  }, [familyItems, allStorages]);

  // Adaptive max quantity for OUT lines
  const getMaxQuantity = useCallback((lineKey: number, pid: string, sid: string): number => {
    if (!pid) return 0;
    const item = familyItems.find(i => i.id === pid);
    if (!item) return 0;

    if (hasInventoryManagement && sid) {
      const storageStock = item.storages?.find(s => s.storage_id === sid)?.stock || 0;
      const consumed = outLines
        .filter(l => l.key !== lineKey && l.product_id === pid && l.storage_id === sid)
        .reduce((sum, l) => sum + (l.quantity || 0), 0);
      return Math.max(0, storageStock - consumed);
    }

    const consumed = outLines
      .filter(l => l.key !== lineKey && l.product_id === pid)
      .reduce((sum, l) => sum + (l.quantity || 0), 0);
    return Math.max(0, item.stock - consumed);
  }, [familyItems, outLines, hasInventoryManagement]);

  // Line management
  const addOutLine = () => setOutLines(prev => [...prev, { key: nextKey(), product_id: '', warehouse_id: '', storage_id: '', quantity: 0 }]);
  const addInLine = () => setInLines(prev => [...prev, { key: nextKey(), product_id: '', warehouse_id: '', storage_id: '', quantity: 0 }]);
  const removeOutLine = (key: number) => setOutLines(prev => prev.filter(l => l.key !== key));
  const removeInLine = (key: number) => setInLines(prev => prev.filter(l => l.key !== key));

  const updateOutLine = (key: number, field: keyof TransferLine, value: string | number) => {
    setOutLines(prev => prev.map(l => {
      if (l.key !== key) return l;
      const updated = { ...l, [field]: value };
      if (field === 'product_id') { updated.warehouse_id = ''; updated.storage_id = ''; updated.quantity = 0; }
      if (field === 'warehouse_id') { updated.storage_id = ''; updated.quantity = 0; }
      if (field === 'storage_id') { updated.quantity = 0; }
      return updated;
    }));
  };

  const updateInLine = (key: number, field: keyof TransferLine, value: string | number) => {
    setInLines(prev => prev.map(l => {
      if (l.key !== key) return l;
      const updated = { ...l, [field]: value };
      if (field === 'product_id') { updated.warehouse_id = ''; updated.storage_id = ''; updated.quantity = 0; }
      if (field === 'warehouse_id') { updated.storage_id = ''; updated.quantity = 0; }
      return updated;
    }));
  };

  // Validation
  const validOutLines = outLines.filter(l => l.product_id && l.quantity > 0 && (!hasInventoryManagement || l.storage_id));
  const validInLines = inLines.filter(l => l.product_id && l.quantity > 0 && (!hasInventoryManagement || l.storage_id));

  const hasOverflow = outLines.some(l => {
    if (!l.product_id || l.quantity <= 0) return false;
    const max = getMaxQuantity(l.key, l.product_id, l.storage_id);
    return l.quantity > max;
  });

  const totalOut = validOutLines.reduce((sum, l) => sum + l.quantity, 0);
  const totalIn = validInLines.reduce((sum, l) => sum + l.quantity, 0);
  const quantitiesMatch = totalOut > 0 && totalOut === totalIn;
  const canSubmit = reason.trim().length > 0 && transferDate.length > 0 && validOutLines.length >= 1 && validInLines.length >= 1 && quantitiesMatch && !submitting && !hasOverflow;

  const handleSubmit = async () => {
    setAttempted(true);
    if (!canSubmit) return;
    const items = [
      ...validOutLines.map(l => ({
        product_id: l.product_id,
        direction: 'OUT' as const,
        quantity: l.quantity,
        ...(hasInventoryManagement ? { storage_id: l.storage_id } : {}),
      })),
      ...validInLines.map(l => ({
        product_id: l.product_id,
        direction: 'IN' as const,
        quantity: l.quantity,
        ...(hasInventoryManagement ? { storage_id: l.storage_id } : {}),
      })),
    ];

    setSubmitting(true);
    try {
      await productTransfersService.create({ reason: reason.trim(), date: transferDate, items });
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
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Solicitar Transferencia entre Productos</DialogTitle>
        </DialogHeader>

        {loadingFamily ? (
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
                  placeholder="Ej: Exceso de stock en una variación"
                  className={attempted && !reason.trim() ? 'border-red-500' : ''}
                />
                {attempted && !reason.trim() && <p className="text-xs text-red-500 mt-1">La razón es requerida</p>}
              </div>
              <div>
                <label className="text-sm font-medium">Fecha</label>
                <DatePicker
                  value={transferDate}
                  onChange={setTransferDate}
                  clearable={false}
                  usePortal
                />
              </div>
            </div>

            {/* Salidas y Entradas lado a lado */}
            <div className="grid grid-cols-2 gap-4">
              {/* Salidas (OUT) — Izquierda */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold flex items-center gap-1.5">
                    <ArrowUpCircle className="h-4 w-4 text-red-500" />
                    Salidas
                  </h4>
                  <Button variant="outline" size="sm" onClick={addOutLine}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Agregar
                  </Button>
                </div>
                {outLines.map((line) => {
                  const maxQty = getMaxQuantity(line.key, line.product_id, line.storage_id);
                  const isOver = line.product_id && line.quantity > 0 && line.quantity > maxQty;
                  return (
                    <div key={line.key} className="p-3 border rounded-lg bg-red-50/50 dark:bg-red-950/10 space-y-2">
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <label className="text-xs text-muted-foreground mb-1 block">Producto</label>
                          <SearchableSelect
                            options={productOptions}
                            value={line.product_id}
                            onChange={(v) => updateOutLine(line.key, 'product_id', v)}
                            placeholder="Seleccionar producto..."
                            searchPlaceholder="Buscar producto o atributo..."
                          />
                        </div>
                        <div className="pt-5">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeOutLine(line.key)}
                            disabled={outLines.length <= 1}
                            className="text-red-400 hover:text-red-600 h-8 w-8"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      {hasInventoryManagement && (
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Almacén</label>
                            <SearchableSelect
                              options={line.product_id ? getOutWarehouseOptions(line.product_id) : []}
                              value={line.warehouse_id}
                              onChange={(v) => updateOutLine(line.key, 'warehouse_id', v)}
                              placeholder="Almacén..."
                              disabled={!line.product_id}
                            />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Bodega</label>
                            <SearchableSelect
                              options={line.product_id && line.warehouse_id ? getOutStorageOptions(line.product_id, line.warehouse_id) : []}
                              value={line.storage_id}
                              onChange={(v) => updateOutLine(line.key, 'storage_id', v)}
                              placeholder="Bodega..."
                              disabled={!line.warehouse_id}
                            />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">
                              Cant.{line.storage_id ? ` (máx ${maxQty})` : ''}
                            </label>
                            <NumericInput
                              value={line.quantity || ''}
                              onChange={(e) => updateOutLine(line.key, 'quantity', parseFloat(e.target.value) || 0)}
                              disabled={!line.storage_id}
                              placeholder="0"
                              allowNegative={false}
                              className={isOver ? 'border-red-500' : ''}
                            />
                          </div>
                        </div>
                      )}
                      {!hasInventoryManagement && (
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">
                            Cant.{line.product_id ? ` (máx ${maxQty})` : ''}
                          </label>
                          <NumericInput
                            value={line.quantity || ''}
                            onChange={(e) => updateOutLine(line.key, 'quantity', parseFloat(e.target.value) || 0)}
                            disabled={!line.product_id}
                            placeholder="0"
                            allowNegative={false}
                            className={isOver ? 'border-red-500' : ''}
                          />
                        </div>
                      )}
                      {isOver && <p className="text-xs text-red-500">Excede el stock disponible ({maxQty})</p>}
                    </div>
                  );
                })}
              </div>

              {/* Entradas (IN) — Derecha */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold flex items-center gap-1.5">
                    <ArrowDownCircle className="h-4 w-4 text-green-500" />
                    Entradas
                  </h4>
                  <Button variant="outline" size="sm" onClick={addInLine}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Agregar
                  </Button>
                </div>
                {inLines.map((line) => (
                  <div key={line.key} className="p-3 border rounded-lg bg-green-50/50 dark:bg-green-950/10 space-y-2">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <label className="text-xs text-muted-foreground mb-1 block">Producto</label>
                        <SearchableSelect
                          options={productOptions}
                          value={line.product_id}
                          onChange={(v) => updateInLine(line.key, 'product_id', v)}
                          placeholder="Seleccionar producto..."
                          searchPlaceholder="Buscar producto o atributo..."
                        />
                      </div>
                      <div className="pt-5">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeInLine(line.key)}
                          disabled={inLines.length <= 1}
                          className="text-green-400 hover:text-green-600 h-8 w-8"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    {hasInventoryManagement && (
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">Almacén</label>
                          <WarehouseSelect
                            value={line.warehouse_id}
                            onChange={(v) => updateInLine(line.key, 'warehouse_id', v)}
                            placeholder="Almacén..."
                            disabled={!line.product_id}
                            clearable={false}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">Bodega</label>
                          <StorageSelect
                            value={line.storage_id}
                            onChange={(v) => updateInLine(line.key, 'storage_id', v)}
                            warehouseId={line.warehouse_id || undefined}
                            placeholder="Bodega..."
                            disabled={!line.warehouse_id}
                            clearable={false}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">Cantidad</label>
                          <NumericInput
                            value={line.quantity || ''}
                            onChange={(e) => updateInLine(line.key, 'quantity', parseFloat(e.target.value) || 0)}
                            disabled={!line.storage_id}
                            placeholder="0"
                            allowNegative={false}
                          />
                        </div>
                      </div>
                    )}
                    {!hasInventoryManagement && (
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Cantidad</label>
                        <NumericInput
                          value={line.quantity || ''}
                          onChange={(e) => updateInLine(line.key, 'quantity', parseFloat(e.target.value) || 0)}
                          disabled={!line.product_id}
                          placeholder="0"
                          allowNegative={false}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Validación al intentar enviar */}
            {attempted && (
              <div className="space-y-1">
                {!reason.trim() && <p className="text-sm text-red-500">Ingresa una razón para la transferencia</p>}
                {validOutLines.length === 0 && (
                  <p className="text-sm text-red-500">
                    Agrega al menos una línea de salida completa (producto{hasInventoryManagement ? ', almacén, bodega' : ''} y cantidad)
                  </p>
                )}
                {validInLines.length === 0 && (
                  <p className="text-sm text-red-500">
                    Agrega al menos una línea de entrada completa (producto{hasInventoryManagement ? ', almacén, bodega' : ''} y cantidad)
                  </p>
                )}
                {validOutLines.length > 0 && validInLines.length > 0 && !quantitiesMatch && (
                  <p className="text-sm text-red-500">
                    El total de salidas ({totalOut}) debe ser igual al total de entradas ({totalIn})
                  </p>
                )}
                {hasOverflow && <p className="text-sm text-red-500">Una o más líneas de salida exceden el stock disponible</p>}
              </div>
            )}

            {!attempted && validOutLines.length > 0 && validInLines.length > 0 && !quantitiesMatch && (
              <p className="text-sm text-amber-600">
                El total de salidas ({totalOut}) debe ser igual al total de entradas ({totalIn})
              </p>
            )}

            {/* Acciones */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                Cancelar
              </Button>
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
