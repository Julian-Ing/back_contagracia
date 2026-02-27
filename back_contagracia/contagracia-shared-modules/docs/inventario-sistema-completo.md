# Sistema de Inventario Completo

## Descripcion
Se implemento el sistema completo de inventario incluyendo productos, categorias, combinaciones (atributos y opciones), almacenes, bodegas, stock por bodega, movimientos y transferencias.

## Enums Agregados

```prisma
enum ProductMode {
  PRODUCT   // Producto principal
  COMBINATION // Combinación de producto (ej: Camisa Roja M)
}

enum ProductMovementDirection {
  IN   // Entrada
  OUT  // Salida
}

enum StorageTransferStatus {
  PENDING   // Pendiente de aprobacion
  APPROVED  // Aprobada
  REJECTED  // Rechazada
}
```

## Modelos Agregados

### Productos y Categorias

| Modelo | Tabla | Descripcion |
|--------|-------|-------------|
| ProductCategory | product_categories | Categorias de productos |
| Product | products | Productos/articulos/servicios |
| ProductAttribute | product_attributes | Atributos de producto (Talla, Color) |
| ProductAttributeOption | product_attribute_options | Opciones de atributo (S, M, L, Rojo) |
| ProductCombinationAttribute | product_combination_attributes | Junction combinación-opción de atributo |

### Almacenes y Bodegas

| Modelo | Tabla | Descripcion |
|--------|-------|-------------|
| Warehouse | warehouses | Almacenes principales |
| Storage | storages | Bodegas dentro de almacenes |
| StorageUser | storage_users | Usuarios asignados a bodegas |
| StorageStock | storage_stocks | Stock por producto por bodega |

### Movimientos y Transferencias

| Modelo | Tabla | Descripcion |
|--------|-------|-------------|
| ProductMovementType | product_movement_types | Tipos de movimiento (parametrica) |
| ProductMovement | product_movements | Historial de movimientos |
| StorageTransfer | storage_transfers | Cabecera de transferencias |
| StorageTransferItem | storage_transfer_items | Lineas de transferencias |

## Campos de Product

```prisma
model Product {
  id                   String       @id
  consecutive          String       @unique  // ART-0001
  sku                  String?      @unique
  name                 String
  description          String?
  category_id          String?      // FK product_categories
  cost                 Decimal
  price                Decimal
  stock                Decimal      // Stock global
  is_service           Boolean
  mode                 ProductMode  // PRODUCT o COMBINATION
  parent_product_id    String?      // FK products (para combinaciones)
  tax_id               String?
  unit_id              String?
  asset_account_code   String?      // Cuenta inventario
  cogs_account_code    String?      // Cuenta costo ventas
  revenue_account_code String?      // Cuenta ingresos
  is_active            Boolean
  created_at           DateTime
  updated_at           DateTime
}
```

## ProductMovementType Seed

| key | name |
|-----|------|
| sale | Venta |
| sale_credit_note | Nota Credito Venta |
| sale_debit_note | Nota Debito Venta |
| purchase | Compra |
| purchase_credit_note | Nota Credito Compra |
| transfer | Transferencia entre bodegas |
| adjustment | Ajuste manual |

## Flujo de Transferencias

1. Usuario solicita transferencia (status = PENDING)
2. Admin aprueba o rechaza
3. Si aprobada: se crean movimientos de inventario (OUT en origen, IN en destino)
4. Se actualiza storage_stocks

## Relaciones Agregadas a TenantUser

```prisma
model TenantUser {
  // ... campos existentes
  storage_users        StorageUser[]
  transfers_requested  StorageTransfer[] @relation("TransferRequestedBy")
  transfers_approved   StorageTransfer[] @relation("TransferApprovedBy")
  transfers_rejected   StorageTransfer[] @relation("TransferRejectedBy")
}
```

## Archivos Modificados

- `prisma/schema-master.prisma` - Agregado ProductMovementType
- `prisma/schema-tenant.prisma` - Todos los modelos de inventario
- `prisma/seeds/productMovementTypes.ts` - Seeder de tipos de movimiento
- `prisma/seeds/seed-catalogs.ts` - Incluye productMovementTypes
- `prisma/scripts/seed-all-tenants.ts` - Replica productMovementTypes

## Migracion

```bash
pnpm prisma:generate
npx ts-node prisma/scripts/migrate-all-tenants.ts
npx ts-node prisma/scripts/seed-all-tenants.ts --force
```
