'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { FormattedNumber } from '@/shared/components/ui/formatted-number';
import {
  Search, ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  Package, Loader2, Warehouse,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { productsService } from '../services/products.service';
import { ProductThumbnail } from './ProductThumbnail';
import type { StockSummaryItem } from '../types';

const ITEMS_PER_PAGE = 10;

interface StockByStorageTabProps {
  productId: string;
}

export const StockByStorageTab = ({ productId }: StockByStorageTabProps) => {
  const [items, setItems] = useState<StockSummaryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasInventoryManagement, setHasInventoryManagement] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchStock = useCallback(async () => {
    setLoading(true);
    try {
      const res = await productsService.getStockSummary(productId, {
        search: debouncedSearch || undefined,
        page,
        limit: ITEMS_PER_PAGE,
      });
      setItems(res.items);
      setTotal(res.total);
      setTotalPages(res.totalPages);
      setHasInventoryManagement(res.has_inventory_management);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error cargando stock');
    } finally {
      setLoading(false);
    }
  }, [productId, debouncedSearch, page]);

  useEffect(() => { fetchStock(); }, [fetchStock]);

  const toggleExpand = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
      <CardContent className="pt-5">
        {/* Search */}
        <div className="mb-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por nombre, barcode, atributo..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-orange-600" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-10 w-10 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-slate-400">
              {search ? 'No se encontraron resultados' : 'No hay datos de stock'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-slate-700">
                    {hasInventoryManagement && (
                      <th className="w-10" />
                    )}
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Nombre</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Barcode</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Descripción</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Atributos</th>
                    <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Stock Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => {
                    const isExpanded = expandedRows.has(item.id);
                    const hasStorages = hasInventoryManagement && item.storages && item.storages.length > 0;

                    return (
                      <StockRow
                        key={item.id}
                        item={item}
                        isExpanded={isExpanded}
                        hasStorages={!!hasStorages}
                        showExpandCol={hasInventoryManagement}
                        onToggle={() => toggleExpand(item.id)}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 dark:border-slate-700/50">
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  {total} item{total !== 1 ? 's' : ''} — Página {page} de {totalPages}
                </p>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="h-8 w-8 p-0">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="h-8 w-8 p-0">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

// ---- Row component (main + expandable storages) ----

interface StockRowProps {
  item: StockSummaryItem;
  isExpanded: boolean;
  hasStorages: boolean;
  showExpandCol: boolean;
  onToggle: () => void;
}

const StockRow = ({ item, isExpanded, hasStorages, showExpandCol, onToggle }: StockRowProps) => {
  return (
    <>
      <tr
        className={`border-b border-gray-100 dark:border-slate-700/50 transition-colors ${
          hasStorages ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/30' : ''
        }`}
        onClick={hasStorages ? onToggle : undefined}
      >
        {showExpandCol && (
          <td className="py-2.5 px-1 text-center">
            {hasStorages && (
              <span className="inline-flex items-center justify-center text-gray-400">
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </span>
            )}
          </td>
        )}
        <td className="py-2.5 px-3">
          <div className="flex items-center gap-2">
            <ProductThumbnail imagePath={item.image_path} size={28} />
            <span className="font-medium text-gray-900 dark:text-white">{item.name}</span>
            {item.is_parent && (
              <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 text-[10px]">
                Principal
              </Badge>
            )}
          </div>
        </td>
        <td className="py-2.5 px-3 font-mono text-xs text-gray-600 dark:text-slate-300">{item.barcode}</td>
        <td className="py-2.5 px-3 text-gray-500 dark:text-slate-400 text-xs max-w-[200px] truncate">
          {item.description || '—'}
        </td>
        <td className="py-2.5 px-3">
          {item.attributes.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {item.attributes.map((attr, i) => (
                <Badge key={i} variant="outline" className="text-xs font-normal">
                  {attr.attribute}: {attr.option}
                </Badge>
              ))}
            </div>
          ) : (
            <span className="text-xs text-gray-400">—</span>
          )}
        </td>
        <td className="py-2.5 px-3 text-right font-semibold text-gray-900 dark:text-white">
          <FormattedNumber value={item.stock} />
        </td>
      </tr>

      {/* Expanded: stock per storage */}
      {isExpanded && hasStorages && item.storages!.map(s => (
        <tr key={s.storage_id} className="bg-gray-50/50 dark:bg-slate-800/30">
          {showExpandCol && <td />}
          <td colSpan={4} className="py-1.5 px-3 pl-8">
            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-slate-400">
              <Warehouse className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
              <span className="font-medium">{s.warehouse_name}</span>
              <span className="text-gray-400">/</span>
              <span>{s.storage_name}</span>
              <span className="font-mono text-[10px] text-gray-400">({s.storage_consecutive})</span>
            </div>
          </td>
          <td className="py-1.5 px-3 text-right text-sm font-medium text-gray-700 dark:text-slate-300">
            <FormattedNumber value={s.stock} />
          </td>
        </tr>
      ))}
    </>
  );
};
