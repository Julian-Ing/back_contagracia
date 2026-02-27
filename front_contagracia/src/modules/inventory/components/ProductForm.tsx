'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { NumericInput } from '@/shared/components/ui/numeric-input';
import { Switch } from '@/shared/components/ui/switch';
import { Select } from '@/shared/components/ui/select';
import { AccountSelect } from '@/shared/components/ui/account-select';
import { TaxSelect } from '@/shared/components/ui/tax-select';
import { CategorySelect } from '@/shared/components/ui/category-select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/shared/components/ui/dialog';
import { SearchableSelect } from '@/shared/components/ui/searchable-select';
import { Loader2, Shuffle, Download, Camera, X } from 'lucide-react';
import JsBarcode from 'jsbarcode';
import toast from 'react-hot-toast';
import { useCompanyModules } from '@/shared/hooks/useCompanyModules';
import { useAuthImage } from '@/shared/hooks/useAuthImage';
import { mediaClient } from '@/shared/services/api/apiClient';
import { accountingConfigService } from '@/modules/accounting/services/accountingConfig.service';
import { productsService } from '../services/products.service';
import type { ProductListItem, ProductUnitItem, AssignedAttribute } from '../types';

interface ProductFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: ProductListItem | null;
  onSaved: () => void;
  /** Si se pasa, el form opera en modo combinación (crear/editar combinación de este padre) */
  parentProductId?: string;
}

const COSTING_OPTIONS = [
  { value: 'LAST_PURCHASE', label: 'Último costo de compra' },
  { value: 'AVERAGE', label: 'Promedio ponderado' },
];

