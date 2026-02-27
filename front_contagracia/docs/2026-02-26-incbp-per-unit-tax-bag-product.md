# INCBP — Impuesto por Unidad + Producto Bolsa (Frontend)

**Fecha**: 2026-02-26

## Resumen

Soporte frontend para impuestos calculados por unidad (`qty × per_unit_amount`). El tipo de cálculo es automático por `tax_type_id`: 10 (INC Bolsas) = per-unit, todo lo demás = porcentual.

## Cambios

### TaxSelect (`shared/components/ui/tax-select.tsx`)
- `TaxOption` y `TaxSelectChangeData` incluyen `per_unit_amount` / `perUnitAmount`
- Display: `($75/ud)` para per-unit, `(19%)` para porcentual
- `handleClear` incluye `perUnitAmount: null`

### DocumentItemsTable (`invoicing/components/DocumentItemsTable.tsx`)
- `ItemLine.tax_per_unit_amount: number | null`
- `calcLineTotals()`: bifurca cálculo per-unit vs porcentual
- `tax_included` solo aplica a porcentuales
- TaxSelect excluye `tax_type_id=10` del select general
- Items bolsa (`product_id === 'bag-plastic'`): impuesto locked
- Botón "Bolsa" (`ShoppingBag`): agrega bolsa plástica vía `getOne('bag-plastic')`

### TaxFormModal (`taxes/components/TaxFormModal.tsx`)
- Automático: `isPerUnit = parseInt(taxTypeId, 10) === 10`
- Per-unit: muestra "Monto por Unidad ($)", oculta "Tasa %"
- Submit envía `per_unit_amount` + `rate: 0` para per-unit

### Types
- `Tax`, `CreateTaxData`, `UpdateTaxData`: `per_unit_amount`
- `DocumentDetailItem`: `tax_per_unit_amount`
- `ForSelectItem`: `tax_per_unit_amount`

### DocumentDetailView
- `tax_name` se muestra directo (ya formateado por backend)

### DocumentForm
- `mapDetailItems` incluye `tax_per_unit_amount`

### Tipos inventario (`inventory/types/index.ts`)
- `ProductListItem`: agregados `is_aiu`, `is_bag`
- `ProductCategory`: agregado `is_bag`

### ProductForm (`inventory/components/ProductForm.tsx`)
- `isSystemProduct = product.is_aiu || product.is_bag` (detectado desde `getOne`)
- Productos del sistema: solo muestra cuentas contables + banner informativo
- Dialog más angosto (`700px` vs `1200px`) para edición de cuentas
- `handleSave` envía solo campos de cuentas contables para productos del sistema

### ProductDetail (`inventory/components/ProductDetail.tsx`)
- Badge "AIU" / "Bolsa" para productos del sistema
- Botón "Editar cuentas" (solo si `showAccounting`) en lugar de "Editar" para productos del sistema
- Botón "Eliminar" oculto para productos del sistema

### ProductsList (`inventory/components/ProductsList.tsx`)
- Badges AIU / Bolsa junto al nombre del producto en la tabla

### CategoriesList (`inventory/components/CategoriesList.tsx`)
- Badge "Bolsa" para categorías `is_bag`
- Botones editar/eliminar ocultos para categorías `is_bag` (como AIU)

### DocumentForm (`invoicing/components/DocumentForm.tsx`)
- Validación precio: solo rechaza negativos (`price < 0`), permite precio 0
- AIU: al cambiar a operación tipo 09, remueve items bolsa automáticamente + toast
- `handleItemsChange`: filtra items bolsa si está en modo AIU
- Pasa prop `isAIU` a DocumentItemsTable

### DocumentItemsTable (`invoicing/components/DocumentItemsTable.tsx`)
- Prop `isAIU?: boolean`: oculta botón "Bolsa" cuando la factura es AIU
- Celda "Cantidad": `text-left` explícito para alinear "Servicio" a la izquierda
