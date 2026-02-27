# Kardex + Campo fecha en ajustes manuales y transferencias

**Fecha:** 2026-02-23

## Resumen

1. Endpoint Kardex para ver historial de movimientos de un producto
2. Endpoint para listar tipos de movimiento
3. Campo `date` seleccionable en ajustes manuales de stock (se pasa a moveStock y createJournalEntry)
4. Campo `date` en modelo ProductTransfer (schema + migration) y flujo completo

---

## 1. Kardex

### Endpoints

#### `GET /products/movement-types`

Retorna todos los tipos de movimiento (ProductMovementType).

```json
[
  { "key": "sale", "name": "Venta" },
  { "key": "purchase", "name": "Compra" },
  { "key": "adjustment", "name": "Ajuste manual" },
  ...
]
```

#### `GET /products/:id/kardex`

Historial de movimientos del producto con paginacion, busqueda fuzzy y filtro por tipo.

**Query params:**
- `search`: busqueda fuzzy (consecutivo, notas, referencia, tipo, bodega)
- `type_key`: filtro por tipo de movimiento (ej: `sale`, `adjustment`)
- `page`: pagina (default 1)
- `limit`: items por pagina (default 15)

**Respuesta:**

```json
{
  "items": [
    {
      "id": "uuid",
      "consecutive": "IM-0001",
      "type_key": "adjustment",
      "type_name": "Ajuste manual",
      "direction": "IN",
      "quantity": 10,
      "date": "2026-02-23",
      "storage": { "id": "uuid", "name": "Principal", "warehouse_name": "Almacen Principal" },
      "reference_id": null,
      "reference_consecutive": null,
      "notes": "Ajuste por conteo fisico",
      "created_at": "2026-02-23T..."
    }
  ],
  "total": 25,
  "page": 1,
  "limit": 15,
  "totalPages": 2
}
```

### Frontend (`KardexTab`)

- Tab visible para productos Y servicios
- Busqueda fuzzy con debounce (300ms)
- `SearchableSelect` con tipos de movimiento
- Paginacion (15 items/pagina)
- Si el producto es servicio: muestra "Servicio" en vez de cantidad
- Badges de direccion: verde (Entrada), rojo (Salida)
- Columna "Referencia" NO se muestra (es dato interno)

---

## 2. Campo `date` en ajustes manuales

### Backend

- `AdjustStockDto`: campo `date?: string` (formato yyyy-MM-dd, validado con `@IsDateString`)
- `adjustStock()`: parsea con `new Date(dto.date + 'T00:00:00')` para evitar desfase de timezone
- Se pasa a `moveStock({ date })` y `createJournalEntry({ date })` (valida periodo contable abierto)
- Si no se envia, usa `new Date()` (hoy)

### Frontend

- `DatePicker` en `AdjustStockDialog`, default hoy, no clearable
- Se envia como `date: 'yyyy-MM-dd'` en el body del POST

---

## 3. Campo `date` en transferencias

### Schema

```prisma
model ProductTransfer {
  ...
  date DateTime @default(now()) @db.Date
  ...
}
```

Migration aplicada con `migrate-all-tenants.ts`.

### Backend

- `CreateProductTransferDto`: campo `date?: string` (formato yyyy-MM-dd)
- `create()`: parsea con `new Date(dto.date + 'T00:00:00')`, default `new Date()`
- `approve()`: pasa `transfer.date` a todos los `moveStock()` calls
- `mapTransfer()`: incluye `date` en la respuesta

### Frontend

- `DatePicker` en `CreateProductTransferDialog` (junto a Razon, grid 2 columnas)
- `ProductTransfersTab`: tabla y detalle muestran `date` en vez de `created_at`
- Tipo `ProductTransferItem`: campo `date: string` agregado
- Tipo `CreateProductTransferData`: campo `date?: string` agregado

---

## Archivos modificados

### Backend
- `contagracia-shared-modules/prisma/schema-tenant.prisma` (date en ProductTransfer)
- `inventory-service/src/modules/products/products.service.ts` (getKardex, getMovementTypes, date en adjustStock)
- `inventory-service/src/modules/products/products.controller.ts` (endpoints kardex, movement-types)
- `inventory-service/src/modules/products/dto/adjust-stock.dto.ts` (campo date)
- `inventory-service/src/modules/product-transfers/dto/create-product-transfer.dto.ts` (campo date)
- `inventory-service/src/modules/product-transfers/product-transfers.service.ts` (date en create, approve, mapTransfer)

### Frontend
- `src/modules/inventory/types/index.ts` (KardexItem, KardexResponse, ProductMovementTypeItem, date en transfers)
- `src/modules/inventory/services/products.service.ts` (getKardex, getMovementTypes, date en adjustStock)
- `src/modules/inventory/components/KardexTab.tsx` (componente completo)
- `src/modules/inventory/components/ProductDetail.tsx` (kardex tab para servicios, isService prop)
- `src/modules/inventory/components/AdjustStockDialog.tsx` (DatePicker)
- `src/modules/inventory/components/CreateProductTransferDialog.tsx` (DatePicker)
- `src/modules/inventory/components/ProductTransfersTab.tsx` (date en tabla y detalle)
