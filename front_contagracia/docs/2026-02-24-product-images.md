# Imágenes de productos y combinaciones — Frontend

**Fecha:** 2026-02-24

## Resumen

Se agregó soporte de imágenes para productos y combinaciones: upload en el form, thumbnails en listas y detalle.

## Cambios

### 1. Tipos (`src/modules/inventory/types/index.ts`)

- `ProductListItem` — `image_path: string | null`
- `CreateProductData` — `image_path?: string | null`
- `UpdateProductData` — `image_path?: string | null`
- `CombinationListItem` — `image_path: string | null`
- `CreateCombinationItem` — `image_path?: string | null`, cuentas contables aceptan `null`
- `StockSummaryItem` — `image_path: string | null`

### 2. Componente reutilizable `ProductThumbnail`

**Archivo:** `src/modules/inventory/components/ProductThumbnail.tsx` (nuevo)

- Props: `imagePath`, `size` (default 32), `className`
- Usa `useAuthImage` para cargar imagen con JWT
- Estados: skeleton (loading), imagen (src), fallback (icono Package gris)

### 3. ProductForm — Upload de imagen

**Archivo:** `src/modules/inventory/components/ProductForm.tsx`

- Zona de imagen 100x100 integrada al lado izquierdo de nombre/barcode/categoría/descripción
- Upload a media-service con `category: product_image`
- Preview con `useAuthImage`, botón X para eliminar
- Validación frontend: JPEG/PNG/WebP, max 5MB
- `image_path` incluido en payload de create/update
- Descripción movida dentro del grid de campos principales (col-span-3)

### 4. ProductDetail — Header con imagen real

**Archivo:** `src/modules/inventory/components/ProductDetail.tsx`

- Si el producto tiene `image_path`, muestra `ProductThumbnail` de 40px en lugar del icono genérico Package/Wrench
- Fallback: icono original coloreado por tipo (producto/servicio/inactivo)

### 5. ProductInfoTab — Imagen en sección General

**Archivo:** `src/modules/inventory/components/ProductInfoTab.tsx`

- Thumbnail de 80px con `row-span-3` integrado en el grid de la sección General
- Solo se muestra si hay imagen, sin afectar el layout cuando no hay

### 6. ProductsList — Thumbnails en filas

**Archivo:** `src/modules/inventory/components/ProductsList.tsx`

- Thumbnail 32px junto al nombre del producto (fila principal)
- Thumbnail 28px junto al nombre de combinación (filas expandidas, jerárquico)
- Usa `ProductThumbnail` para evitar N hooks en el mismo componente

### 7. CombinationsTab — Columna de imagen

**Archivo:** `src/modules/inventory/components/CombinationsTab.tsx`

- Nueva columna al inicio de la tabla con thumbnail 32px por combinación

### 8. StockByStorageTab — Thumbnail en nombre

**Archivo:** `src/modules/inventory/components/StockByStorageTab.tsx`

- Thumbnail 28px junto al nombre en cada fila de stock

### 9. ProductForm — Fix backfill cuentas contables al reabrir

**Archivo:** `src/modules/inventory/components/ProductForm.tsx`

**Bug:** Las cuentas contables (inventario, costos, ingresos) se precargaban correctamente la primera vez que se abría el form de creación, pero al cerrarlo y reabrirlo ya no aparecían.

**Causa raíz:** Problema de ordenamiento de `useEffect` en React. Los effects se ejecutan en orden de declaración. Al reabrir (`open` → `true`):
1. El backfill effect (declarado primero) corría primero → veía `didBackfill.current = true` (del ciclo anterior) → saltaba
2. El load-data effect (declarado después) corría después → llamaba `resetForm()` que ponía `didBackfill.current = false` → pero ya era tarde

**Fix:** Nuevo `useEffect` que detecta cuando `open` pasa a `false` (dialog se cierra) y resetea `didBackfill.current = false` y `prevIsServiceRef.current = null`. Declarado ANTES del backfill effect para que los refs estén limpios al reabrir.

## Layout del ProductForm

```
┌─────────────────────────────────────────────────────────┐
│ [Toggle servicio] [Unidad] [Impuesto] [Imp. incluido]  │  ← Fila 1 (bg muted)
├────────┬────────────────────────────────────────────────┤
│        │ [Nombre]     [Barcode 🔀📥]    [Categoría]     │  ← Fila 2
│ 📷     │ [Descripción ──────────────────────────────]   │
│ 100x100│                                                │
├────────┴────────────────────────────────────────────────┤
│ [Costo]  [Método costeo]  [Precio venta]  (+cuenta srv) │  ← Fila 3
├─────────────────────────────────────────────────────────┤
│ [Cuenta inventario] [Cuenta costos] [Cuenta ingresos]   │  ← Contabilidad (si aplica)
├─────────────────────────────────────────────────────────┤
│ [Atributo 1: opción ▼] [Atributo 2: opción ▼]          │  ← Combinación (si aplica)
├─────────────────────────────────────────────────────────┤
│                                    [Cancelar] [Guardar] │
└─────────────────────────────────────────────────────────┘
```
