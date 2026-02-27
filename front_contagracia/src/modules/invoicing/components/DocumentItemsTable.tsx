'use client';

import { useState, useMemo, useCallback } from 'react';
import Decimal from 'decimal.js';
import { ChevronDown, ChevronRight, Trash2, Percent, DollarSign, Plus, Minus, Search, Pencil, ShoppingBag } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { NumericInput } from '@/shared/components/ui/numeric-input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/shared/components/ui/dialog';
import { FormattedNumber } from '@/shared/components/ui/formatted-number';
import { SearchableSelect } from '@/shared/components/ui/searchable-select';
import { TaxSelect } from '@/shared/components/ui/tax-select';
import { ProductSelect } from '@/shared/components/ui/product-select';
import { useCompanyModules } from '@/shared/hooks/useCompanyModules';
import { useUserStorages } from '@/modules/inventory/hooks/useUserStorages';
import { useCostCenterTree, CostCenterCascadeSelect } from '@/modules/cost-centers';
import { productsService, type ForSelectProduct, type ForSelectItem } from '@/modules/inventory/services/products.service';

/* ── Constants ─────────────────────────────────────────── */

const round4 = (v: Decimal) => v.toDecimalPlaces(4, Decimal.ROUND_HALF_UP);

/* ── Types ─────────────────────────────────────────────── */

export interface ItemLine {
  id: string;
  product_id: string;
  product_label: string;
  consecutive: string;
  barcode: string;
  parent_product_id: string | null;
  is_service: boolean;
  description: string;
  quantity: string;
  unit_name: string;
  unit_price: string;
  tax_included: boolean;
  is_discount_rate: boolean;
  discount_input: string; // user types rate (%) or fixed ($)
  tax_id: string;
  tax_label: string;
  tax_rate: number;
  tax_per_unit_amount: number | null;
  storage_id: string;
  storage_label: string;
  cost_center_id: string;
  cost_center_label: string;
  cost_center_path: string[];
}

export interface ItemLineTotals {
  line_subtotal: Decimal;      // qty * unit_price
  discount_amount: Decimal;    // net discount ($)
  net_amount: Decimal;         // line_subtotal - discount_amount
  tax_amount: Decimal;         // net_amount * tax_rate / 100
  line_total: Decimal;         // net_amount + tax_amount
}

export interface DocumentItemsTableProps {
  items: ItemLine[];
  onItemsChange: (items: ItemLine[]) => void;
  taxLocked?: boolean;
  isAIU?: boolean;
}

/* ── Calculation helpers ──────────────────────────────── */

export function calcLineTotals(item: ItemLine): ItemLineTotals {
  const qty = new Decimal(item.quantity || '0');
  const rawPrice = new Decimal(item.unit_price || '0');
  const rate = new Decimal(item.tax_rate);

  // tax_included only applies to percentage taxes (per_unit is always "on top" of price)
  const price = (!item.tax_per_unit_amount && item.tax_included && rate.gt(0))
    ? round4(rawPrice.div(rate.div(100).plus(1)))
    : rawPrice;

  const line_subtotal = round4(qty.times(price));

  const discInput = new Decimal(item.discount_input || '0');
  let discount_amount: Decimal;
  if (item.is_discount_rate) {
    discount_amount = round4(line_subtotal.times(discInput).div(100));
  } else {
    discount_amount = Decimal.min(round4(discInput), line_subtotal);
  }

  const net_amount = round4(line_subtotal.minus(discount_amount));

  // Per-unit: tax = qty × per_unit_amount; Percentage: tax = net_amount × rate / 100
  const tax_amount = item.tax_per_unit_amount != null
    ? round4(qty.times(new Decimal(item.tax_per_unit_amount)))
    : round4(net_amount.times(rate).div(100));
  const line_total = round4(net_amount.plus(tax_amount));

  return { line_subtotal, discount_amount, net_amount, tax_amount, line_total };
}

/* ── Variant grouping ─────────────────────────────────── */

interface ItemGroup {
  type: 'individual' | 'variant_group';
  parentId: string | null;
  parentLabel: string;
  items: ItemLine[];
}

