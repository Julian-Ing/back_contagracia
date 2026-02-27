# Agregar `cost_center_movement_type_key` a JournalEntryItem

**Fecha:** 2026-02-25

## Problema

`cost_center_movement_type_key` fluia como parametro por el sistema pero NO se persistia en `JournalEntryItem` — solo en `PaymentReceiptLine`. Esto causaba:
1. `reverseJournalEntry` debia navegar la relacion `cost_center_movement` para recuperar el `type_key` (fragil)
2. No habia dato historico directo del tipo CC que aplico a cada linea del asiento
3. Reportes futuros (cierre de periodo, balances por CC) requieren joins extra

Ademas, `adjustStock` (inventory-service) no tenia soporte CC aunque el frontend ya lo envia.

## Cambios

### Schema (`schema-tenant.prisma`)
- `JournalEntryItem`: campo `cost_center_movement_type_key String?` + relacion `cost_center_movement_type` a `CostCenterMovementType`
- `CostCenterMovementType`: relacion inversa `journal_entry_items JournalEntryItem[]`

### `createJournalEntry` (shared-modules)
- Ahora persiste `cost_center_movement_type_key` en el `create` de items (el campo ya existia en `JournalEntryItemInput`)

### `reverseJournalEntry` (accounting-service)
- Lee `cost_center_movement_type_key` directo del JE item en vez de navegar `cost_center_movement.type_key`

### `create-payment-receipt-with-journal-entry` (accounting-service)
- Pasa `cost_center_movement_type_key: line.cost_center_movement_type_key` al construir JE items

### `prepayments.service.ts` — create (accounting-service)
- Calcula `ccTypeKey` ANTES de `createJournalEntry` y lo pasa a ambos items del JE
- Elimina duplicacion del mapa `ccTypeKeyMap` (ahora se reutiliza en CC movements)

### `prepayments.service.ts` — refundPrepayment (accounting-service)
- Mismo patron: calcula `refundCcTypeKey` antes del JE y lo pasa a ambos items
- Elimina duplicacion del mapa `ccTypeKeyMap`

### `bank-accounts.service.ts` — saldo inicial (accounting-service)
- Pasa `cost_center_movement_type_key` (derivado de `ccMtKey` ya existente) a ambos items del JE

### Inventory `adjustStock` — soporte CC completo (inventory-service)
- **DTO**: `cost_center_id?: string` y `cost_center_path?: string[]`
- **Service**:
  - Verifica modulo `cost_centers`
  - Tipo CC: `'income'` para IN (sobrante), `'cost'` para OUT (merma)
  - Pasa `cost_center_id` + `cost_center_movement_type_key` a items del JE
  - Crea CC movements (DEBIT + CREDIT sides) vinculados a JE items
  - Import de `createCostCenterMovement` desde shared-modules

### Limpieza de seeds CC

Los asientos de cierre/apertura son reclasificaciones contables, NO movimientos operacionales de CC. Los reportes CC de un período solo deben mostrar movimientos reales filtrados por fecha.

- **CC Movement Types eliminados**: `period_close`, `opening_balance`
- **CC Reference Types eliminado**: `accounting_period`
- **Seed script**: agrega `deleteMany` para limpiar estos keys en tenants existentes
- **JE types** (`period_close`, `opening_balance`): intactos — siguen siendo tipos de asiento válidos

## Archivos modificados

- `contagracia-shared-modules/prisma/schema-tenant.prisma`
- `contagracia-shared-modules/src/functions/create-journal-entry.ts`
- `accounting-service/src/functions/reverse-journal-entry.ts`
- `accounting-service/src/functions/create-payment-receipt-with-journal-entry.ts`
- `accounting-service/src/modules/prepayments/prepayments.service.ts`
- `accounting-service/src/modules/bank-accounts/bank-accounts.service.ts`
- `inventory-service/src/modules/products/dto/adjust-stock.dto.ts`
- `inventory-service/src/modules/products/products.service.ts`
- `contagracia-shared-modules/prisma/seeds/costCenterMovementTypes.ts`
- `contagracia-shared-modules/prisma/seeds/costCenterMovementReferenceTypes.ts`
- `contagracia-shared-modules/prisma/scripts/seed-all-tenants.ts`
