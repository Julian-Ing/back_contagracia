# Transferencias entre Bodegas (Storage Transfers)

**Fecha:** 2026-02-23

## Resumen

CRUD completo de transferencias de stock entre bodegas. Cada línea determina producto, bodega y dirección (IN/OUT). Flujo: PENDING → APPROVED (ejecuta moveStock) o REJECTED (motivo obligatorio).

---

## Schema

### StorageTransfer (cabecera)
- `id`, `consecutive` (TI-xxxx), `reason` (opcional), `date` (@db.Date), `status` (PENDING/APPROVED/REJECTED)
- Audit: `transferred_by`, `approved_by`, `approved_at`, `rejected_by`, `rejected_at`, `rejection_reason`
- Cambio: se quitaron `from_storage_id` y `to_storage_id` de la cabecera, se agregó `date`

### StorageTransferItem (línea)
- `transfer_id`, `product_id`, `storage_id`, `direction` (IN/OUT), `quantity`
- Cambio: se agregaron `storage_id` y `direction` (cada línea define su propia bodega y dirección)

---

## Backend

### Endpoints (`/storage-transfers`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/storage-transfers` | Listar con búsqueda fuzzy, filtro por estado, paginación |
| GET | `/storage-transfers/:id` | Detalle |
| POST | `/storage-transfers` | Crear solicitud (status PENDING) |
| PATCH | `/storage-transfers/:id/approve` | Aprobar (ejecuta moveStock por línea) |
| PATCH | `/storage-transfers/:id/reject` | Rechazar (motivo obligatorio) |

### Query params (GET list)
- `search`: fuzzy por consecutivo, razón, producto, bodega, almacén
- `status`: PENDING, APPROVED, REJECTED
- `page`, `limit`

### DTOs

**CreateStorageTransferDto:**
- `reason: string` (obligatorio)
- `date?: string` (yyyy-MM-dd)
- `items: StorageTransferItemDto[]` (min 2, debe haber al menos 1 IN y 1 OUT)

**StorageTransferItemDto:**
- `product_id: string`
- `storage_id: string` (siempre obligatorio)
- `direction: 'IN' | 'OUT'`
- `quantity: number` (min 0.0001)

**RejectStorageTransferDto:**
- `rejection_reason: string` (obligatorio)

### Validaciones (create)
- Al menos 1 línea OUT y 1 línea IN
- Productos activos, no-servicios
- Bodegas activas
- No transferir mismo producto de y a la misma bodega
- Permite CUALQUIER producto (no restringido a familia como product_transfers)
- Total cantidad salidas debe ser igual a total cantidad entradas
- **Stock suficiente**: agrupa líneas OUT por producto+bodega y valida contra StorageStock. Si el mismo producto sale de la misma bodega en varias líneas, suma las cantidades y valida contra el stock disponible
- **Product transfers**: misma validación — con inventory_management valida StorageStock, sin él valida Product.stock

### Approve
- Ejecuta `moveStock()` por cada línea con `typeKey: 'storage_transfer'`
- `hasInventoryManagement: true` siempre (feature requiere módulo inventory_management)
- No recalcula costos (mismo producto, solo cambia ubicación)

### Fix aplicado a ProductTransfer
- `RejectProductTransferDto.rejection_reason` ahora es obligatorio (era opcional)

### Endpoints for-select (sin paginación)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/products/for-select?is_service=false` | Todos los productos activos (simples + combinaciones) con atributos en el nombre |
| GET | `/attributes/for-select` | Todos los atributos activos con opciones activas |

- `products/for-select`: Retorna `{ value, label, description, mode, is_service }[]`. Combinaciones incluyen opciones de atributos en `label` (ej: "Camiseta — Rojo / L").
- `attributes/for-select`: Retorna `{ id, name, consecutive, options: { id, name }[] }[]`. Solo atributos con al menos 1 opción activa.

---

## Frontend

### Tipos (types/index.ts)
- `StorageTransferItem`, `StorageTransferItemData`, `StorageTransfersResponse`, `CreateStorageTransferData`

### Servicio (storage-transfers.service.ts)
- `getAll()`, `getOne()`, `create()`, `approve()`, `reject()` contra `/storage-transfers`

