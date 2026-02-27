# Projections CRUD — Backend

**Fecha:** 2026-02-24
**Servicio:** accounting-service
**Módulo:** `src/modules/projections/`

## Schema

Se agregó campo `include_sub_centers Boolean @default(false)` al modelo `Projection` para indicar si la proyección abarca los subcentros del centro de costos seleccionado.

**Projection:** id, parent_id?, cost_center_id?, scope (GLOBAL|COST_CENTER), include_sub_centers, consecutive (PRJ-XXXX), name, description?, start_date, end_date

**ProjectionItem:** id, projection_id, type_key (FK → CostCenterMovementType), amount. Unique: [projection_id, type_key]

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/projections/movement-types` | Lista tipos de movimiento (CostCenterMovementType) |
| GET | `/projections` | Lista paginada con filtros (search, scope, cost_center_id) |
| GET | `/projections/:id` | Detalle con items, children, parent, cost_center |
| POST | `/projections` | Crear con items opcionales |
| PUT | `/projections/:id` | Actualizar + reemplazar items |
| DELETE | `/projections/:id` | Eliminar (error si tiene hijos) |

## Query params (GET /projections)

- `search` — búsqueda por name, consecutive, description (ILIKE)
- `page` / `limit` — paginación
- `scope` — filtro: GLOBAL | COST_CENTER
- `cost_center_id` — filtro por centro de costos

## Validaciones (create)

- `scope=COST_CENTER` requiere `cost_center_id`
- `scope=GLOBAL` no permite `cost_center_id`
- `start_date < end_date`
- Si tiene `parent_id`, las fechas del hijo deben estar dentro del rango del padre
- Items: no se permiten `type_key` duplicados, todos deben existir en CostCenterMovementType
- Consecutivo generado con `getNextConsecutive(tx, 'projection')` → PRJ-XXXX

## Validaciones (update)

- Puede actualizar name, description, fechas, include_sub_centers
- No puede cambiar scope ni cost_center_id (inmutables post-creación)
- Si se envían items, reemplaza todos (deleteMany + createMany)

## Validaciones (delete)

- Si tiene children (sub-proyecciones) → error 400
- Si no → hard delete (cascade borra items)

## Archivos creados

- `projections/dto/create-projection.dto.ts`
- `projections/dto/update-projection.dto.ts`
- `projections/dto/index.ts`
- `projections/projections.service.ts`
- `projections/projections.controller.ts`
- `projections/projections.module.ts`
- `app.module.ts` — agregado ProjectionsModule

## Permisos

Se agregó `cost_centers.projections.view` al seed de acciones (`cost_centers.ts`).
