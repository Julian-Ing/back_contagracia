'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { FormattedNumber } from '@/shared/components/ui/formatted-number';
import {
  Search, Plus, ChevronLeft, ChevronRight, Eye, Layers, Loader2, Pencil, Wand2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { productsService } from '../services/products.service';
import { ProductAttributeAssigner } from './ProductAttributeAssigner';
import { ProductForm } from './ProductForm';
import { BulkCombinationGenerator } from './BulkCombinationGenerator';
import { ProductDetailDialog } from './ProductDetailDialog';
import { ProductThumbnail } from './ProductThumbnail';
import type { CombinationListItem, AssignedAttribute, ProductListItem } from '../types';

interface CombinationsTabProps {
  productId: string;
  parentProduct: any;
  canManageAttributes: boolean;
  canViewCombinations: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

const ITEMS_PER_PAGE = 10;

export const CombinationsTab = ({ productId, parentProduct, canManageAttributes, canViewCombinations, canCreate, canEdit, canDelete }: CombinationsTabProps) => {
  // Assigned attributes (owned here, passed to assigner)
  const [assignedAttributes, setAssignedAttributes] = useState<AssignedAttribute[]>([]);
  const [loadingAssigned, setLoadingAssigned] = useState(true);

  // List state
  const [combinations, setCombinations] = useState<CombinationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // ProductForm dialog state
  const [formOpen, setFormOpen] = useState(false);
  const [editingCombination, setEditingCombination] = useState<ProductListItem | null>(null);

  // Bulk generator dialog state
  const [bulkOpen, setBulkOpen] = useState(false);

  // Detail dialog state
  const [detailProductId, setDetailProductId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  // Fetch assigned attributes
  const fetchAssignedAttributes = useCallback(async () => {
    setLoadingAssigned(true);
    try {
      const data = await productsService.getProductAttributes(productId);
      setAssignedAttributes(data);
    } catch {
      toast.error('Error cargando atributos asignados');
    } finally {
      setLoadingAssigned(false);
    }
  }, [productId]);

  useEffect(() => { fetchAssignedAttributes(); }, [fetchAssignedAttributes]);

  const fetchCombinations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await productsService.getCombinations(productId, {
        search: debouncedSearch || undefined,
        page,
        limit: ITEMS_PER_PAGE,
      });
      setCombinations(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error cargando combinaciones');
    } finally {
      setLoading(false);
    }
  }, [productId, debouncedSearch, page]);

  useEffect(() => { fetchCombinations(); }, [fetchCombinations]);

  // Open create form
  const handleOpenCreate = () => {
    if (assignedAttributes.length === 0) {
      toast.error('Primero asigna atributos al producto');
      return;
    }
    setEditingCombination(null);
    setFormOpen(true);
  };

  // Open bulk generator
  const handleOpenBulk = () => {
    if (assignedAttributes.length === 0) {
      toast.error('Primero asigna atributos al producto');
      return;
    }
    setBulkOpen(true);
  };

  // Open edit form
  const handleOpenEdit = (c: CombinationListItem) => {
    // Cast CombinationListItem to ProductListItem (shares id, name, barcode, etc.)
    setEditingCombination(c as unknown as ProductListItem);
    setFormOpen(true);
  };

  const handleSaved = () => {
    setPage(1);
    fetchCombinations();
  };

  return (
    <div className="space-y-4">
      {/* Attribute assignment (separate component) — conditioned on manage_attributes permission */}
      {canManageAttributes && (
        <ProductAttributeAssigner
          productId={productId}
          canEdit={canManageAttributes}
          assignedAttributes={assignedAttributes}
          loadingAssigned={loadingAssigned}
          onAssignedChange={setAssignedAttributes}
        />
      )}

      {/* Combinations list — conditioned on view combinations permission */}
      {canViewCombinations && <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
        <CardContent className="pt-5">
          {/* Header: search + create */}
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por nombre, barcode, atributo..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            {canCreate && (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleOpenBulk}>
                  <Wand2 className="h-4 w-4 mr-1" />
                  Generar combinaciones
                </Button>
                <Button size="sm" onClick={handleOpenCreate} className="bg-orange-600 hover:bg-orange-700 text-white">
                  <Plus className="h-4 w-4 mr-1" />
                  Crear combinación
                </Button>
              </div>
            )}
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-orange-600" />
            </div>
          ) : combinations.length === 0 ? (
            <div className="text-center py-12">
              <Layers className="h-10 w-10 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-slate-400">
                {search ? 'No se encontraron combinaciones' : 'Este producto no tiene combinaciones'}
              </p>
              {!search && canCreate && assignedAttributes.length > 0 && (
                <Button size="sm" variant="outline" className="mt-3" onClick={handleOpenCreate}>
                  <Plus className="h-4 w-4 mr-1" />
                  Crear primera combinación
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-slate-700">
                      <th className="py-2 px-3 text-xs font-medium text-gray-500 dark:text-slate-400 uppercase w-10"></th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Nombre</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Barcode</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Atributos</th>
                      <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Precio</th>
                      <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Costo</th>
                      <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Stock</th>
                      <th className="text-center py-2 px-3 text-xs font-medium text-gray-500 dark:text-slate-400 uppercase w-20">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {combinations.map(c => (
                      <tr key={c.id} className="border-b border-gray-100 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                        <td className="py-2.5 px-3">
                          <ProductThumbnail imagePath={c.image_path} size={32} />
                        </td>
                        <td className="py-2.5 px-3">
                          <button
                            onClick={() => { setDetailProductId(c.id); setDetailOpen(true); }}
                            className="text-orange-600 hover:text-orange-700 hover:underline font-medium text-left"
                          >
                            {c.name}
                          </button>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-xs text-gray-600 dark:text-slate-300">{c.barcode}</td>
                        <td className="py-2.5 px-3">
                          <div className="flex flex-wrap gap-1">
                            {c.attributes.map((attr, i) => (
                              <Badge key={i} variant="outline" className="text-xs font-normal">
                                {attr.attribute}: {attr.option}
                              </Badge>
                            ))}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right"><FormattedNumber value={c.price} type="currency" /></td>
                        <td className="py-2.5 px-3 text-right"><FormattedNumber value={c.cost} type="currency" /></td>
                        <td className="py-2.5 px-3 text-right font-semibold"><FormattedNumber value={c.stock ?? 0} /></td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {canEdit && (
                              <span
                                role="button"
                                onClick={() => handleOpenEdit(c)}
                                title="Editar combinación"
                                className="inline-flex items-center justify-center cursor-pointer text-gray-400 hover:text-orange-600 transition-colors"
                              >
                                <Pencil className="h-4 w-4" />
                              </span>
                            )}
                            <span
                              role="button"
                              onClick={() => { setDetailProductId(c.id); setDetailOpen(true); }}
                              title="Ver detalle"
                              className="inline-flex items-center justify-center cursor-pointer text-gray-400 hover:text-orange-600 transition-colors"
                            >
                              <Eye className="h-4 w-4" />
                            </span>
                          </div>
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
                    {total} combinación{total !== 1 ? 'es' : ''} — Página {page} de {totalPages}
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

          {/* ProductForm for create/edit combinations */}
          <ProductForm
            open={formOpen}
            onOpenChange={setFormOpen}
            editing={editingCombination}
            onSaved={handleSaved}
            parentProductId={productId}
          />

          {/* Bulk combination generator */}
          <BulkCombinationGenerator
            productId={productId}
            parentProduct={parentProduct}
            assignedAttributes={assignedAttributes}
            open={bulkOpen}
            onOpenChange={setBulkOpen}
            onCreated={handleSaved}
          />

          {/* Detail dialog for viewing combinations */}
          <ProductDetailDialog
            productId={detailProductId}
            open={detailOpen}
            onOpenChange={setDetailOpen}
          />
        </CardContent>
      </Card>}
    </div>
  );
};
