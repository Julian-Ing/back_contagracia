# Vista de Movimientos de Centro de Costos - Backend

**Fecha:** 2026-02-24

## Resumen

Se agregan 3 endpoints al modulo existente de cost-centers para consultar movimientos de centro de costos con busqueda fuzzy, filtros y paginacion.

## Cambios

### cost-centers.controller.ts

- `GET /cost-centers/movement-types` — Lista tipos de movimiento (CostCenterMovementType)
- `GET /cost-centers/movement-reference-types` — Lista tipos de referencia (CostCenterMovementReferenceType)
- `GET /cost-centers/:id/movements` — Movimientos paginados con filtros

Query params del endpoint de movimientos:
- `search` — busqueda fuzzy en description (ILIKE + word_similarity > 0.3)
- `type_key` — filtro por tipo de movimiento
- `reference_type_key` — filtro por tipo de referencia
- `from_date`, `to_date` — rango de fechas (movement_date)
- `sign` — POSITIVE | NEGATIVE
- `page`, `limit` — paginacion (default page=1, limit=20)

### cost-centers.service.ts

Nuevos metodos:
- `getMovementTypes(companyId)` — findMany CostCenterMovementType ordenado por key
- `getMovementReferenceTypes(companyId)` — findMany CostCenterMovementReferenceType ordenado por key
- `findMovements(companyId, costCenterId, params)` — busqueda paginada con fuzzy search y filtros

### migrate-all-tenants.ts (shared-modules)

Nuevo indice GIN para busqueda fuzzy:
```sql
CREATE INDEX IF NOT EXISTS idx_ccm_description_trgm ON "cost_center_movements" USING GIN (description gin_trgm_ops)
```

## Respuesta del endpoint de movimientos

```json
{
  "data": [
    {
      "id": "uuid",
      "cost_center_id": "uuid",
      "movement_date": "2026-01-15T00:00:00.000Z",
      "type_key": "budget",
      "reference_type_key": "journal_entry",
      "sign": "POSITIVE",
      "amount": "1000.0000",
      "description": "...",
      "reference_id": "uuid | null",
      "created_at": "...",
      "type": { "key": "budget", "name": "Presupuesto" },
      "reference_type": { "key": "journal_entry", "name": "Asiento Contable" }
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 20,
  "totalPages": 3,
  "hasMore": true,
  "costCenter": { "id": "uuid", "name": "CC Name", "consecutive": "CC-001" }
}
```

## Notas

- Las rutas estaticas (`movement-types`, `movement-reference-types`) se declaran ANTES de `:id` para evitar conflictos de rutas en NestJS.
- El endpoint de movimientos incluye el `costCenter` (name + consecutive) en la respuesta para mostrar en el header del frontend.

## Otros cambios incluidos

### Permiso cost_centers.movements.view
- Agregado en `prisma/seeds/modules/actions/cost_centers.ts` (ahora 12 permisos)

### auth-service — fix RealtimeModule
- `auth.module.ts`: importa `RealtimeModule` para resolver inyeccion de `RealtimePublisherService`
- `shared-realtime/src/*.js`: recompilados (faltaban metodos nuevos como `notifySessionDisplaced`)

### Workspace
- `pnpm-workspace.yaml`: desactivados media-service, inventory-service, electronic-documents-service; activado accounting-service
- `package.json`: dev:all actualizado para reflejar servicios activos
