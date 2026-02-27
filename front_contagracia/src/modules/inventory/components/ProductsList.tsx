'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Badge } from '@/shared/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/shared/components/ui/table';
import { SearchableSelect } from '@/shared/components/ui/searchable-select';
import { FormattedNumber } from '@/shared/components/ui/formatted-number';
import { Search, Plus, Pencil, ChevronRight, ChevronDown, Package, Wrench, Eye } from 'lucide-react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { productsService } from '../services/products.service';
import { ProductForm } from './ProductForm';
import { ProductThumbnail } from './ProductThumbnail';
import type { ProductListItem } from '../types';

interface ProductsListProps {
  canCreate: boolean;
  canEdit: boolean;
}

type ViewMode = 'all' | 'products' | 'combinations';

interface CombinationItem {
  id: string;
  consecutive: string;
  barcode: string;
  name: string;
  price: number;
  cost: number;
  stock: number;
  mode: string;
  image_path: string | null;
  parent_product_id: string;
  attributes: Array<{ attribute: string; option: string }>;
}

interface ProductWithCombinations extends ProductListItem {
  combinations?: CombinationItem[];
  // Para vista de combinaciones flat
  parent_product?: { id: string; name: string; consecutive: string } | null;
  attributes?: Array<{ attribute: string; option: string }>;
}

const VIEW_MODE_OPTIONS = [
  { value: 'all', label: 'Todos (jerárquico)' },
  { value: 'products', label: 'Solo productos' },
  { value: 'combinations', label: 'Solo combinaciones' },
];

const TYPE_FILTER_OPTIONS = [
  { value: 'all', label: 'Productos y Servicios' },
  { value: 'product', label: 'Solo productos' },
  { value: 'service', label: 'Solo servicios' },
];

type TypeFilter = 'all' | 'product' | 'service';

export const ProductsList = ({ canCreate, canEdit }: ProductsListProps) => {
  const router = useRouter();
  const [products, setProducts] = useState<ProductWithCombinations[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

  // Expandidos (para vista jerárquica)
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Form modal
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ProductListItem | null>(null);
  const [editingParentId, setEditingParentId] = useState<string | undefined>(undefined);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await productsService.getAll({
        search: debouncedSearch || undefined,
        page,
        limit: 50,
        view_mode: viewMode,
        is_service: typeFilter === 'all' ? undefined : typeFilter === 'service',
      });
      setProducts(res.data as ProductWithCombinations[]);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error cargando productos');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page, viewMode, typeFilter]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, viewMode, typeFilter]);

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openCreate = () => {
    setEditing(null);
    setEditingParentId(undefined);
    setFormOpen(true);
  };

  const openEdit = (product: ProductListItem, parentId?: string) => {
    setEditing(product);
    setEditingParentId(parentId);
    setFormOpen(true);
  };

  // Columnas dependen del view_mode
  const isHierarchical = viewMode === 'all';
  const isCombinationsView = viewMode === 'combinations';

  if (loading && products.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-600 mx-auto" />
          <p className="text-gray-500 dark:text-slate-400">Cargando productos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <CardTitle className="text-gray-900 dark:text-white flex items-center gap-3 text-base">
                <span>Productos y Servicios</span>
                <Badge variant="secondary">{total}</Badge>
              </CardTitle>
              {canCreate && (
                <Button size="sm" onClick={openCreate}>
                  <Plus className="h-4 w-4 mr-1" />
                  Crear
                </Button>
              )}
            </div>
            <div className="flex gap-2 flex-1 md:max-w-2xl">
              <div className="w-[200px] shrink-0">
                <SearchableSelect
                  options={VIEW_MODE_OPTIONS}
                  value={viewMode}
                  onChange={(v) => setViewMode((v || 'all') as ViewMode)}
                  placeholder="Vista"
                  clearable={false}
                />
              </div>
              <div className="w-[200px] shrink-0">
                <SearchableSelect
                  options={TYPE_FILTER_OPTIONS}
                  value={typeFilter}
                  onChange={(v) => setTypeFilter((v || 'all') as TypeFilter)}
                  placeholder="Tipo"
                  clearable={false}
                />
              </div>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar nombre, código de barras, código..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-10"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-200 dark:border-slate-700">
                  {isHierarchical && <TableHead className="w-[40px]" />}
                  <TableHead className="text-gray-600 dark:text-slate-300 w-[100px]">Código</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300 w-[100px]">Cód. Barras</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300">Nombre</TableHead>
                  {isCombinationsView && (
                    <TableHead className="text-gray-600 dark:text-slate-300">Producto padre</TableHead>
                  )}
                  {!isCombinationsView && (
                    <TableHead className="text-gray-600 dark:text-slate-300">Categoría</TableHead>
                  )}
                  <TableHead className="text-gray-600 dark:text-slate-300 text-right w-[110px]">Precio</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300 text-right w-[110px]">Costo</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300 text-right w-[80px]">Stock</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300 w-[90px]">Tipo</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300 text-right w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={isHierarchical ? 10 : 9}
                      className="text-center py-12 text-gray-500 dark:text-slate-400"
                    >
                      No se encontraron productos
                    </TableCell>
                  </TableRow>
                ) : (
                  products.map((product) => (
                    <ProductRow
                      key={product.id}
                      product={product}
                      isHierarchical={isHierarchical}
                      isCombinationsView={isCombinationsView}
                      expanded={expanded.has(product.id)}
                      onToggleExpand={() => toggleExpand(product.id)}
                      canEdit={canEdit}
                      onEdit={openEdit}
                      onView={(id) => router.push(`/dashboard/inventory/${id}`)}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Página {page} de {totalPages} ({total} registros)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => p - 1)}
              disabled={page <= 1 || loading}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => p + 1)}
              disabled={page >= totalPages || loading}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}

      {/* Form modal */}
      <ProductForm
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        onSaved={fetchProducts}
        parentProductId={editingParentId}
      />
    </div>
  );
};

