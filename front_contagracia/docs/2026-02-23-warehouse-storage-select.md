# WarehouseSelect y StorageSelect

**Fecha:** 2026-02-23

## WarehouseSelect

Componente reutilizable para seleccionar almacenes, con busqueda fuzzy y opcion de crear inline.

**Ubicacion:** `shared/components/ui/warehouse-select.tsx`

### Props
- `value` / `valueLabel` — valor controlado
- `onChange(value, label)` — callback de seleccion
- `placeholder` — texto por defecto: "Seleccionar almacen"
- `disabled`, `clearable`, `usePortal`, `className`

### Funcionalidades
- Busqueda fuzzy server-side con `word_similarity` (pg_trgm)
- Debounce 250ms
- Crear almacen inline si tiene permiso `warehouses.create`
- Portal support para posicionamiento en modales
- Auto-selecciona el almacen recien creado

## StorageSelect

Componente reutilizable para seleccionar bodegas, con filtro por almacen, busqueda fuzzy y opcion de crear inline.

**Ubicacion:** `shared/components/ui/storage-select.tsx`

### Props
- `value` / `valueLabel` — valor controlado
- `onChange(value, label, warehouseId?)` — callback con warehouse_id opcional
- `warehouseId` — filtrar bodegas por almacen (opcional)
- `placeholder` — texto por defecto: "Seleccionar bodega"
- `disabled`, `clearable`, `usePortal`, `className`

### Funcionalidades
- Busqueda fuzzy server-side con `word_similarity` (pg_trgm)
- Debounce 250ms
- Si no se pasa `warehouseId`, muestra todas las bodegas con nombre del almacen
- Si se pasa `warehouseId`, filtra y habilita crear bodega inline
- Crear bodega inline si tiene permiso `storages.create` y `warehouseId` proporcionado
- Se resetea al cambiar `warehouseId`

## Backend — Endpoints nuevos

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | `/warehouses/for-select?search=` | Lista ligera de almacenes {id, name} con fuzzy search |
| GET | `/warehouses/storages/for-select?warehouse_id=&search=` | Lista ligera de bodegas {id, name, warehouse_id, warehouse_name} con fuzzy search |

Ambos endpoints usan indices GIN existentes (`idx_wh_name_trgm`, `idx_st_name_trgm`) para `word_similarity`.

## Frontend — Service

Metodos agregados a `warehouses.service.ts`:
- `getWarehousesForSelect(search?)` — GET `/warehouses/for-select`
- `getStoragesForSelect({ warehouse_id?, search? })` — GET `/warehouses/storages/for-select`

## Archivos

### Backend
- `warehouses.controller.ts` — endpoints `for-select` y `storages/for-select`
- `warehouses.service.ts` — metodos `findWarehousesForSelect` y `findStoragesForSelect`

### Frontend
- `shared/components/ui/warehouse-select.tsx` — nuevo componente
- `shared/components/ui/storage-select.tsx` — nuevo componente
- `modules/inventory/services/warehouses.service.ts` — metodos for-select
