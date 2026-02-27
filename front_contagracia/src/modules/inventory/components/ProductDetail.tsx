'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import {
  ArrowLeft, Package, Info, BarChart3, Layers, Wrench, ClipboardList, Trash2, RotateCcw, AlertTriangle, ArrowLeftRight, Pencil, SlidersHorizontal, RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useCompanyModules } from '@/shared/hooks/useCompanyModules';
import { productsService } from '../services/products.service';
import { ProductThumbnail } from './ProductThumbnail';
import { ProductInfoTab } from './ProductInfoTab';
import { StockByStorageTab } from './StockByStorageTab';
import { KardexTab } from './KardexTab';
import { CombinationsTab } from './CombinationsTab';
import { ProductTransfersTab } from './ProductTransfersTab';
import { ProductForm } from './ProductForm';
import { AdjustStockDialog } from './AdjustStockDialog';

interface ProductDetailProps {
  productId: string;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canViewStock: boolean;
  canManageProductAttributes: boolean;
  canViewCombinations: boolean;
  canCreateCombination: boolean;
  canEditCombination: boolean;
  canDeleteCombination: boolean;
  canViewProductTransfers: boolean;
  canCreateProductTransfer: boolean;
  canApproveRejectProductTransfer: boolean;
  canCreateAdjustment: boolean;
  /** Si se provee, el componente funciona en modo dialog (sin navegación) */
  onClose?: () => void;
}

