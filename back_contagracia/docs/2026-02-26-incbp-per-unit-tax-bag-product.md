# INCBP — Impuesto por Unidad + Producto Bolsa + Guards AIU

**Fecha**: 2026-02-26

## Resumen

Soporte para impuestos calculados **por unidad** (`qty × per_unit_amount`) en lugar de porcentuales (`net_amount × rate / 100`). El tipo de cálculo es automático: `tax_type_id = 10` (INC Bolsas) siempre es por unidad; todo lo demás es porcentual. No hay toggle de usuario.

Incluye: producto de sistema "Bolsa Plástica", guards para productos/categorías de sistema, y filtros en TaxSelect.

## Schema

### Tax
- `per_unit_amount Decimal? @db.Decimal(19, 4)` — monto fijo por unidad (solo tax_type_id=10)

### DocumentItemTax
- `per_unit_amount Decimal? @db.Decimal(19, 4)` — snapshot auditoría del monto por unidad

### Product
- `is_bag Boolean @default(false)` — flag para producto bolsa de sistema

### ProductCategory
- `is_bag Boolean @default(false)` — flag para categoría bolsa de sistema

## Backend

### Tax Service (`tax-service`)
- DTOs: `per_unit_amount` opcional en create/update
- Validación automática: si `tax_type_id === 10` → `per_unit_amount` requerido, `rate` forzado a 0
- `findForSelect()` retorna `per_unit_amount`
- `findAll()`, `findOne()`, `create()`, `update()` retornan `per_unit_amount`

### Documents Service (`invoicing-service`)
- `create()` y `update()`: lookup `per_unit_amount` del tax, calcula `qty × per_unit_amount` para per-unit
- `tax_included` no aplica para impuestos per-unit (precio siempre es raw)
- Guarda snapshot `per_unit_amount` en `DocumentItemTax`
- `tax_details` JSON incluye `per_unit_amount`
- `findOne()` retorna `tax_per_unit_amount` y `tax_name` formateado (`$75/ud` o `19%`)

### Products Service (`inventory-service`)
- **Guards update()**: `is_aiu || is_bag` → solo permite editar cuentas contables (`asset_account_code`, `cogs_account_code`, `revenue_account_code`). Cualquier otro campo → error 400.
- **Guards delete()**: `is_aiu || is_bag` → error 400
- **findForSelect()**: excluye `is_bag: false` (bolsa no aparece en select de productos)
- **findOne()**: tax select incluye `per_unit_amount`
- **mapItem()**: `tax_name` formateado, incluye `tax_per_unit_amount`

### Categories Service (`inventory-service`)
- **Guards update/delete**: `is_aiu || is_bag` → error 400 (bloqueo total, categorías no tienen cuentas)

## Frontend

### TaxSelect (`tax-select.tsx`)
- `TaxOption.per_unit_amount: number | null`
- `TaxSelectChangeData.perUnitAmount: number | null`
- Display: `($75/ud)` para per-unit, `(19%)` para porcentual
- `handleClear` incluye `perUnitAmount: null`

### DocumentItemsTable (`DocumentItemsTable.tsx`)
- `ItemLine.tax_per_unit_amount: number | null`
- `calcLineTotals()`: per-unit = `qty × per_unit_amount`, porcentual = `net_amount × rate / 100`
- `tax_included` solo aplica a porcentuales
- TaxSelect: `excludeTypeIds={[10]}` para excluir INCBP del select general
- Items bolsa (`product_id === 'bag-plastic'`): tax locked (no editable)
- Botón "Bolsa" (`ShoppingBag` icon): agrega producto bolsa con `getOne('bag-plastic')`

### TaxFormModal (`TaxFormModal.tsx`)
- `isPerUnit = parseInt(taxTypeId, 10) === 10` — automático al seleccionar tipo INC Bolsas
- Si per-unit: muestra "Monto por Unidad ($)", oculta "Tasa %"
- Si porcentual: muestra "Tasa %" como siempre
- Submit: per-unit → `rate: 0, per_unit_amount`; porcentual → `rate`, sin `per_unit_amount`

### Types (`taxes/types/index.ts`)
- `Tax.per_unit_amount: number | null`
- `CreateTaxData.per_unit_amount?: number`
- `UpdateTaxData.per_unit_amount?: number | null`

### DocumentDetailView
- `tax_name` se muestra directo (ya formateado por backend), sin duplicar `(rate%)`

### Tipos invoicing (`invoicing/types/index.ts`)
- `DocumentDetailItem.tax_per_unit_amount: number | null`

### Products service frontend (`products.service.ts`)
- `ForSelectItem.tax_per_unit_amount: number | null`

## Seeds

### PUC
- `41350503` — "Venta de bolsas plásticas" (bajo `413505`)

### Accounting Config
- `finance_bag_revenue` → `41350503`

### Tax
- id=7, code=`22-75`, name=`INCBP $75/bolsa`, rate=0, per_unit_amount=75, tax_type_id=10

### Bag Product
- Categoría: id=`bag-category`, name="Bolsas Plásticas", `is_bag: true`
- Producto: id=`bag-plastic`, name="Bolsa Plástica", price=0, `is_bag: true`, `is_service: true`, tax_id=7, revenue_account_code=`41350503`

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `schema-tenant.prisma` | +per_unit_amount en Tax/DocumentItemTax, +is_bag en Product/ProductCategory |
| `tax-service/.../create-tax.dto.ts` | +per_unit_amount |
| `tax-service/.../update-tax.dto.ts` | +per_unit_amount |
| `tax-service/.../taxes.service.ts` | Validación per-unit, findForSelect, mappings |
| `invoicing-service/.../documents.service.ts` | Cálculo per-unit en create/update, findOne mapping |
| `inventory-service/.../products.service.ts` | Guards flexibles, findForSelect, findOne, mapItem, mapProductItem (+is_aiu, is_bag) |
| `inventory-service/.../categories.service.ts` | Guards is_bag, findAll mapping (+is_bag) |
| `seeds/taxes.ts` | +INCBP $75 |
| `seeds/bagProducts.ts` | **NUEVO** — categoría + producto bolsa |
| `seeds/seed-puc.ts` | +41350503 |
| `seeds/seed-accounting-config.ts` | +finance_bag_revenue |
| `scripts/seed-all-tenants.ts` | Import bag, upsert bag, per_unit_amount en tax upsert |
| `front/.../tax-select.tsx` | per_unit_amount en types, display, onChange |
| `front/.../DocumentItemsTable.tsx` | tax_per_unit_amount, calcLineTotals, botón Bolsa, excludeTypeIds |
| `front/.../DocumentForm.tsx` | tax_per_unit_amount en mapDetailItems |
| `front/.../DocumentDetailView.tsx` | tax_name directo |
| `front/.../TaxFormModal.tsx` | isPerUnit automático, campo monto por unidad |
| `front/.../taxes.service.ts` | Return type getForSelect |
| `front/.../taxes/types/index.ts` | per_unit_amount en Tax, Create, Update |
| `front/.../invoicing/types/index.ts` | tax_per_unit_amount en DocumentDetailItem |
| `front/.../products.service.ts` | tax_per_unit_amount en ForSelectItem |
