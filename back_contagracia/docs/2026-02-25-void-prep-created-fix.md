# Fix: anular anticipos creados (PREP_CREATED) al reversar asiento manual

**Fecha:** 2026-02-25

## Bug

Al reversar un asiento manual que creaba anticipos (`PREP_CREATED_CLIENT/SUPPLIER/EMPLOYEE`),
`voidPaymentReceipt` anulaba correctamente:
- Payments (CXC_PAID/CXP_PAID) → restauraba ArAp balances
- PrepaymentMovements (PREP_USED) → restauraba Prepayment balances
- ArAps creados (CXC_CREATED/CXP_CREATED) → marcaba como VOIDED
- Bank movements → creaba inversos

Pero **NO anulaba los Prepayments creados** (PREP_CREATED), dejando anticipos huerfanos en estado ACTIVE.

## Fix

### `void-payment-receipt.ts`
- Agrega paso 5b: filtra lineas con `kind === 'PREP_CREATED'`
- Valida que el anticipo no este REFUNDED
- Valida que no tenga movimientos activos de otras fuentes (`journal_entry_id != receipt.journal_entry_id`)
- Marca Prepayment como VOIDED
- Agrega `prepayments_voided` a `VoidPaymentReceiptResult`

### `journal-entries.service.ts` — duplicate()
- Corrige lectura de CC type key: usa `cost_center_movement_type_key` directo en vez de navegar `cost_center_movement.type_key`

## Archivos modificados

- `accounting-service/src/functions/void-payment-receipt.ts`
- `accounting-service/src/modules/journal-entries/journal-entries.service.ts`
