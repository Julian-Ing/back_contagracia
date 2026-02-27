# Sistema de Consecutivos

## Descripcion
Sistema centralizado para manejar todos los consecutivos/secuencias del ERP. Cada tipo de documento tiene su propio consecutivo configurable por tenant.

## Tablas

### consecutive_types (Master y Tenant)
Catalogo maestro de tipos de consecutivos.

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| type | text PK | Identificador unico (invoice, purchase, journal_entry, etc.) |
| default_prefix | text | Prefijo por defecto (FV, CO, JE, etc.) |
| description | text | Descripcion legible (Factura de Venta, Compra, etc.) |

### consecutives (Solo Tenant)
Consecutivos por empresa, inicializado desde consecutive_types.

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| type | text PK/FK | FK a consecutive_types.type |
| last_number | integer | Ultimo numero usado (inicia en 0) |
| prefix | text | Prefijo (inicializado con default_prefix, editable) |

## Tipos de Consecutivos (35 total)

### Documentos Venta
- `invoice`: FV - Factura de Venta
- `invoice_credit_note`: NC - Nota Credito Venta
- `invoice_debit_note`: ND - Nota Debito Venta
- `invoice_recurrent`: FVR - Factura Recurrente

### Documentos Compra/Gasto
- `purchase`: CO - Compra
- `purchase_credit_note`: NCC - Nota Credito Compra
- `expense`: GA - Gasto
- `expense_credit_note`: NCG - Nota Credito Gasto
- `expense_recurrent`: GAR - Gasto Recurrente
- `purchase_order`: OC - Orden de Compra
- `reception`: RC - Recepcion de Mercancia

### Cotizaciones
- `quote_sale`: CTV - Cotizacion de Venta
- `quote_crm`: CTC - Cotizacion CRM

### Contabilidad
- `journal_entry`: JE - Asiento Contable
- `payment_receipt`: REC - Recibo de Caja
- `disbursement`: CE - Comprobante de Egreso
- `receivable_payment`: RP - Pago Recibido
- `payable_payment`: PP - Pago Realizado
- `prepayment`: AT - Anticipo
- `bank_reconciliation`: BC - Conciliacion Bancaria
- `bank_reconciliation_adjustment`: BCA - Ajuste Conciliacion

### Inventario
- `inventory_item`: ART - Articulo de Inventario
- `inventory_attribute`: ATR - Atributo de Inventario
- `inventory_movement`: IM - Movimiento de Inventario
- `product_attribute_option`: OPC - Opción de Atributo
- `storage_transfer`: TI - Traslado entre Bodegas
- `storage`: BOD - Bodega
- `warehouse`: ALM - Almacen

### Activos Fijos
- `fixed_asset`: ACT - Activo Fijo
- `fixed_asset_movement`: AFM - Movimiento de Activo Fijo

### Caja
- `cash_register`: CA - Caja Registradora
- `cash_session`: SC - Sesion de Caja
- `cash_movement`: MC - Movimiento de Caja

### Otros
- `expense_legalization`: LG - Legalizacion de Viaticos
- `payroll`: NOM - Nomina

## Flujo de Inicializacion

1. **Seed Master**: `seed-catalogs.ts` inserta los 35 tipos en `consecutive_types` de master
2. **Creacion Tenant**: `tenant.service.ts` en `replicateParametrics()`:
   - Copia `consecutive_types` desde master
   - Inicializa `consecutives` con `last_number=0` y `prefix=default_prefix`
3. **Seed Tenants Existentes**: `seed-all-tenants.ts` hace lo mismo para tenants ya creados

## Uso (Ejemplo)

```typescript
// Obtener siguiente consecutivo para factura
const result = await prisma.$queryRaw`
  UPDATE consecutives
  SET last_number = last_number + 1
  WHERE type = 'invoice'
  RETURNING prefix || '-' || LPAD(last_number::text, 6, '0') as consecutive
`;
// Resultado: "FV-000001"
```

## Archivos Relacionados

- `prisma/schema-master.prisma` - Modelo ConsecutiveType
- `prisma/schema-tenant.prisma` - Modelos ConsecutiveType y Consecutive
- `prisma/seeds/consecutiveTypes.ts` - Datos de seed
- `prisma/seeds/seed-catalogs.ts` - Seed para master
- `prisma/scripts/seed-all-tenants.ts` - Seed para tenants
- `company-service/src/modules/tenant/tenant.service.ts` - Replicacion a nuevos tenants