export const ProductDetail = ({
  productId, canCreate, canEdit, canDelete, canViewStock,
  canManageProductAttributes, canViewCombinations, canCreateCombination, canEditCombination, canDeleteCombination,
  canViewProductTransfers, canCreateProductTransfer, canApproveRejectProductTransfer, canCreateAdjustment, onClose,
}: ProductDetailProps) => {
  const router = useRouter();
  const isDialogMode = !!onClose;
  const { hasModule } = useCompanyModules();
  const showAccounting = hasModule('accounting');
  const showStock = hasModule('inventory_management');
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);

  const fetchProduct = useCallback(async () => {
    setLoading(true);
    try {
      const data = await productsService.getOne(productId);
      setProduct(data);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error cargando producto');
      if (onClose) onClose(); else router.push('/dashboard/inventory');
    } finally {
      setLoading(false);
    }
  }, [productId, router]);

  useEffect(() => { fetchProduct(); }, [fetchProduct]);

  const handleDelete = async () => {
    try {
      const res = await productsService.delete(product.id);
      toast.success(res.message);
      if (res.type === 'hard_delete') {
        if (onClose) onClose(); else router.push('/dashboard/inventory');
      } else {
        // Soft delete: recargar para mostrar estado inactivo
        fetchProduct();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error eliminando producto');
    }
  };

  const handleReactivate = async () => {
    try {
      const res = await productsService.reactivate(product.id);
      toast.success(res.message);
      fetchProduct();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error reactivando producto');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-600 mx-auto" />
          <p className="text-gray-500 dark:text-slate-400">Cargando producto...</p>
        </div>
      </div>
    );
  }

  if (!product) return null;

  const isService = product.is_service;
  const isActive = product.is_active;
  const isSystemProduct = product.is_aiu || product.is_bag;
  const parentProductId = product.parent_product_id || product.id;

  // Determinar tipo de eliminación
  const willHardDelete = !product.has_movements && !product.has_combinations && !product.has_stock;

  // Construir descripción clara para el modal de confirmación
  const getDeleteDescription = () => {
    if (willHardDelete) {
      return `"${product.name}" no tiene movimientos, combinaciones ni stock en bodegas. Se eliminará permanentemente de la base de datos. Esta acción no se puede deshacer.`;
    }
    const reasons: string[] = [];
    if (product.has_movements) reasons.push('tiene movimientos registrados');
    if (product.has_combinations) reasons.push('tiene combinaciones');
    if (product.has_stock) reasons.push('tiene stock en bodegas');
    return `"${product.name}" ${reasons.join(', ')}. Se desactivará y dejará de aparecer en listados, pero sus datos históricos se conservarán. Podrás reactivarlo después si lo necesitas.`;
  };

  return (
    <div className="space-y-4">
      {/* Banner inactivo */}
      {!isActive && (
        <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-800 dark:text-red-300">Producto desactivado</p>
              <p className="text-xs text-red-600 dark:text-red-400">Este producto está inactivo. No aparece en listados ni puede ser usado en operaciones.</p>
            </div>
          </div>
          {canEdit && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleReactivate}
              className="text-green-700 hover:text-green-800 hover:bg-green-50 border-green-300 flex-shrink-0"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Reactivar
            </Button>
          )}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {!isDialogMode && (
            <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/inventory')}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Volver
            </Button>
          )}
          <div className="flex items-center gap-3">
            {product.image_path ? (
              <ProductThumbnail imagePath={product.image_path} size={40} className="rounded-lg" />
            ) : (
              <div className={`h-10 w-10 grid place-items-center rounded-lg text-white ${
                !isActive ? 'bg-gray-400' : isService ? 'bg-blue-500' : 'bg-orange-500'
              }`}>
                {isService ? <Wrench className="h-5 w-5" /> : <Package className="h-5 w-5" />}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className={`text-xl font-bold ${!isActive ? 'text-gray-400 dark:text-slate-500' : 'text-gray-900 dark:text-white'}`}>
                  {product.name}
                </h1>
                <Badge className={isService
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                  : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                }>
                  {isService ? 'Servicio' : 'Producto'}
                </Badge>
                {product.mode === 'PRODUCT' && (
                  <Badge variant="outline">Combinable</Badge>
                )}
                {product.mode === 'COMBINATION' && (
                  <Badge variant="outline">Combinación</Badge>
                )}
                {isSystemProduct && (
                  <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                    {product.is_aiu ? 'AIU' : 'Bolsa'}
                  </Badge>
                )}
                {!isActive && (
                  <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">Inactivo</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground font-mono">{product.consecutive}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchProduct}
            disabled={loading}
            title="Recargar datos"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          {isActive && canEdit && (!isSystemProduct || showAccounting) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditOpen(true)}
            >
              <Pencil className="h-4 w-4 mr-1" />
              {isSystemProduct ? 'Editar cuentas' : 'Editar'}
            </Button>
          )}
          {isActive && canCreateAdjustment && !isService && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAdjustOpen(true)}
            >
              <SlidersHorizontal className="h-4 w-4 mr-1" />
              Ajustar stock
            </Button>
          )}
          {isActive && canDelete && !isSystemProduct && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteOpen(true)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Eliminar
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info" className="flex items-center gap-1.5">
            <Info className="h-4 w-4" />
            Información
          </TabsTrigger>
          {showStock && !isService && (
            <TabsTrigger value="stock" className="flex items-center gap-1.5">
              <BarChart3 className="h-4 w-4" />
              Stock por Bodega
            </TabsTrigger>
          )}
          <TabsTrigger value="kardex" className="flex items-center gap-1.5">
            <ClipboardList className="h-4 w-4" />
            Kardex
          </TabsTrigger>
          {!isService && canViewProductTransfers && (
            <TabsTrigger value="transfers" className="flex items-center gap-1.5">
              <ArrowLeftRight className="h-4 w-4" />
              Transferencias
            </TabsTrigger>
          )}
          {product.mode === 'PRODUCT' && (canViewCombinations || canManageProductAttributes) && (
            <TabsTrigger value="combinations" className="flex items-center gap-1.5">
              <Layers className="h-4 w-4" />
              Combinaciones y Atributos
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="info" className="mt-4">
          <ProductInfoTab product={product} showAccounting={showAccounting} />
        </TabsContent>

        {showStock && !isService && (
          <TabsContent value="stock" className="mt-4">
            <StockByStorageTab productId={productId} />
          </TabsContent>
        )}

        <TabsContent value="kardex" className="mt-4">
          <KardexTab productId={productId} isService={isService} />
        </TabsContent>

        {!isService && canViewProductTransfers && (
          <TabsContent value="transfers" className="mt-4">
            <ProductTransfersTab
              productId={productId}
              parentProductId={parentProductId}
              canCreate={isActive && canCreateProductTransfer}
              canApproveReject={canApproveRejectProductTransfer}
            />
          </TabsContent>
        )}

        {product.mode === 'PRODUCT' && (canViewCombinations || canManageProductAttributes) && (
          <TabsContent value="combinations" className="mt-4">
            <CombinationsTab
              productId={productId}
              parentProduct={product}
              canManageAttributes={isActive && canManageProductAttributes}
              canViewCombinations={canViewCombinations}
              canCreate={isActive && canCreateCombination}
              canEdit={isActive && canEditCombination}
              canDelete={isActive && canDeleteCombination}
            />
          </TabsContent>
        )}
      </Tabs>

      {/* Edit product dialog */}
      <ProductForm
        open={editOpen}
        onOpenChange={setEditOpen}
        editing={product}
        onSaved={fetchProduct}
        parentProductId={product.mode === 'COMBINATION' ? product.parent_product_id : undefined}
      />

      {/* Confirm delete dialog */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={willHardDelete ? 'Eliminar producto permanentemente' : 'Desactivar producto'}
        description={getDeleteDescription()}
        confirmLabel={willHardDelete ? 'Eliminar permanentemente' : 'Desactivar'}
        variant="destructive"
        onConfirm={handleDelete}
      />

      {/* Adjust stock dialog */}
      <AdjustStockDialog
        open={adjustOpen}
        onOpenChange={setAdjustOpen}
        productId={productId}
        onAdjusted={fetchProduct}
      />
    </div>
  );
};
