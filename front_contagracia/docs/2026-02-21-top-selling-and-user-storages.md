# Top Selling + useUserStorages Hook

**Fecha:** 2026-02-21

## Top Selling (#59)

### Backend (ya existente)
- `GET /products/top-selling?limit=10&from=YYYY-MM-DD&to=YYYY-MM-DD&storage_id=uuid`
- Agrega ventas (direction=OUT, type_key='sale') de `product_movements`
- Retorna: id, consecutive, sku, name, price, is_service, total_quantity, total_movements

### Frontend
- **Tipo:** `TopSellingItem` en `types/index.ts`
- **Servicio:** `productsService.topSelling(params?)` en `products.service.ts`
- Params opcionales: `limit`, `from`, `to`, `storage_id`

## useUserStorages (#60)

### Backend (ya existente)
- `GET /warehouses/me/storages` — retorna almacenes+bodegas del usuario logueado

### Frontend
- **Hook:** `useUserStorages()` en `hooks/useUserStorages.ts`
- **Retorna:**
  - `warehouses`: agrupado por almacén (raw API)
  - `storages`: lista plana con info del almacén (`UserStorageOption[]`)
  - `isLoading`, `error`, `refresh()`
- **Tipos exportados:** `UserStorageOption`, `UserWarehouseGroup`
- Se usa para selects de bodega en movimientos, transferencias, ajustes, etc.

## Archivos modificados
- `src/modules/inventory/types/index.ts` — TopSellingItem
- `src/modules/inventory/services/products.service.ts` — topSelling()
- `src/modules/inventory/hooks/useUserStorages.ts` — nuevo
- `src/modules/inventory/index.ts` — exports