function groupItems(items: ItemLine[]): ItemGroup[] {
  const parentMap = new Map<string, ItemLine[]>();
  const standalone: ItemLine[] = [];

  for (const item of items) {
    if (item.parent_product_id) {
      const key = item.parent_product_id;
      if (!parentMap.has(key)) parentMap.set(key, []);
      parentMap.get(key)!.push(item);
    } else {
      standalone.push(item);
    }
  }

  const groups: ItemGroup[] = [];

  // Standalone items first (in original order)
  for (const item of standalone) {
    groups.push({ type: 'individual', parentId: null, parentLabel: '', items: [item] });
  }

  // Variant groups
  for (const [parentId, variants] of parentMap) {
    // Extract parent name from first variant label (remove attribute part)
    const firstLabel = variants[0].product_label;
    const parentLabel = firstLabel.includes(' — ')
      ? firstLabel.split(' — ')[0]
      : firstLabel;
    groups.push({ type: 'variant_group', parentId, parentLabel, items: variants });
  }

  return groups;
}

/* ── Component ────────────────────────────────────────── */

export function DocumentItemsTable({ items, onItemsChange, taxLocked, isAIU }: DocumentItemsTableProps) {
  const { hasModule } = useCompanyModules();
  const hasInventory = hasModule('inventory_management');
  const hasCostCenters = hasModule('cost_centers');
  const { ccTree, ccFlatMap } = useCostCenterTree(hasCostCenters);
  const { warehouses, storages: userStorages } = useUserStorages();

  // Build storage options from user's assigned warehouses
  const multipleWarehouses = warehouses.length > 1;
  const storageOptions = useMemo(() => {
    // Deduplicate by storage_id (API may return same storage from multiple warehouse assignments)
    const seen = new Set<string>();
    const opts: Array<{ value: string; label: string }> = [];
    for (const s of userStorages) {
      if (seen.has(s.storage_id)) continue;
      seen.add(s.storage_id);
      opts.push({
        value: s.storage_id,
        label: multipleWarehouses
          ? `${s.warehouse_consecutive} ${s.warehouse_name} / ${s.storage_consecutive} ${s.storage_name}`
          : `${s.storage_consecutive} ${s.storage_name}`,
      });
    }
    return opts;
  }, [userStorages, multipleWarehouses]);

  // Expand/collapse state for variant groups
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Search filter for already-added items
  const [itemSearch, setItemSearch] = useState('');

  // Variant selector modal state
  const [variantModalOpen, setVariantModalOpen] = useState(false);
  const [variantParentId, setVariantParentId] = useState<string | null>(null);
  const [variantParentLabel, setVariantParentLabel] = useState('');
  const [variantCombos, setVariantCombos] = useState<ForSelectItem[]>([]);
  const [variantCombosLoading, setVariantCombosLoading] = useState(false);
  const [variantCounts, setVariantCounts] = useState<Map<string, number>>(new Map());
  const [variantSearch, setVariantSearch] = useState('');

  /* ── Add product ─────────────────────────────── */

  const addProductLine = useCallback((product: ForSelectItem, parentId: string | null) => {
    const newItem: ItemLine = {
      id: crypto.randomUUID(),
      product_id: product.value,
      product_label: product.label,
      consecutive: product.description || '',
      barcode: product.barcode || '',
      parent_product_id: parentId,
      is_service: product.is_service,
      description: product.label.includes(' — ') ? product.label.split(' — ')[0] : product.label,
      quantity: '1',
      unit_name: product.unit_name || '',
      unit_price: product.price || '0',
      tax_included: product.tax_included,
      is_discount_rate: false,
      discount_input: '0',
      tax_id: product.tax_id || '',
      tax_label: product.tax_name || '',
      tax_rate: product.tax_rate ? parseFloat(product.tax_rate) : 0,
      tax_per_unit_amount: product.tax_per_unit_amount ?? null,
      storage_id: '',
      storage_label: '',
      cost_center_id: '',
      cost_center_label: '',
      cost_center_path: [],
    };

    onItemsChange([...items, newItem]);

    // Auto-expand the parent group
    if (parentId) {
      setExpandedGroups(prev => ({ ...prev, [parentId]: true }));
    }
  }, [items, onItemsChange]);

  const addBagProduct = useCallback(async () => {
    try {
      const p = await productsService.getOne('bag-plastic');
      if (!p) return;
      const taxLabel = p.tax
        ? (p.tax.per_unit_amount ? `${p.tax.name} ($${Number(p.tax.per_unit_amount)}/ud)` : `${p.tax.name} (${p.tax.rate}%)`)
        : '';
      const newItem: ItemLine = {
        id: crypto.randomUUID(),
        product_id: p.id,
        product_label: p.name,
        consecutive: p.consecutive || '',
        barcode: p.barcode || '',
        parent_product_id: null,
        is_service: true,
        description: p.name,
        quantity: '1',
        unit_name: p.unit?.name || '',
        unit_price: String(p.price ?? '0'),
        tax_included: false,
        is_discount_rate: false,
        discount_input: '0',
        tax_id: p.tax?.id || '',
        tax_label: taxLabel,
        tax_rate: p.tax ? Number(p.tax.rate) : 0,
        tax_per_unit_amount: p.tax?.per_unit_amount ? Number(p.tax.per_unit_amount) : null,
        storage_id: '',
        storage_label: '',
        cost_center_id: '',
        cost_center_label: '',
        cost_center_path: [],
      };
      onItemsChange([...items, newItem]);
    } catch (err) {
      console.error('Error adding bag product:', err);
    }
  }, [items, onItemsChange]);

  const openVariantSelector = useCallback((parentId: string, parentLabel: string, combinations?: ForSelectItem[]) => {
    setVariantParentId(parentId);
    setVariantParentLabel(parentLabel);
    setVariantCounts(new Map());
    setVariantSearch('');
    setVariantModalOpen(true);

    // Use passed combinations if available, otherwise load from server
    if (combinations && combinations.length > 0) {
      setVariantCombos(combinations);
      setVariantCombosLoading(false);
    } else {
      setVariantCombos([]);
      setVariantCombosLoading(true);
      productsService.getForSelect({ search: parentLabel, limit: 1 })
        .then((res) => {
          const parent = res.data.find(p => p.value === parentId);
          setVariantCombos(parent?.combinations || []);
          setVariantCombosLoading(false);
        })
        .catch(() => setVariantCombosLoading(false));
    }
  }, []);

  const handleAddProduct = useCallback((product: ForSelectProduct) => {
    // Check if this parent product has combinations
    if (product.combinations && product.combinations.length > 0) {
      openVariantSelector(product.value, product.label, product.combinations);
      return;
    }

    // Standalone product (no combinations) → add directly
    addProductLine(product, null);
  }, [addProductLine, openVariantSelector]);

  /* ── Variant modal confirm ─────────────────────── */

  const handleConfirmVariants = useCallback(() => {
    if (!variantParentId) return;

    const newItems: ItemLine[] = [];
    for (const [variantId, count] of variantCounts) {
      if (count <= 0) continue;
      const combo = variantCombos.find(c => c.value === variantId);
      if (!combo) continue;

      for (let n = 0; n < count; n++) {
        newItems.push({
          id: crypto.randomUUID(),
          product_id: combo.value,
          product_label: combo.label,
          consecutive: combo.description || '',
          barcode: combo.barcode || '',
          parent_product_id: variantParentId,
          is_service: combo.is_service,
          description: combo.label.includes(' — ') ? combo.label.split(' — ')[0] : combo.label,
          quantity: '1',
          unit_name: combo.unit_name || '',
          unit_price: combo.price || '0',
          tax_included: combo.tax_included,
          is_discount_rate: false,
          discount_input: '0',
          tax_id: combo.tax_id || '',
          tax_label: combo.tax_name || '',
          tax_rate: combo.tax_rate ? parseFloat(combo.tax_rate) : 0,
          tax_per_unit_amount: combo.tax_per_unit_amount ?? null,
          storage_id: '',
          storage_label: '',
          cost_center_id: '',
          cost_center_label: '',
          cost_center_path: [],
        });
      }
    }

    if (newItems.length > 0) {
      onItemsChange([...items, ...newItems]);
      setExpandedGroups(prev => ({ ...prev, [variantParentId]: true }));
    }

    setVariantModalOpen(false);
    setVariantParentId(null);
    setVariantCounts(new Map());
  }, [variantParentId, variantCounts, variantCombos, items, onItemsChange]);

  const updateVariantCount = useCallback((variantId: string, delta: number) => {
    setVariantCounts(prev => {
      const next = new Map(prev);
      const current = next.get(variantId) || 0;
      const newVal = Math.max(0, current + delta);
      if (newVal === 0) next.delete(variantId);
      else next.set(variantId, newVal);
      return next;
    });
  }, []);

  /* ── Update / remove line ─────────────────────── */

  const updateItem = useCallback((itemId: string, patch: Partial<ItemLine>) => {
    onItemsChange(items.map(i => i.id === itemId ? { ...i, ...patch } : i));
  }, [items, onItemsChange]);

  const removeItem = useCallback((itemId: string) => {
    onItemsChange(items.filter(i => i.id !== itemId));
  }, [items, onItemsChange]);

  const removeGroup = useCallback((parentId: string) => {
    onItemsChange(items.filter(i => i.parent_product_id !== parentId));
  }, [items, onItemsChange]);

  /* ── Group toggling ───────────────────────────── */

  const toggleGroup = useCallback((parentId: string) => {
    setExpandedGroups(prev => ({ ...prev, [parentId]: !prev[parentId] }));
  }, []);

  /* ── Grouped items (filtered by search) ──────── */

  const filteredItems = useMemo(() => {
    const q = itemSearch.toLowerCase().trim();
    if (!q) return items;

    const matches = (i: ItemLine) =>
      i.product_label.toLowerCase().includes(q) ||
      i.consecutive.toLowerCase().includes(q) ||
      i.barcode.toLowerCase().includes(q);

    // Collect parent IDs whose group should be fully included
    const matchedParentIds = new Set<string>();
    for (const i of items) {
      if (!matches(i)) continue;
      if (i.parent_product_id) matchedParentIds.add(i.parent_product_id);
      else if (!i.parent_product_id) {
        // Standalone with combinations: check if any sibling shares product_id as parent
        const hasChildren = items.some(c => c.parent_product_id === i.product_id);
        if (hasChildren) matchedParentIds.add(i.product_id);
      }
    }

    return items.filter(i => {
      // Include if it directly matches
      if (matches(i)) return true;
      // Include if it belongs to a matched group
      if (i.parent_product_id && matchedParentIds.has(i.parent_product_id)) return true;
      return false;
    });
  }, [items, itemSearch]);

  const groups = useMemo(() => groupItems(filteredItems), [filteredItems]);

  /* ── Render item row ──────────────────────────── */

  const renderItemRow = (item: ItemLine, isVariant: boolean) => {
    const totals = calcLineTotals(item);
    const variantAttrs = item.product_label.includes(' — ')
      ? item.product_label.split(' — ')[1]
      : null;

    return (
      <tr
        key={item.id}
        className={`border-b last:border-b-0 ${isVariant ? 'bg-blue-50/50 dark:bg-blue-900/10 border-l-2 border-l-blue-400' : ''}`}
      >
        {/* Expand placeholder */}
        <td className="w-[36px]" />

        {/* Producto */}
        <td className="px-2 py-1.5 text-sm">
          <div className={isVariant ? 'pl-3' : ''}>
            <input
              type="text"
              value={item.description}
              onChange={(e) => updateItem(item.id, { description: e.target.value })}
              className="w-full bg-transparent border-0 border-b border-transparent hover:border-gray-300 dark:hover:border-gray-600 focus:border-blue-500 focus:outline-none text-sm px-0 py-0.5"
              title={item.description}
            />
            {isVariant && variantAttrs && (
              <span className="inline-flex gap-1 flex-wrap mt-0.5">
                {variantAttrs.split(' / ').map((attr, i) => (
                  <span key={i} className="px-1.5 py-0.5 text-xs bg-blue-100 dark:bg-blue-800/40 text-blue-700 dark:text-blue-300 rounded">
                    {attr}
                  </span>
                ))}
              </span>
            )}
            {(item.consecutive || item.barcode) && (
              <div className="text-xs text-muted-foreground font-mono mt-0.5">
                {[item.consecutive, item.barcode].filter(Boolean).join(' | ')}
              </div>
            )}
          </div>
        </td>

        {/* Cantidad */}
        <td className="px-1 py-1.5 w-[110px] text-left">
          {item.is_service ? (
            <span className="text-xs text-muted-foreground px-2">Servicio</span>
          ) : (
          <div className="flex items-center gap-1">
            {item.unit_name && (
              <span className="text-[10px] text-muted-foreground whitespace-nowrap" title={item.unit_name}>
                {item.unit_name.length > 4 ? item.unit_name.slice(0, 4) : item.unit_name}
              </span>
            )}
            <NumericInput
              value={item.quantity}
              onChange={(e) => updateItem(item.id, { quantity: e.target.value })}
              className="h-8 text-xs"
            />
          </div>
          )}
        </td>

        {/* Precio */}
        <td className="px-1 py-1.5 w-[110px]">
          <NumericInput
            value={item.unit_price}
            onChange={(e) => updateItem(item.id, { unit_price: e.target.value })}
            currency
            className="h-8 text-xs"
          />
        </td>

        {/* Descuento */}
        <td className="px-1 py-1.5 w-[130px]">
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => updateItem(item.id, {
                is_discount_rate: !item.is_discount_rate,
                discount_input: '0',
              })}
              className="flex-shrink-0 w-6 h-8 flex items-center justify-center rounded border border-gray-300 dark:border-gray-600 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 text-xs"
              title={item.is_discount_rate ? 'Cambiar a valor fijo' : 'Cambiar a porcentaje'}
            >
              {item.is_discount_rate ? <Percent className="h-3 w-3" /> : <DollarSign className="h-3 w-3" />}
            </button>
            <NumericInput
              value={item.discount_input}
              onChange={(e) => updateItem(item.id, { discount_input: e.target.value })}
              className="h-8 text-xs flex-1"
            />
          </div>
        </td>

        {/* Impuesto */}
        <td className="px-1 py-1.5 w-[150px]">
          {(taxLocked || item.product_id === 'bag-plastic') ? (
            <span className="text-xs text-muted-foreground px-2">{item.tax_label || '—'}</span>
          ) : (
            <TaxSelect
              value={item.tax_id}
              valueLabel={item.tax_label}
              onChange={(id, label, data) => {
                updateItem(item.id, {
                  tax_id: id, tax_label: label, tax_rate: data.rate,
                  tax_per_unit_amount: data.perUnitAmount,
                  tax_included: data.perUnitAmount != null ? false : item.tax_included,
                });
              }}
              isTax={true}
              excludeCostTax
              excludeTypeIds={[10]}
              usePortal
              clearable
              placeholder="Impuesto..."
              className="text-xs"
            />
          )}
        </td>

        {/* Bodega (condicional) */}
        {hasInventory && (
          <td className="px-1 py-1.5 w-[150px]">
            {!item.is_service ? (
              <SearchableSelect
                options={storageOptions}
                value={item.storage_id}
                onChange={(id) => {
                  const opt = storageOptions.find(o => o.value === id);
                  updateItem(item.id, { storage_id: id, storage_label: opt?.label || '' });
                }}
                placeholder="Bodega..."
                className="text-xs"
              />
            ) : (
              <span className="text-xs text-muted-foreground px-2">—</span>
            )}
          </td>
        )}

        {/* Centro de costos (condicional) */}
        {hasCostCenters && (
          <td className="px-1 py-1.5 w-[180px]">
            <CostCenterCascadeSelect
              ccTree={ccTree}
              ccFlatMap={ccFlatMap}
              value={item.cost_center_id}
              path={item.cost_center_path}
              onChange={(id, label, path) => updateItem(item.id, {
                cost_center_id: id,
                cost_center_label: label,
                cost_center_path: path,
              })}
              size="sm"
              itemWidth="fixed"
            />
          </td>
        )}

        {/* Total */}
        <td className="px-2 py-1.5 text-right text-sm font-medium w-[110px]">
          <FormattedNumber value={totals.line_total.toNumber()} type="currency" />
        </td>

        {/* Eliminar */}
        <td className="px-1 py-1.5 text-center w-[36px]">
          <span
            role="button"
            tabIndex={0}
            title="Eliminar línea"
            className="inline-flex items-center justify-center cursor-pointer text-red-500 hover:text-red-700"
            onClick={() => removeItem(item.id)}
            onKeyDown={(e) => { if (e.key === 'Enter') removeItem(item.id); }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </span>
        </td>
      </tr>
    );
  };

  /* ── Render group header ──────────────────────── */

  const renderGroupHeader = (group: ItemGroup) => {
    if (group.type !== 'variant_group' || !group.parentId) return null;

    const isExpanded = expandedGroups[group.parentId] ?? false;
    const groupTotals = group.items.reduce(
      (acc, item) => {
        const t = calcLineTotals(item);
        return {
          qty: acc.qty.plus(new Decimal(item.quantity || '0')),
          total: acc.total.plus(t.line_total),
        };
      },
      { qty: new Decimal(0), total: new Decimal(0) }
    );

    return (
      <tr
        key={`group-${group.parentId}`}
        className="border-b bg-blue-50 dark:bg-blue-900/20 border-b-2 border-blue-200 dark:border-blue-700 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30"
        onClick={() => toggleGroup(group.parentId!)}
      >
        {/* Expand */}
        <td className="px-1 py-2 text-center w-[36px]">
          {isExpanded
            ? <ChevronDown className="h-4 w-4 text-blue-600 mx-auto" />
            : <ChevronRight className="h-4 w-4 text-blue-600 mx-auto" />
          }
        </td>

        {/* Parent name + count + edit button */}
        <td className="px-2 py-2 text-sm font-medium text-blue-800 dark:text-blue-300">
          <span className="inline-flex items-center gap-2">
            {group.parentLabel}
            <span className="text-xs text-blue-500 font-normal">
              ({group.items.length} variante{group.items.length !== 1 ? 's' : ''})
            </span>
            <span
              role="button"
              tabIndex={0}
              title="Gestionar variantes"
              className="inline-flex items-center justify-center cursor-pointer text-blue-500 hover:text-blue-700"
              onClick={(e) => {
                e.stopPropagation();
                openVariantSelector(group.parentId!, group.parentLabel);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.stopPropagation();
                  openVariantSelector(group.parentId!, group.parentLabel);
                }
              }}
            >
              <Pencil className="h-3.5 w-3.5" />
            </span>
          </span>
        </td>

        {/* Cant total */}
        <td className="px-2 py-2 text-sm text-right text-blue-700 dark:text-blue-300 font-medium">
          {groupTotals.qty.toString()}
        </td>

        {/* Empty cells for precio, dcto, imp */}
        <td />
        <td />
        <td />

        {/* Empty for conditional cols */}
        {hasInventory && <td />}
        {hasCostCenters && <td />}

        {/* Total */}
        <td className="px-2 py-2 text-right text-sm font-medium text-blue-800 dark:text-blue-300">
          <FormattedNumber value={groupTotals.total.toNumber()} type="currency" />
        </td>

        {/* Delete group */}
        <td className="px-1 py-2 text-center w-[36px]">
          <span
            role="button"
            tabIndex={0}
            title="Eliminar grupo"
            className="inline-flex items-center justify-center cursor-pointer text-red-500 hover:text-red-700"
            onClick={(e) => {
              e.stopPropagation();
              removeGroup(group.parentId!);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.stopPropagation();
                removeGroup(group.parentId!);
              }
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </span>
        </td>
      </tr>
    );
  };

  /* ── Main render ──────────────────────────────── */

  return (
    <div className="space-y-3">
      {/* Product selector + item search */}
      <div className="flex items-end gap-2">
        <div className="w-80">
          <ProductSelect
            onSelect={handleAddProduct}
            placeholder="Agregar producto..."
            searchPlaceholder="Buscar por nombre, código, barcode..."
          />
        </div>
        {!isAIU && (
          <Button type="button" variant="outline" size="sm" onClick={addBagProduct} title="Agregar Bolsa Plástica">
            <ShoppingBag className="h-4 w-4 mr-1" />
            Bolsa
          </Button>
        )}
        {items.length > 0 && (
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar items..."
              value={itemSearch}
              onChange={(e) => setItemSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}
      </div>

      {/* Items table */}
      {items.length === 0 ? (
        <div className="border border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center text-sm text-muted-foreground">
          <Plus className="h-6 w-6 mx-auto mb-2 text-gray-400" />
          Seleccione un producto para agregar líneas
        </div>
      ) : (
        <div className="border rounded-md overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="w-[36px]" />
                <th className="px-2 py-2 text-left font-medium">Producto</th>
                <th className="px-2 py-2 text-right font-medium w-[90px]">Cant</th>
                <th className="px-2 py-2 text-right font-medium w-[110px]">Precio</th>
                <th className="px-2 py-2 text-right font-medium w-[130px]">Dcto</th>
                <th className="px-2 py-2 text-left font-medium w-[150px]">Impuesto</th>
                {hasInventory && (
                  <th className="px-2 py-2 text-left font-medium w-[150px]">Bodega</th>
                )}
                {hasCostCenters && (
                  <th className="px-2 py-2 text-left font-medium w-[180px]">CC</th>
                )}
                <th className="px-2 py-2 text-right font-medium w-[110px]">Total</th>
                <th className="w-[36px]" />
              </tr>
            </thead>
            <tbody>
              {groups.flatMap((group) => {
                if (group.type === 'individual') {
                  return [renderItemRow(group.items[0], false)];
                }

                // Variant group: header + expanded children
                const isExpanded = expandedGroups[group.parentId!] ?? false;
                const rows = [renderGroupHeader(group)];
                if (isExpanded) {
                  rows.push(...group.items.map((item) => renderItemRow(item, true)));
                }
                return rows;
              })}
            </tbody>
          </table>
        </div>
      )}
      {/* Variant selector modal */}
      <Dialog open={variantModalOpen} onOpenChange={setVariantModalOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Seleccionar variantes — {variantParentLabel}</DialogTitle>
          </DialogHeader>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, código, atributo..."
              value={variantSearch}
              onChange={(e) => setVariantSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Variants list */}
          <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
            {variantCombosLoading ? (
              <p className="text-sm text-muted-foreground text-center py-6">Cargando variantes...</p>
            ) : (() => {
              const allCombos = variantCombos;
              const searchLower = variantSearch.toLowerCase().trim();
              const filtered = searchLower
                ? allCombos.filter(c =>
                    c.label.toLowerCase().includes(searchLower) ||
                    c.description.toLowerCase().includes(searchLower) ||
                    c.barcode.toLowerCase().includes(searchLower)
                  )
                : allCombos;

              if (filtered.length === 0) {
                return (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    {searchLower ? 'No se encontraron variantes' : 'No hay variantes disponibles'}
                  </p>
                );
              }

              return filtered.map((combo) => {
                const count = variantCounts.get(combo.value) || 0;
                const attrs = combo.label.includes(' — ') ? combo.label.split(' — ')[1] : null;
                const comboName = combo.label.includes(' — ') ? combo.label.split(' — ')[0] : combo.label;

                return (
                  <div
                    key={combo.value}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                      count > 0
                        ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-600'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800 border border-transparent'
                    }`}
                  >
                    {/* Counter +/- */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => updateVariantCount(combo.value, -1)}
                        disabled={count === 0}
                        className="w-6 h-6 rounded flex items-center justify-center border border-gray-300 dark:border-gray-600 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className={`w-6 text-center text-sm font-medium ${count > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                        {count}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateVariantCount(combo.value, 1)}
                        className="w-6 h-6 rounded flex items-center justify-center border border-gray-300 dark:border-gray-600 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{comboName}</span>
                        <span className="text-xs text-muted-foreground font-mono">{combo.description}</span>
                        {combo.barcode && (
                          <span className="text-xs text-muted-foreground font-mono">{combo.barcode}</span>
                        )}
                      </div>
                      {attrs && (
                        <div className="mt-0.5 inline-flex gap-1 flex-wrap">
                          {attrs.split(' / ').map((attr, i) => (
                            <span key={i} className="px-1.5 py-0.5 text-xs bg-blue-100 dark:bg-blue-800/40 text-blue-700 dark:text-blue-300 rounded">
                              {attr}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Price */}
                    <span className="text-sm text-muted-foreground flex-shrink-0">
                      <FormattedNumber value={parseFloat(combo.price || '0')} type="currency" />
                    </span>
                  </div>
                );
              });
            })()}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setVariantModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleConfirmVariants}
              disabled={variantCounts.size === 0}
            >
              Agregar {variantCounts.size > 0
                ? `(${Array.from(variantCounts.values()).reduce((a, b) => a + b, 0)})`
                : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
