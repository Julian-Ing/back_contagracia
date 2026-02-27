# Transferencias entre Productos

**Fecha:** 2026-02-23

## Concepto

Permite transferir stock entre productos de un mismo grupo familiar (padre + combinaciones).
Ejemplo: mover 10 unidades de "Camiseta Roja M" a "Camiseta Azul L" cuando hay exceso de una y falta de otra.

## Flujo

1. **Solicitar** (status PENDING) — no mueve stock, solo registra la intención
2. **Aprobar** (status APPROVED) — ejecuta `moveStock()` por cada línea dentro de una sola transacción
3. **Rechazar** (status REJECTED) — registra quién rechazó y el motivo

## Modelo de datos

### ProductTransfer (cabecera)
- `consecutive` — TP-0001, TP-0002...
- `reason` — texto libre (obligatorio)
- `status` — PENDING | APPROVED | REJECTED
- `requested_by`, `approved_by`, `rejected_by` — TenantUser
- `approved_at`, `rejected_at`, `rejection_reason`

### ProductTransferItem (líneas)
- `product_id` — producto involucrado
- `storage_id` — bodega (opcional, obligatoria si la empresa tiene `inventory_management`)
- `direction` — IN (entrada) o OUT (salida)
- `quantity` — cantidad a transferir

## Permisos

- `inventory.product_transfers.view` — ver tab y listar transferencias
- `inventory.product_transfers.create` — solicitar nueva transferencia
- `inventory.product_transfers.approve_reject` — aprobar o rechazar

## Backend — Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/product-transfers?product_id=&search=&status=&page=&limit=` | Listar (fuzzy search) |
| GET | `/product-transfers/:id` | Detalle |
| POST | `/product-transfers` | Crear solicitud |
| PATCH | `/product-transfers/:id/approve` | Aprobar |
| PATCH | `/product-transfers/:id/reject` | Rechazar |

## Validaciones al crear

- Al menos 1 línea OUT y 1 línea IN
- Todos los productos del mismo grupo familiar (mismo `parent_product_id` o ser el padre)
- No transferir de un producto a sí mismo en la misma bodega
- Productos activos y no servicios
- Si `inventory_management` habilitado → `storage_id` obligatorio por línea

## moveStock() — Función compartida

Ubicación: `contagracia-shared-modules/src/functions/move-stock.ts`

Función reutilizable que recibe `tx` (transacción Prisma) y ejecuta:
1. Valida producto existe y activo
2. Si `hasInventoryManagement` + no servicio → valida bodega activa, almacén activo, acceso usuario
3. Actualiza `Product.stock` (increment/decrement)
4. Upsert `StorageStock` si aplica
5. Crea `ProductMovement` (kardex) con consecutivo IM-xxxx

Parámetros: `tx`, `productId`, `direction`, `quantity`, `typeKey`, `storageId`, `referenceId`, `referenceConsecutive`, `notes`, `date`, `hasInventoryManagement`, `userId`

## Frontend — Tab Transferencias

- Visible en detalle de producto si no es servicio y tiene permiso `view`
- Tabla con: consecutivo, fecha, razón, estado (badge), solicitado por, resumen items
- Búsqueda fuzzy, paginación, filtro por estado
- Click en fila → dialog detalle con líneas (dirección, producto, bodega, cantidad)
- Botones aprobar/rechazar en el detalle si PENDING y tiene permiso `approve_reject`
- Dialog de rechazo con campo de motivo opcional

## Tipos de movimiento de inventario

Se renombró `transfer` → `storage_transfer` y se agregó `product_transfer`:
- `sale`, `sale_credit_note`, `sale_debit_note`, `purchase`, `purchase_credit_note`
- `storage_transfer` — transferencia entre bodegas
- `product_transfer` — transferencia entre productos
- `adjustment` — ajuste manual