export const ProductForm = ({ open, onOpenChange, editing, onSaved, parentProductId }: ProductFormProps) => {
  const { hasModule } = useCompanyModules();
  const showAccounting = hasModule('accounting');
  const isCombinationMode = !!parentProductId;

  // Combination-specific state
  const [assignedAttributes, setAssignedAttributes] = useState<AssignedAttribute[]>([]);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [loadingParent, setLoadingParent] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [barcode, setBarcode] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categoryLabel, setCategoryLabel] = useState('');
  const [unitId, setUnitId] = useState('');
  const [taxId, setTaxId] = useState('');
  const [taxLabel, setTaxLabel] = useState('');
  const [price, setPrice] = useState('0');
  const [cost, setCost] = useState('0');
  const [taxIncluded, setTaxIncluded] = useState(false);
  const [costingType, setCostingType] = useState('LAST_PURCHASE');
  const [isService, setIsService] = useState(false);
  const [assetAccountCode, setAssetAccountCode] = useState('');
  const [assetAccountLabel, setAssetAccountLabel] = useState('');
  const [cogsAccountCode, setCogsAccountCode] = useState('');
  const [cogsAccountLabel, setCogsAccountLabel] = useState('');
  const [revenueAccountCode, setRevenueAccountCode] = useState('');
  const [revenueAccountLabel, setRevenueAccountLabel] = useState('');

  // Image state
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const { src: imagePreviewSrc, loading: imagePreviewLoading } = useAuthImage(imagePath);
  const imageFileRef = useRef<HTMLInputElement>(null);

  // Units list (small, loaded once)
  const [units, setUnits] = useState<ProductUnitItem[]>([]);
  const [unitsLoading, setUnitsLoading] = useState(false);

  const [saving, setSaving] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [isSystemProduct, setIsSystemProduct] = useState(false);
  const didBackfill = useRef(false);
  const prevIsServiceRef = useRef<boolean | null>(null);

  const generateRandomBarcode = () => {
    const ts = Date.now().toString(36).toUpperCase();
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    setBarcode(`${ts}-${rand}`);
  };

  const downloadBarcodePng = () => {
    if (!barcode) {
      toast.error('Ingresa un código de barras primero');
      return;
    }
    try {
      const canvas = document.createElement('canvas');
      JsBarcode(canvas, barcode, {
        format: 'CODE128',
        width: 2,
        height: 80,
        displayValue: true,
        fontSize: 14,
        margin: 10,
        background: 'transparent',
      });
      const link = document.createElement('a');
      link.download = `barcode-${barcode}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch {
      toast.error('No se pudo generar el código de barras. Verifica que el código sea válido.');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Solo se permiten imágenes JPEG, PNG o WebP');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen no debe superar 5 MB');
      return;
    }

    setImageUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('category', 'product_image');

      const mediaRes = await mediaClient.post('/media/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImagePath(mediaRes.data.url);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al subir la imagen');
    } finally {
      setImageUploading(false);
      if (imageFileRef.current) imageFileRef.current.value = '';
    }
  };

  // Precargar cuentas contables desde accounting_config
  const backfillAccounts = useCallback(async (forService: boolean) => {
    if (!showAccounting) return;
    try {
      if (forService) {
        const rev = await accountingConfigService.getByKey('inventory_service_revenue');
        if (rev?.account) {
          setRevenueAccountCode(rev.account.code);
          setRevenueAccountLabel(`${rev.account.code} - ${rev.account.name}`);
        }
        setAssetAccountCode('');
        setAssetAccountLabel('');
        setCogsAccountCode('');
        setCogsAccountLabel('');
      } else {
        const [asset, cogs, rev] = await Promise.all([
          accountingConfigService.getByKey('inventory_products'),
          accountingConfigService.getByKey('inventory_product_costs'),
          accountingConfigService.getByKey('inventory_product_revenue'),
        ]);
        if (asset?.account) {
          setAssetAccountCode(asset.account.code);
          setAssetAccountLabel(`${asset.account.code} - ${asset.account.name}`);
        }
        if (cogs?.account) {
          setCogsAccountCode(cogs.account.code);
          setCogsAccountLabel(`${cogs.account.code} - ${cogs.account.name}`);
        }
        if (rev?.account) {
          setRevenueAccountCode(rev.account.code);
          setRevenueAccountLabel(`${rev.account.code} - ${rev.account.name}`);
        }
      }
    } catch {
      // Falla silenciosamente — el usuario selecciona manualmente
    }
  }, [showAccounting]);

  // Reset refs al cerrar dialog (antes de que backfill corra al reabrir)
  useEffect(() => {
    if (!open) {
      didBackfill.current = false;
      prevIsServiceRef.current = null;
    }
  }, [open]);

  // Backfill inicial al abrir form de creación
  useEffect(() => {
    if (!open || editing || isCombinationMode || didBackfill.current) return;
    didBackfill.current = true;
    prevIsServiceRef.current = isService;
    backfillAccounts(isService);
  }, [open, editing, isService, isCombinationMode, backfillAccounts]);

  // Re-cargar cuentas al cambiar toggle servicio/producto
  useEffect(() => {
    if (!open) return;
    const prev = prevIsServiceRef.current;
    if (prev === null || prev === isService) return;
    prevIsServiceRef.current = isService;
    backfillAccounts(isService);
  }, [open, isService, backfillAccounts]);

  // Cargar unidades cuando se abre el form
  useEffect(() => {
    if (!open) return;
    const loadUnits = async () => {
      setUnitsLoading(true);
      try {
        const data = await productsService.getUnits();
        setUnits(data);
      } catch {
        toast.error('Error cargando unidades');
      } finally {
        setUnitsLoading(false);
      }
    };
    loadUnits();
  }, [open]);

  // Helper para popular form desde un producto (padre o combinación)
  const populateFromProduct = (product: any) => {
    setName(product.name || '');
    setBarcode(product.barcode || '');
    setDescription(product.description || '');
    setImagePath(product.image_path || null);
    setCategoryId(product.category?.id || '');
    setCategoryLabel(product.category?.name || '');
    setUnitId(product.unit?.id || '');
    setTaxId(product.tax?.id || '');
    setTaxLabel(product.tax ? `${product.tax.name} (${product.tax.rate}%)` : '');
    setPrice(String(product.price ?? 0));
    setCost(String(product.cost ?? 0));
    setTaxIncluded(product.tax_included ?? false);
    setCostingType(product.costing_type || 'LAST_PURCHASE');
    setIsService(product.is_service ?? false);
    setAssetAccountCode(product.asset_account?.code || '');
    setAssetAccountLabel(product.asset_account ? `${product.asset_account.code} - ${product.asset_account.name}` : '');
    setCogsAccountCode(product.cogs_account?.code || '');
    setCogsAccountLabel(product.cogs_account ? `${product.cogs_account.code} - ${product.cogs_account.name}` : '');
    setRevenueAccountCode(product.revenue_account?.code || '');
    setRevenueAccountLabel(product.revenue_account ? `${product.revenue_account.code} - ${product.revenue_account.name}` : '');
  };

  const resetForm = () => {
    didBackfill.current = false;
    prevIsServiceRef.current = null;
    setIsSystemProduct(false);
    setName('');
    setBarcode('');
    setDescription('');
    setImagePath(null);
    setCategoryId('');
    setCategoryLabel('');
    setUnitId('');
    setTaxId('');
    setTaxLabel('');
    setPrice('0');
    setCost('0');
    setTaxIncluded(false);
    setCostingType('LAST_PURCHASE');
    setIsService(false);
    setAssetAccountCode('');
    setAssetAccountLabel('');
    setCogsAccountCode('');
    setCogsAccountLabel('');
    setRevenueAccountCode('');
    setRevenueAccountLabel('');
    setAssignedAttributes([]);
    setSelectedOptions({});
  };

  // Cargar datos al abrir
  useEffect(() => {
    if (!open) return;

    // Modo combinación: precargar padre + atributos asignados
    if (isCombinationMode) {
      const loadCombinationData = async () => {
        setLoadingParent(true);
        setLoadingDetail(true);
        try {
          // Cargar atributos asignados al padre
          const attrs = await productsService.getProductAttributes(parentProductId);
          setAssignedAttributes(attrs);

          if (editing) {
            // Editar combinación: cargar datos de la combinación
            const combo = await productsService.getOne(editing.id);
            populateFromProduct(combo);
            // Preseleccionar opciones de atributo de la combinación
            const opts: Record<string, string> = {};
            for (const ca of combo.combination_attributes || []) {
              const attrId = ca.attribute_option?.attribute?.id;
              const optId = ca.attribute_option?.id;
              if (attrId && optId) opts[attrId] = optId;
            }
            setSelectedOptions(opts);
          } else {
            // Crear combinación: precargar datos del padre (heredados)
            const parent = await productsService.getOne(parentProductId);
            populateFromProduct(parent);
            // Conservar nombre del padre, generar barcode único, limpiar resto
            generateRandomBarcode();
            setDescription('');
            setImagePath(null);
            setSelectedOptions({});
          }
        } catch (err: any) {
          toast.error(err?.response?.data?.message || 'Error cargando datos');
          onOpenChange(false);
        } finally {
          setLoadingParent(false);
          setLoadingDetail(false);
        }
      };
      loadCombinationData();
      return;
    }

    // Modo producto normal
    if (!editing) {
      resetForm();
      return;
    }

    // Editar producto normal
    const loadDetail = async () => {
      setLoadingDetail(true);
      try {
        const product = await productsService.getOne(editing.id);
        setIsSystemProduct(product.is_aiu || product.is_bag);
        populateFromProduct(product);
      } catch (err: any) {
        toast.error(err?.response?.data?.message || 'Error cargando producto');
        onOpenChange(false);
      } finally {
        setLoadingDetail(false);
      }
    };
    loadDetail();
  }, [open, editing, isCombinationMode, parentProductId]);

  const unitOptions = units.map(u => ({ value: u.id, label: u.symbol ? `${u.name} (${u.symbol})` : u.name }));

  const handleSave = async () => {
    // Producto del sistema: solo validar y enviar cuentas contables
    if (isSystemProduct && editing) {
      setSaving(true);
      try {
        const payload: any = {};
        if (assetAccountCode !== undefined) payload.asset_account_code = assetAccountCode || null;
        if (cogsAccountCode !== undefined) payload.cogs_account_code = cogsAccountCode || null;
        if (revenueAccountCode !== undefined) payload.revenue_account_code = revenueAccountCode || null;
        await productsService.update(editing.id, payload);
        toast.success('Cuentas contables actualizadas');
        onOpenChange(false);
        onSaved();
      } catch (err: any) {
        toast.error(err?.response?.data?.message || 'Error guardando');
      } finally {
        setSaving(false);
      }
      return;
    }

    // Validaciones comunes
    if (!name.trim()) { toast.error('El nombre es requerido'); return; }
    if (!barcode.trim()) { toast.error('El código de barras es requerido'); return; }

    // Validaciones comunes de producto
    if (!categoryId) { toast.error('La categoría es requerida'); return; }
    if (!isService && !unitId) { toast.error('La unidad es requerida'); return; }
    if (!taxId) { toast.error('El impuesto es requerido'); return; }
    if (showAccounting && !isService && !assetAccountCode) { toast.error('La cuenta de inventario es requerida'); return; }
    if (showAccounting && !isService && !cogsAccountCode) { toast.error('La cuenta de costo de ventas es requerida'); return; }
    if (showAccounting && !revenueAccountCode) { toast.error('La cuenta de ingresos es requerida'); return; }

    // Validación extra en modo combinación
    if (isCombinationMode) {
      const optionIds = Object.values(selectedOptions).filter(Boolean);
      if (optionIds.length === 0) { toast.error('Selecciona al menos una opción de atributo'); return; }
    }

    setSaving(true);
    try {
      const accountingPayload = showAccounting ? (isService ? {
        asset_account_code: undefined,
        cogs_account_code: undefined,
        revenue_account_code: revenueAccountCode || undefined,
      } : {
        asset_account_code: assetAccountCode || undefined,
        cogs_account_code: cogsAccountCode || undefined,
        revenue_account_code: revenueAccountCode || undefined,
      }) : {};

      const basePayload = {
        name: name.trim(),
        barcode: barcode.trim(),
        description: description.trim() || undefined,
        category_id: categoryId,
        unit_id: isService ? undefined : unitId,
        tax_id: taxId,
        price: Number(price) || 0,
        cost: isService ? 0 : (Number(cost) || 0),
        tax_included: taxIncluded,
        costing_type: costingType,
        is_service: isService,
        image_path: imagePath,
        ...accountingPayload,
      };

      if (isCombinationMode) {
        const optionIds = Object.values(selectedOptions).filter(Boolean);
        if (editing) {
          await productsService.update(editing.id, { ...basePayload, attribute_option_ids: optionIds });
          toast.success('Combinación actualizada');
        } else {
          await productsService.createCombinations(parentProductId, {
            combinations: [{
              ...basePayload,
              attribute_option_ids: optionIds,
            }],
          });
          toast.success('Combinación creada');
        }
      } else if (editing) {
        await productsService.update(editing.id, basePayload);
        toast.success(isService ? 'Servicio actualizado' : 'Producto actualizado');
      } else {
        await productsService.create(basePayload);
        toast.success(isService ? 'Servicio creado' : 'Producto creado');
      }
      onOpenChange(false);
      onSaved();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error guardando');
    } finally {
      setSaving(false);
    }
  };

  // Título del dialog según modo
  const dialogTitle = isSystemProduct
    ? 'Editar Cuentas Contables'
    : isCombinationMode
      ? (editing ? 'Editar Combinación' : 'Nueva Combinación')
      : (editing
        ? `Editar ${isService ? 'Servicio' : 'Producto'}`
        : `Nuevo ${isService ? 'Servicio' : 'Producto'}`);

  const dialogSubtitle = isSystemProduct
    ? 'Este es un producto del sistema. Solo puedes modificar las cuentas contables.'
    : isCombinationMode
      ? (editing ? 'Actualiza la información de la combinación.' : 'Rellena los detalles de la nueva combinación.')
      : (editing
        ? `Actualiza la información del ${isService ? 'servicio' : 'producto'}.`
        : `Rellena los detalles del nuevo ${isService ? 'servicio' : 'producto'}.`);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${isSystemProduct ? 'sm:max-w-[700px]' : 'sm:max-w-[1200px]'} max-h-[90vh] overflow-y-auto`}>
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <p className="text-sm text-muted-foreground">{dialogSubtitle}</p>
        </DialogHeader>

        {loadingDetail ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="grid gap-6 py-4">
            {isSystemProduct && (
              <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800/30 rounded-lg p-4">
                <p className="text-sm text-yellow-700 dark:text-yellow-400">
                  Este es un producto del sistema y no puede ser modificado. Solo puedes cambiar sus cuentas contables.
                </p>
              </div>
            )}

            {!isSystemProduct && (<>
            {/* Fila 1: Toggle servicio + Unidad (solo producto) + Impuesto + Impuesto incluido */}
            <div className="bg-muted/30 dark:bg-slate-800/30 p-4 rounded-lg">
              <div className={`grid gap-4 ${(isService || isCombinationMode) ? 'grid-cols-3' : 'grid-cols-4'}`}>
                {!isCombinationMode && (
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={isService}
                      onCheckedChange={setIsService}
                    />
                    <Label className="cursor-pointer text-sm" onClick={() => setIsService(!isService)}>
                      Es un servicio (sin inventario)
                    </Label>
                  </div>
                )}
                {!isService && (
                  <div className="space-y-1">
                    <Label className="text-xs">Unidad de medida <span className="text-red-500">*</span></Label>
                    <Select
                      options={unitOptions}
                      value={unitId}
                      onChange={setUnitId}
                      placeholder={unitsLoading ? 'Cargando...' : 'Seleccionar unidad'}
                      searchable
                      disabled={unitsLoading}
                    />
                  </div>
                )}
                <div className="space-y-1">
                  <Label className="text-xs">Impuesto <span className="text-red-500">*</span></Label>
                  <TaxSelect
                    value={taxId}
                    valueLabel={taxLabel}
                    onChange={(val, label, _data) => {
                      setTaxId(val);
                      setTaxLabel(label);
                    }}
                    isTax={true}
                  />
                </div>
                <div className="flex items-end gap-3 pb-1">
                  <Switch
                    checked={taxIncluded}
                    onCheckedChange={setTaxIncluded}
                  />
                  <Label className="cursor-pointer text-sm" onClick={() => setTaxIncluded(!taxIncluded)}>
                    Impuesto incluido en precio
                  </Label>
                </div>
              </div>
            </div>

            {/* Fila 2: Imagen + Nombre / Barcode / Categoría / Descripción */}
            <div className="flex gap-4">
              {/* Imagen */}
              <div className="shrink-0">
                <Label className="text-xs mb-1 block">Imagen</Label>
                <div
                  className="relative w-[100px] h-[100px] rounded-lg border-2 border-dashed border-gray-300 dark:border-slate-600 flex items-center justify-center overflow-hidden cursor-pointer hover:border-orange-400 dark:hover:border-orange-500 transition-colors"
                  onClick={() => !imageUploading && imageFileRef.current?.click()}
                >
                  {imageUploading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                  ) : imagePreviewLoading ? (
                    <div className="w-full h-full bg-gray-200 dark:bg-slate-700 animate-pulse" />
                  ) : imagePreviewSrc ? (
                    <>
                      <img src={imagePreviewSrc} alt="Producto" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setImagePath(null); }}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </>
                  ) : (
                    <div className="text-center">
                      <Camera className="h-5 w-5 text-gray-400 dark:text-slate-500 mx-auto mb-0.5" />
                      <span className="text-[10px] text-gray-500 dark:text-slate-400">Subir imagen</span>
                    </div>
                  )}
                </div>
                <input
                  ref={imageFileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </div>

              {/* Campos principales */}
              <div className="flex-1 grid grid-cols-3 gap-4 content-start">
                <div className="space-y-1">
                  <Label>Nombre <span className="text-red-500">*</span></Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={isService ? 'Ej: Consultoría Legal' : 'Ej: Laptop Gamer XYZ'}
                    autoFocus
                  />
                </div>
                <div className="space-y-1">
                  <Label>Código de barras <span className="text-red-500">*</span></Label>
                  <div className="flex gap-1">
                    <Input
                      value={barcode}
                      onChange={(e) => setBarcode(e.target.value)}
                      placeholder="Código único"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={generateRandomBarcode}
                      title="Generar código aleatorio"
                    >
                      <Shuffle className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={downloadBarcodePng}
                      disabled={!barcode}
                      title="Descargar código de barras PNG"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Categoría <span className="text-red-500">*</span></Label>
                  <CategorySelect
                    value={categoryId}
                    valueLabel={categoryLabel}
                    onChange={(val, label) => {
                      setCategoryId(val);
                      setCategoryLabel(label);
                    }}
                  />
                </div>
                <div className="col-span-3 space-y-1">
                  <Label>Descripción</Label>
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={isService ? 'Detalles del servicio...' : 'Detalles del producto...'}
                  />
                </div>
              </div>
            </div>

            {/* Fila 3: Costo + Costeo + Precio + Cuenta ingresos (servicio) */}
            <div className={`grid gap-4 ${isService ? (showAccounting ? 'grid-cols-3' : 'grid-cols-1') : 'grid-cols-4'}`}>
              {!isService && (
                <>
                  <div className="space-y-1">
                    <Label>Costo <span className="text-red-500">*</span></Label>
                    <NumericInput
                      value={cost}
                      onChange={(e) => setCost(e.target.value)}
                      currency
                      allowNegative={false}
                    />
                    <p className="text-xs text-muted-foreground">Costo inicial del producto.</p>
                  </div>
                  <div className="space-y-1">
                    <Label>Método de costeo</Label>
                    <Select
                      options={COSTING_OPTIONS}
                      value={costingType}
                      onChange={setCostingType}
                      placeholder="Seleccionar"
                    />
                    <p className="text-xs text-muted-foreground">Cómo se calcula el costo.</p>
                  </div>
                </>
              )}
              {/* Servicio: cuenta de ingresos en esta fila */}
              {isService && showAccounting && (
                <div className="space-y-1">
                  <Label>Cuenta de ingresos <span className="text-red-500">*</span></Label>
                  <AccountSelect
                    value={revenueAccountCode}
                    valueLabel={revenueAccountLabel}
                    onChange={(code, account) => {
                      setRevenueAccountCode(code);
                      setRevenueAccountLabel(account ? `${account.code} - ${account.name}` : '');
                    }}
                    excludePrefixes="1110,1105"
                    showCreateButton
                    placeholder="Seleccionar cuenta de ingresos"
                  />
                </div>
              )}
              <div className="space-y-1">
                <Label>Precio de venta <span className="text-red-500">*</span></Label>
                <NumericInput
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  currency
                  allowNegative={false}
                />
              </div>
            </div>
            </>)}

            {/* Cuentas contables — productos no-servicio, o productos del sistema */}
            {showAccounting && (!isService || isSystemProduct) && (
              <div className="bg-muted/10 dark:bg-slate-800/20 p-4 rounded-lg">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label>Cuenta de inventario <span className="text-red-500">*</span></Label>
                    <AccountSelect
                      value={assetAccountCode}
                      valueLabel={assetAccountLabel}
                      onChange={(code, account) => {
                        setAssetAccountCode(code);
                        setAssetAccountLabel(account ? `${account.code} - ${account.name}` : '');
                      }}
                      excludePrefixes="1110,1105"
                      showCreateButton
                      placeholder="Seleccionar cuenta de inventario"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Cuenta de costos <span className="text-red-500">*</span></Label>
                    <AccountSelect
                      value={cogsAccountCode}
                      valueLabel={cogsAccountLabel}
                      onChange={(code, account) => {
                        setCogsAccountCode(code);
                        setCogsAccountLabel(account ? `${account.code} - ${account.name}` : '');
                      }}
                      excludePrefixes="1110,1105"
                      showCreateButton
                      placeholder="Seleccionar cuenta de costos"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Cuenta de ingresos <span className="text-red-500">*</span></Label>
                    <AccountSelect
                      value={revenueAccountCode}
                      valueLabel={revenueAccountLabel}
                      onChange={(code, account) => {
                        setRevenueAccountCode(code);
                        setRevenueAccountLabel(account ? `${account.code} - ${account.name}` : '');
                      }}
                      excludePrefixes="1110,1105"
                      showCreateButton
                      placeholder="Seleccionar cuenta de ingresos"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Opciones de atributo — solo modo combinación (nunca sistema) */}
            {!isSystemProduct && isCombinationMode && assignedAttributes.length > 0 && (
              <div className="bg-orange-50/50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800/30 p-4 rounded-lg">
                <Label className="text-sm font-medium mb-3 block">
                  Opciones de atributo <span className="text-red-500">*</span>
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  {assignedAttributes.map(attr => (
                    <div key={attr.id} className="flex items-center gap-3">
                      <span className="text-sm text-gray-600 dark:text-slate-300 min-w-[120px] truncate font-medium">{attr.name}</span>
                      <SearchableSelect
                        options={attr.options.map(o => ({ value: o.id, label: o.name }))}
                        value={selectedOptions[attr.id] || ''}
                        onChange={v => setSelectedOptions(prev => ({ ...prev, [attr.id]: v }))}
                        placeholder="Seleccionar..."
                        className="flex-1"
                        clearable
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isCombinationMode && assignedAttributes.length === 0 && !loadingParent && (
              <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800/30 p-4 rounded-lg text-center">
                <p className="text-sm text-yellow-700 dark:text-yellow-400">
                  Este producto padre no tiene atributos asignados. Asigna atributos primero desde el tab de combinaciones.
                </p>
              </div>
            )}

            {/* Acciones */}
            <div className="flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-slate-700">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || (isCombinationMode && assignedAttributes.length === 0)}
                className={isCombinationMode ? 'bg-orange-600 hover:bg-orange-700 text-white' : undefined}
              >
                {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                {editing ? 'Guardar' : 'Crear'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
