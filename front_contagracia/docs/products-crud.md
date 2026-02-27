# Productos y Servicios — Frontend

**Fecha:** 2026-02-20

## Ubicación

- **Ruta:** `/dashboard/inventory` (tab "Productos y Servicios")
- **Módulo:** `src/modules/inventory/`

## Componentes

### ProductsList (`components/ProductsList.tsx`)

Lista principal con vista jerárquica (padres + combinaciones expandibles).

**Filtros:**
- SearchableSelect `view_mode`: Todos (jerárquico) / Solo productos / Solo combinaciones
- SearchableSelect `typeFilter`: Productos y Servicios / Solo productos / Solo servicios
- Input búsqueda fuzzy por nombre, SKU, código

**Características:**
- Vista jerárquica: expand/collapse con ChevronRight/ChevronDown
- Combinaciones anidadas bajo su padre con indentación visual
- Badge con count de combinaciones por producto
- Atributos mostrados como badges en vista de combinaciones
- Paginación (50 por página)
- FormattedNumber para precio/costo

**Permisos:**
- `inventory.items.create` — Botón "Crear"
- `inventory.items.edit` — Botón editar en cada fila

### ProductForm (`components/ProductForm.tsx`)

Dialog para crear/editar productos y servicios.

**Layout:** `sm:max-w-[1200px]`, grids horizontales de 3-5 columnas.

**Estructura:**
1. Fila toggle: Switch servicio + Unidad (solo producto) + Impuesto + IVA incluido
2. Fila datos: Nombre + SKU (con generador aleatorio) + Categoría
3. Fila precios: Descripción + Costo (solo producto) + Tipo costeo (solo producto) + Cuenta ingresos (solo servicio, inline) + Precio
4. Sección cuentas (solo producto, bg-muted): Cuenta inventario + Cuenta costo de ventas + Cuenta ingresos (grid-cols-3)

**Condicionales servicio vs producto:**
- Servicios ocultan: unidad, costo, tipo costeo, cuenta inventario, cuenta costo ventas
- Servicios muestran: solo cuenta de ingresos (inline en fila de precios)
- Productos muestran: los 3 AccountSelects en sección separada

**Pre-carga cuentas contables:**
- Al crear, se pre-cargan desde `accountingConfigService.getByKey()`:
  - Producto: `inventory_asset`, `inventory_cogs`, `inventory_revenue_product`
  - Servicio: `inventory_revenue_service`
- Al cambiar toggle servicio/producto, se re-cargan las cuentas
- Controlado por `useRef` (didBackfill, prevIsServiceRef)

**AccountSelect:** `excludePrefixes="1110,1105"`, `showCreateButton`, clearable

## Archivos

### Creados
- `src/modules/inventory/components/ProductsList.tsx`
- `src/modules/inventory/components/ProductForm.tsx`
- `src/modules/inventory/services/products.service.ts`

### Modificados
- `src/modules/inventory/types/index.ts` — Tipos Product*, Create/UpdateProductData
- `src/modules/inventory/index.ts` — Exports agregados
- `src/app/dashboard/inventory/page.tsx` — ProductsList integrado con permisos