### Servicio (products.service.ts)
- `getForSelect()`: llama a `/products/for-select` — sin paginación

### Servicio (attributes.service.ts)
- `getForSelect()`: llama a `/attributes/for-select` — sin paginación

### Componentes

**StorageTransfersList:**
- Tabla con búsqueda fuzzy (debounce 300ms), filtro por estado (SearchableSelect), paginación
- Dialog de detalle con info general + tabla de líneas
- Approve/Reject desde el detalle (motivo obligatorio para rechazar)
- Props: `canCreate`, `canApprove`, `canReject`

**CreateStorageTransferDialog:**
- Usa `productsService.getForSelect({ is_service: false })` para cargar productos
- Líneas OUT (salidas) y IN (entradas) lado a lado
- Cada línea: Producto + Bodega + Cantidad
- Razón obligatoria, Fecha obligatoria (default hoy)
- **Validación de stock OUT**: al seleccionar producto, carga stock por bodega (cacheado). Bodegas OUT solo muestran donde hay stock. Muestra "máx X" y error si excede. Varias líneas del mismo producto+bodega comparten el stock disponible.

**CreateProductTransferDialog:**
- Removido `limit: 200` de `getStockSummary()`

**ProductAttributeAssigner:**
- Usa `attributesService.getForSelect()` en lugar de `getAll({ limit: 100 })`

### Integración
- Página dedicada `/dashboard/storage-transfers/page.tsx`
- Permisos: `transfers.view`, `transfers.create`, `transfers.approve`, `transfers.reject`

---

## Permisos (inventory_management)

| Permiso | Descripción |
|---------|-------------|
| `transfers.view` | Ver transferencias |
| `transfers.create` | Crear transferencia |
| `transfers.approve` | Aprobar transferencia |
| `transfers.reject` | Rechazar transferencia |
| `transfers.print` | Imprimir transferencia (futuro) |

---

## Archivos modificados/creados

### Backend
- `contagracia-shared-modules/prisma/schema-tenant.prisma` (StorageTransfer, StorageTransferItem, Storage)
- `inventory-service/src/modules/storage-transfers/` (nuevo módulo completo)
- `inventory-service/src/modules/storage-transfers/dto/create-storage-transfer.dto.ts`
- `inventory-service/src/modules/storage-transfers/dto/reject-storage-transfer.dto.ts`
- `inventory-service/src/modules/storage-transfers/dto/index.ts`
- `inventory-service/src/modules/storage-transfers/storage-transfers.service.ts`
- `inventory-service/src/modules/storage-transfers/storage-transfers.controller.ts`
- `inventory-service/src/modules/storage-transfers/storage-transfers.module.ts`
- `inventory-service/src/app.module.ts` (registro StorageTransfersModule)
- `inventory-service/src/modules/product-transfers/dto/reject-product-transfer.dto.ts` (rejection_reason obligatorio)
- `inventory-service/src/modules/products/products.service.ts` (findForSelect)
- `inventory-service/src/modules/products/products.controller.ts` (GET /products/for-select)
- `inventory-service/src/modules/attributes/attributes.service.ts` (findForSelect)
- `inventory-service/src/modules/attributes/attributes.controller.ts` (GET /attributes/for-select)

### Frontend
- `src/modules/inventory/types/index.ts` (tipos StorageTransfer)
- `src/modules/inventory/services/storage-transfers.service.ts` (nuevo)
- `src/modules/inventory/services/products.service.ts` (getForSelect)
- `src/modules/inventory/services/attributes.service.ts` (getForSelect)
- `src/modules/inventory/components/StorageTransfersList.tsx` (nuevo)
- `src/modules/inventory/components/CreateStorageTransferDialog.tsx` (nuevo, usa for-select)
- `src/modules/inventory/components/CreateProductTransferDialog.tsx` (removido limit hardcodeado)
- `src/modules/inventory/components/ProductAttributeAssigner.tsx` (usa for-select)
- `src/modules/inventory/index.ts` (exports)
- `src/app/dashboard/storage-transfers/page.tsx` (página dedicada)
