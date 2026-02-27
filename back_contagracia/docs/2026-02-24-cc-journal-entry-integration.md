# Integración Centro de Costos con Asientos Manuales - Backend

**Fecha:** 2026-02-24

## Resumen

Cuando la compañía tiene el módulo `cost_centers` activo, cada línea de un asiento manual requiere centro de costos y tipo de movimiento. Al guardar, se crean movimientos de CC vinculados a los items del asiento.

## Cambios

### create-journal-entry.ts (shared-modules + accounting-service/src/functions/)

Nuevos campos en `JournalEntryItemInput`:
- `cost_center_id?: string`
- `cost_center_movement_type_key?: string`

La creación del item ahora incluye `cost_center_id` en el Prisma create.

### journal-entries.service.ts — método create()

**Validación pre-transacción (si hasModule 'cost_centers'):**
- Todas las líneas requieren `cost_center_id` y `cost_center_movement_type_key`
- Validar que cada CC exista y esté activo (`is_active: true`)
- Validar que cada tipo de movimiento exista en `CostCenterMovementType`

**Creación de movimientos dentro de la transacción (paso 7b):**
- Para cada línea con CC, llama a `createCostCenterMovement()` de shared-modules
- Sign se determina por el `nature` del tipo de movimiento (ver abajo)
- `reference_type_key`: siempre `'journal_entry'` para asientos manuales
- `reference_id`: ID del asiento creado
- Vincula el JE item con el CC movement via `cost_center_movement_id` (composite key match con consumo)

**Líneas de ajuste por redondeo:** NO requieren CC (se agregan dentro de la transacción y el loop las omite por `!cost_center_id`).

### schema-tenant.prisma — CostCenterMovementType

Nuevo campo `nature` (`JournalEntryItemType`, default `DEBIT`):
```prisma
model CostCenterMovementType {
  key    String                @id
  name   String
  nature JournalEntryItemType  @default(DEBIT)
  ...
}
```

Cada tipo tiene una naturaleza contable (DEBIT o CREDIT). El sign del movimiento se calcula:
```
sign = (item.type === movementType.nature) ? 'POSITIVE' : 'NEGATIVE'
```

Ejemplo:
- `expense` (nature: DEBIT) + línea DEBIT → POSITIVE (gasto real para el CC)
- `tax_iva` (nature: CREDIT) + línea CREDIT → POSITIVE (IVA generado)
- `tax_iva` (nature: CREDIT) + línea DEBIT → NEGATIVE (IVA al costo, reduce CC)

### costCenterMovementTypes.ts (seeder)

20 tipos (se eliminó `discount`, redundante con income/expense):

| Tipo | Nature | Descripción |
|------|--------|-------------|
| income | CREDIT | Ingreso |
| cost | DEBIT | Costo |
| expense | DEBIT | Gasto |
| tax_iva | CREDIT | IVA |
| tax_inc | CREDIT | INC |
| withholding_income | CREDIT | ReteFuente |
| withholding_iva | CREDIT | ReteIVA |
| withholding_ica | CREDIT | ReteICA |
| cxc | DEBIT | Cuentas por Cobrar |
| cxp | CREDIT | Cuentas por Pagar |
| bank_movement | DEBIT | Movimiento Bancario |
| cash_movement | DEBIT | Movimiento de Caja |
| prepayment_customer | CREDIT | Anticipo de Cliente |
| prepayment_supplier | DEBIT | Anticipo de Proveedor |
| prepayment_employee | DEBIT | Anticipo de Empleado |
| period_close | CREDIT | Cierre de Periodo |
| opening_balance | DEBIT | Saldos Iniciales |
| tax_settlement | CREDIT | Liquidación de Impuesto |
| reconciliation_adjustment | DEBIT | Ajuste de Conciliación |
| other | DEBIT | Otro |

### seed-all-tenants.ts

Upsert de `costCenterMovementType` ahora incluye `nature` en create y update.

### cost-centers.service.ts + projections.service.ts

`getMovementTypes()` ahora devuelve `{ key, name, nature }` (mapeado para evitar TS2742).

## Notas

- NO se modificó la función `createJournalEntry` de shared-modules en su lógica — solo se extendió la interfaz y el Prisma create.
- La detección del módulo usa `tenantContext.hasModule(companyId, 'cost_centers')`.
- Los reversals NO requieren CC (se manejan por `reverseJournalEntry` que crea su propio asiento inverso).