// ---- Sub-componente: fila de producto ----

interface ProductRowProps {
  product: ProductWithCombinations;
  isHierarchical: boolean;
  isCombinationsView: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  canEdit: boolean;
  onEdit: (product: ProductListItem, parentId?: string) => void;
  onView: (productId: string) => void;
}

const ProductRow = ({
  product,
  isHierarchical,
  isCombinationsView,
  expanded,
  onToggleExpand,
  canEdit,
  onEdit,
  onView,
}: ProductRowProps) => {
  const hasCombinations = isHierarchical && (product.combinations_count > 0 || (product.combinations && product.combinations.length > 0));

  return (
    <>
      {/* Fila principal */}
      <TableRow className="border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/40">
        {isHierarchical && (
          <TableCell className="px-2">
            {hasCombinations ? (
              <button
                onClick={onToggleExpand}
                className="p-1 rounded hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
              >
                {expanded ? (
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-500" />
                )}
              </button>
            ) : (
              <div className="w-6" />
            )}
          </TableCell>
        )}
        <TableCell>
          <span className="font-mono text-xs text-gray-600 dark:text-slate-400">{product.consecutive}</span>
        </TableCell>
        <TableCell>
          <span className="font-mono text-xs text-gray-600 dark:text-slate-400">{product.barcode || '-'}</span>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <ProductThumbnail imagePath={product.image_path} size={32} />
            <button
              onClick={() => onView(product.id)}
              className="font-medium text-gray-900 dark:text-white hover:text-orange-600 dark:hover:text-orange-400 hover:underline text-left"
            >
              {product.name}
            </button>
            {isHierarchical && hasCombinations && (
              <Badge variant="outline" className="text-xs">
                {product.combinations_count}
              </Badge>
            )}
            {product.is_aiu && (
              <Badge className="text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">AIU</Badge>
            )}
            {product.is_bag && (
              <Badge className="text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300">Bolsa</Badge>
            )}
          </div>
          {/* Atributos para vista de combinaciones */}
          {isCombinationsView && product.attributes && product.attributes.length > 0 && (
            <div className="flex gap-1 mt-1">
              {product.attributes.map((attr, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {attr.attribute}: {attr.option}
                </Badge>
              ))}
            </div>
          )}
        </TableCell>
        {isCombinationsView && (
          <TableCell>
            <span className="text-sm text-gray-600 dark:text-slate-400">
              {product.parent_product?.name || '-'}
            </span>
          </TableCell>
        )}
        {!isCombinationsView && (
          <TableCell>
            <span className="text-sm text-gray-600 dark:text-slate-400">
              {product.category?.name || '-'}
            </span>
          </TableCell>
        )}
        <TableCell className="text-right">
          <FormattedNumber value={product.price} type="currency" />
        </TableCell>
        <TableCell className="text-right">
          <FormattedNumber value={product.cost} type="currency" />
        </TableCell>
        <TableCell className="text-right">
          <span className="text-gray-900 dark:text-white"><FormattedNumber value={product.stock ?? 0} /></span>
        </TableCell>
        <TableCell>
          {product.is_service ? (
            <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
              <Wrench className="h-3 w-3 mr-1" />
              Servicio
            </Badge>
          ) : (
            <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
              <Package className="h-3 w-3 mr-1" />
              Producto
            </Badge>
          )}
        </TableCell>
        <TableCell className="text-right">
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onView(product.id)}
              title="Ver detalle"
            >
              <Eye className="h-4 w-4" />
            </Button>
            {canEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(product, product.parent_product?.id)}
                title="Editar"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
          </div>
        </TableCell>
      </TableRow>

      {/* Filas de combinaciones (expandidas) */}
      {isHierarchical && expanded && product.combinations?.map((combo) => (
        <TableRow
          key={combo.id}
          className="border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/30 hover:bg-gray-100 dark:hover:bg-slate-700/30"
        >
          <TableCell className="px-2">
            <div className="w-6" />
          </TableCell>
          <TableCell>
            <span className="font-mono text-xs text-gray-400 dark:text-slate-500 pl-4">
              {combo.consecutive}
            </span>
          </TableCell>
          <TableCell>
            <span className="font-mono text-xs text-gray-400 dark:text-slate-500">
              {combo.barcode || '-'}
            </span>
          </TableCell>
          <TableCell>
            <div className="pl-4">
              <div className="flex items-center gap-2">
                <ProductThumbnail imagePath={combo.image_path} size={28} />
                <span className="text-sm text-gray-700 dark:text-slate-300">{combo.name}</span>
              </div>
              {combo.attributes && combo.attributes.length > 0 && (
                <div className="flex gap-1 mt-1 ml-[36px]">
                  {combo.attributes.map((attr, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {attr.attribute}: {attr.option}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </TableCell>
          <TableCell /> {/* Categoría — heredada del padre */}
          <TableCell className="text-right">
            <span className="text-sm">
              <FormattedNumber value={combo.price} type="currency" />
            </span>
          </TableCell>
          <TableCell className="text-right">
            <span className="text-sm">
              <FormattedNumber value={combo.cost} type="currency" />
            </span>
          </TableCell>
          <TableCell className="text-right">
            <span className="text-sm text-gray-700 dark:text-slate-300"><FormattedNumber value={combo.stock ?? 0} /></span>
          </TableCell>
          <TableCell>
            <Badge variant="outline" className="text-xs text-gray-500 dark:text-slate-400">
              Combinación
            </Badge>
          </TableCell>
          <TableCell className="text-right">
            <div className="flex items-center justify-end gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onView(combo.id)}
                title="Ver detalle"
              >
                <Eye className="h-4 w-4" />
              </Button>
              {canEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(combo as any, combo.parent_product_id)}
                  title="Editar"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
            </div>
          </TableCell>
        </TableRow>
      ))}
    </>
  );
};
