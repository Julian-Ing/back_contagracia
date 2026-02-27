# Vista de Movimientos de Centro de Costos - Frontend

**Fecha:** 2026-02-24

## Resumen

Nueva vista para consultar movimientos de un centro de costos con filtros, busqueda fuzzy, paginacion y totales.

## Archivos creados

### `modules/cost-centers/components/CostCenterMovements.tsx`

Componente principal con:
- Header con nombre/consecutivo del CC y boton "Volver"
- Filtros: busqueda fuzzy (debounce 400ms), tipo movimiento (SearchableSelect), tipo referencia (SearchableSelect), signo (SearchableSelect), rango de fechas (inputs date)
- Tabla con columnas: fecha, tipo (badge), referencia, signo (+/-), monto (FormattedNumber), descripcion, ref ID
- Totales al pie: positivos, negativos, neto (calculados con Decimal.js)
- Paginacion estandar (20 registros por pagina)

### `app/dashboard/cost-centers/[id]/movements/page.tsx`

Pagina Next.js con ProtectedRoute (`cost_centers.view`).

## Archivos modificados

### `modules/cost-centers/types/index.ts`

Nuevos tipos:
- `MovementType` — { key, name }
- `CostCenterMovement` — datos completos del movimiento con type y reference_type
- `CostCenterMovementsResponse` — respuesta paginada con costCenter info
- `CostCenterMovementsFilters` — parametros de busqueda

### `modules/cost-centers/services/costCenters.service.ts`

Nuevos metodos:
- `getMovementTypes()` — GET /cost-centers/movement-types
- `getMovementReferenceTypes()` — GET /cost-centers/movement-reference-types
- `getMovements(costCenterId, params)` — GET /cost-centers/:id/movements

### `modules/cost-centers/index.ts`

Export de `CostCenterMovements`.

### `modules/cost-centers/components/CostCentersList.tsx`

- Import de `useRouter` y `ArrowRightLeft` icon
- Boton "Ver movimientos" en cada fila del arbol que navega a `/dashboard/cost-centers/[id]/movements`

## Navegacion

No se agrega entrada en el menu de navegacion. Se accede desde el arbol de centros de costos via el boton de movimientos (icono ArrowRightLeft).

## Otros cambios incluidos

### navigation.ts
- Submenu "Centros" renombrado a "Centro de Costos"

### CostCentersList.tsx — mejoras UX
- Switch de inactivos reemplazado por SearchableSelect con 3 opciones: Activos, Inactivos, Todos
- Botones de accion siempre visibles (sin hover)
