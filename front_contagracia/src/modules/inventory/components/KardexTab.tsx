'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { SearchableSelect } from '@/shared/components/ui/searchable-select';
import type { SearchableSelectOption } from '@/shared/components/ui/searchable-select';
import { FormattedNumber } from '@/shared/components/ui/formatted-number';
import {
  Search, ChevronLeft, ChevronRight, Loader2, ClipboardList,
  ArrowDownCircle, ArrowUpCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDate } from '@/shared/utils/formatDate';
import { productsService } from '../services/products.service';
import type { KardexItem, ProductMovementTypeItem } from '../types';

const ITEMS_PER_PAGE = 15;

interface KardexTabProps {
  productId: string;
  isService?: boolean;
}

export const KardexTab = ({ productId, isService = false }: KardexTabProps) => {
  const [items, setItems] = useState<KardexItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [typeKey, setTypeKey] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Movement type options for SearchableSelect
  const [typeOptions, setTypeOptions] = useState<SearchableSelectOption[]>([]);

  // Load movement types once
  useEffect(() => {
    productsService.getMovementTypes().then((types) => {
      setTypeOptions(types.map((t) => ({ value: t.key, label: t.name })));
    }).catch(() => {});
  }, []);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [typeKey]);

  const fetchKardex = useCallback(async () => {
    setLoading(true);
    try {
      const res = await productsService.getKardex(productId, {
        search: debouncedSearch || undefined,
        type_key: typeKey || undefined,
        page,
        limit: ITEMS_PER_PAGE,
      });
      setItems(res.items);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error cargando kardex');
    } finally {
      setLoading(false);
    }
  }, [productId, debouncedSearch, typeKey, page]);

  useEffect(() => { fetchKardex(); }, [fetchKardex]);

  return (
    <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
      <CardContent className="pt-5">
        {/* Filters */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por consecutivo, notas, referencia..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <div className="w-56">
            <SearchableSelect
              options={typeOptions}
              value={typeKey}
              onChange={setTypeKey}
              placeholder="Tipo de movimiento"
              clearable={!!typeKey}
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
            <ClipboardList className="h-10 w-10 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-slate-400">
              {search || typeKey ? 'No se encontraron resultados' : 'No hay movimientos registrados'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-slate-700">
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Consecutivo</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Fecha</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Tipo</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Dirección</th>
                    <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Cantidad</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Bodega</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Notas</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((m) => (
                    <tr key={m.id} className="border-b border-gray-100 dark:border-slate-700/50">
                      <td className="py-2.5 px-3 font-mono text-xs font-medium text-gray-900 dark:text-white">
                        {m.consecutive}
                      </td>
                      <td className="py-2.5 px-3 text-gray-600 dark:text-slate-300 text-xs">
                        {formatDate(m.date)}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="text-xs text-gray-700 dark:text-slate-300">{m.type_name}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        {m.direction === 'IN' ? (
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 text-[10px]">
                            <ArrowDownCircle className="h-3 w-3 mr-0.5" />
                            Entrada
                          </Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 text-[10px]">
                            <ArrowUpCircle className="h-3 w-3 mr-0.5" />
                            Salida
                          </Badge>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-gray-900 dark:text-white">
                        {isService ? (
                          <span className="text-xs text-blue-600 dark:text-blue-400 italic">Servicio</span>
                        ) : (
                          <FormattedNumber value={m.quantity} />
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-xs text-gray-600 dark:text-slate-400">
                        {m.storage
                          ? `${m.storage.warehouse_name} / ${m.storage.name}`
                          : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-xs text-gray-500 dark:text-slate-400 max-w-[200px] truncate">
                        {m.notes || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 dark:border-slate-700/50">
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  {total} movimiento{total !== 1 ? 's' : ''} — Página {page} de {totalPages}
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
