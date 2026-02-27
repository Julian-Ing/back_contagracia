# Correcciones formulario de productos

**Fecha:** 2026-02-21

## 1. SKU → Código de barras
- Tipos: `sku` → `barcode` en ProductListItem, CreateProductData, UpdateProductData, TopSellingItem
- ProductForm: Label "Código de barras *", variable `barcode`
- ProductsList: Columna "Cód. Barras", placeholder búsqueda actualizado
- Generador aleatorio sin prefijo SKU

## 2. Botón descargar código de barras PNG
- Dependencia: `jsbarcode` + `@types/jsbarcode`
- Genera PNG con formato CODE128, fondo transparente
- Botón `Download` al lado del generador aleatorio

## 3. Label "Impuesto incluido en precio"
- Cambiado de "IVA incluido" (el impuesto no siempre es IVA)

## 4. Unidad de medida
- Asterisco requerido visible
- Símbolo null no se muestra (`Unidades` en vez de `Unidades (null)`)
- No envía `unit_id` para servicios (DB asigna "70" por default)

## 5. Keys de accounting_config corregidas
- `inventory_asset` → `inventory_products`
- `inventory_cogs` → `inventory_product_costs`
- `inventory_revenue_product` → `inventory_product_revenue`
- `inventory_revenue_service` → `inventory_service_revenue`

## 6. Validación cuentas contables
- Servicio: Solo requiere cuenta de ingresos
- Producto: Requiere inventario + costos + ingresos

## Archivos modificados
- `src/modules/inventory/types/index.ts`
- `src/modules/inventory/components/ProductForm.tsx`
- `src/modules/inventory/components/ProductsList.tsx`
- `package.json` / `pnpm-lock.yaml` — jsbarcode + @types/jsbarcode
