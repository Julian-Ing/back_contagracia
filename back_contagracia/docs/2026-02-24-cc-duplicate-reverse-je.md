# Centro de Costos en Duplicar y Reversar Asientos

**Fecha:** 2026-02-24

## Resumen

Se agrega soporte de centro de costos (CC) a los flujos de duplicar y reversar asientos contables. Ambos ahora copian `cost_center_id` y `cost_center_movement_type_key` de los items originales y crean CC movements en el nuevo asiento.

## Archivos modificados

### `accounting-service/src/modules/journal-entries/journal-entries.service.ts`

**`duplicate()`:**
- El select de items ahora incluye `cost_center_id` y `cost_center_movement.type_key`
- `duplicateItems` copia ambos campos del original
- Después de crear el JE, si `hasCostCentersModule`: carga natures, crea CC movements, vincula a JE items

**`reverse()` y `reverseComplete()`:**
- Cargan `hasCostCentersModule` via `tenantContext.hasModule`
- Lo pasan a `reverseJournalEntry` como parámetro opcional

### `accounting-service/src/functions/reverse-journal-entry.ts`

- **`ReverseJournalEntryParams`**: nuevo campo `hasCostCentersModule?: boolean`
- El select de items ahora incluye `cost_center_id` y `cost_center_movement.type_key`
- `reversalItems` copia ambos campos (con el type ya invertido DEBIT↔CREDIT)
- **Nuevo paso 8**: si `hasCostCentersModule`, crea CC movements inversos (el sign se determina por el type invertido vs nature del movement type)
- Vincula cada CC movement al JE item correspondiente

### `accounting-service/src/functions/void-payment-receipt-with-journal-entry.ts`

- **`VoidPRWithJEParams`**: nuevo campo `hasCostCentersModule?: boolean`
- Pasa el flag a `reverseJournalEntry`

### `accounting-service/src/modules/payment-receipts/payment-receipts.service.ts`

- `reversePaymentReceipt` y `editPaymentReceipt`: pasan `hasCostCentersModule` a `voidPaymentReceiptWithJournalEntry`

## Notas

- El flag `hasCostCentersModule` es opcional — callers que no lo pasan (prepayments, periods) mantienen comportamiento anterior (sin CC movements)
- La lógica de CC movements es idéntica en ambos flujos: cargar natures → determinar sign → crear movement → vincular a JE item
