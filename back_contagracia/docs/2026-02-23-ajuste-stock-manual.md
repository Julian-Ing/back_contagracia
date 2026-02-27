# Ajuste Manual de Stock

**Fecha:** 2026-02-23

## Resumen

Endpoint para ajustar stock de un producto manualmente (entrada o salida), con registro en kardex, soporte para bodegas si la empresa tiene `inventory_management`, y generacion automatica de asiento contable si tiene `accounting`.

## Endpoint

`POST /api/products/:id/adjust-stock`

### Body

```json
{
  "direction": "IN" | "OUT",
  "quantity": 10,
  "reason": "Ajuste por conteo fisico",
  "storage_id": "uuid (opcional, requerido si tiene inventory_management)",
  "counterpart_account_code": "424520 (opcional, cuenta contrapartida para el asiento)"
}
```

### Respuesta

```json
{
  "consecutive": "IM-0001",
  "newProductStock": 50,
  "newStorageStock": 30
}
```

## Validaciones

### DTO (`AdjustStockDto`)
- `direction`: debe ser `IN` o `OUT`
- `quantity`: numero mayor a 0 (min 0.0001)
- `reason`: string no vacio, requerido
- `storage_id`: string opcional
- `counterpart_account_code`: string opcional (cuenta contable contrapartida)

### Logica (`moveStock()` en shared-modules)
1. Producto debe existir y estar activo
2. Si `hasInventoryManagement` y producto no es servicio: `storage_id` requerido
3. Bodega debe existir, estar activa, y su almacen debe estar activo
4. Si hay `userId`: el usuario debe tener acceso al almacen (WarehouseUser)
5. Actualiza `Product.stock` (increment/decrement)
6. Upsert `StorageStock` si aplica
7. Crea `ProductMovement` (kardex) con consecutivo `IM-xxxx` y `type_key: 'adjustment'`

### Frontend (`AdjustStockDialog`)
- Si la empresa tiene `inventory_management`: muestra selectores de almacen y bodega
- Si la empresa tiene `accounting`: muestra selector de cuenta contrapartida (AccountSelect)
- Bodega requerida si tiene el modulo
- Cantidad > 0 y motivo requerido para habilitar boton
- Toggle visual entre Entrada (verde) y Salida (rojo)
- Al cambiar direccion, la cuenta contrapartida se precarga segun el config:
  - IN: `inventory_surplus_income` (424520 - Ganancias por sobrantes)
  - OUT: `inventory_shrinkage_cost` (613595 - Mermas y ajustes)

## Integracion contable

Si la empresa tiene modulo `accounting` y el costo del producto > 0, se genera un asiento contable automatico dentro de la misma transaccion.

### Cuentas

- **Cuenta inventario**: `product.asset_account_code` del producto, o fallback a config `inventory_products`
- **Cuenta contrapartida**: la enviada en `counterpart_account_code`, o fallback al config segun direccion

### Accounting Config keys

| Key | Descripcion | Default |
|-----|-------------|---------|
| `inventory_surplus_income` | Ganancias por sobrantes de inventarios | 424520 |
| `inventory_shrinkage_cost` | Otros costos - mermas y ajustes de inventario | 613595 |

### PUC (cuentas agregadas)

| Codigo | Nombre | Tipo | Padre |
|--------|--------|------|-------|
| 4245 | Recuperaciones y ajustes de inventario | INCOME | 42 |
| 424520 | Ganancias por sobrantes de inventarios | INCOME | 4245 |
| 613595 | Otros costos - mermas y ajustes de inventario | COST | 6135 |

### Ajuste de entrada (IN)
- Debito: cuenta de inventario del producto (aumenta activo)
- Credito: `inventory_surplus_income` / 424520 (ganancia por sobrante)
- Valor: cantidad * costo unitario del producto

### Ajuste de salida (OUT)
- Debito: `inventory_shrinkage_cost` / 613595 (costo por merma)
- Credito: cuenta de inventario del producto (disminuye activo)
- Valor: cantidad * costo unitario del producto

### Asiento contable
- `type_key: 'inventory'` (Movimientos Manuales de Inventario)
- `reference_id`: ID del ProductMovement (kardex)
- Usa `createJournalEntry()` de shared-modules (valida periodo abierto, cuentas, etc.)

### Efecto en costo
- El ajuste NO cambia el costo del producto (no es una compra)

## Flujo completo

```
Usuario abre detalle de producto -> "Ajustar stock"
  -> Selecciona IN/OUT, cuenta contrapartida, cantidad, motivo, bodega
  -> POST /api/products/:id/adjust-stock
    -> adjustStock() en products.service.ts ($transaction)
      1. Carga costo y asset_account_code del producto
      2. moveStock() -> stock + kardex
      3. Si tiene accounting y costo > 0:
         - Resuelve cuenta inventario (producto o config)
         - Resuelve cuenta contrapartida (dto o config segun direccion)
         - createJournalEntry() -> asiento contable
```

## Permisos

- Requiere accion `products.adjust_stock` (via canCreateAdjustment en frontend)
- El boton "Ajustar stock" solo aparece para productos (no servicios)

## Archivos modificados

- `contagracia-shared-modules/index.js` (exports de moveStock, createJournalEntry, etc.)
- `contagracia-shared-modules/index.ts` (exports TS)
- `contagracia-shared-modules/src/functions/create-journal-entry.ts` (copiado de accounting-service)
- `contagracia-shared-modules/src/functions/validate-period-open.ts` (copiado de accounting-service)
- `contagracia-shared-modules/prisma/seeds/seed-puc.ts` (cuentas 4245, 424520, 613595)
- `contagracia-shared-modules/prisma/seeds/seed-accounting-config.ts` (inventory_surplus_income, inventory_shrinkage_cost)
- `inventory-service/src/modules/products/dto/adjust-stock.dto.ts` (counterpart_account_code)
- `inventory-service/src/modules/products/products.service.ts` (asiento contable en adjustStock)
- `front_contagracia/src/modules/inventory/components/AdjustStockDialog.tsx` (AccountSelect)
- `front_contagracia/src/modules/inventory/services/products.service.ts` (counterpart_account_code)
