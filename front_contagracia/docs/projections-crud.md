# Projections CRUD — Frontend

**Fecha:** 2026-02-24
**Módulo:** `src/modules/projections/`

## Estructura

```
modules/projections/
├── components/ProjectionsList.tsx
├── services/projections.service.ts
├── types/index.ts
└── index.ts
```

## Página

`app/dashboard/projections/page.tsx`
- ProtectedRoute con `cost_centers.projections.view`
- Permisos granulares: `cost_centers.projections.create/edit/delete`

## Navegación

Centro de Costos ahora es un grupo con children en `config/navigation.ts`:
- **Centros** → `/dashboard/cost-centers` (permission: `cost_centers.view`)
- **Proyecciones** → `/dashboard/projections` (permission: `cost_centers.projections.view`)

## Componente ProjectionsList

- Tabla paginada con búsqueda y filtro por scope (Select)
- Columnas: consecutivo, nombre, scope (badge), centro de costos, periodo, líneas, sub-proyecciones, acciones
- Badge `+sub` cuando `include_sub_centers = true`
- Modal crear/editar:
  - Campos: nombre, descripción, scope (Select), centro de costos (SearchableSelect), incluir subcentros (Switch), fechas
  - Tabla de items: tipo de línea (SearchableSelect) + monto (NumericInput), agregar/quitar filas
  - Scope y centro de costos son inmutables en edición
- ConfirmDialog para eliminar

## Servicio

Usa `accountingClient` con endpoints:
- `getMovementTypes()` → GET `/projections/movement-types`
- `getAll(params)` → GET `/projections`
- `getOne(id)` → GET `/projections/:id`
- `create(data)` → POST `/projections`
- `update(id, data)` → PUT `/projections/:id`
- `delete(id)` → DELETE `/projections/:id`

## Otros cambios

- Fix TS error en `electronic-documents/resolutions/page.tsx`: se pasaba `boolean` donde se esperaba `string` para el filtro `isActive`.
