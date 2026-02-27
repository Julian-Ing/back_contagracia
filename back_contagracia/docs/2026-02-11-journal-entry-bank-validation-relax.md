# Relajar validación de banco en asientos contables

**Fecha:** 2026-02-11

## Problema

La función `createJournalEntry` requería obligatoriamente `bank_account_id` en líneas con cuentas 1110* (Bancos) y 1105* (Caja). Si una empresa no tenía correctamente configurados los bancos con sus cuentas contables, el asiento fallaba y no se creaba.

## Cambio

**Archivo:** `accounting-service/src/functions/create-journal-entry.ts`

### Antes
- 1110* **requería** `bank_account_id` de tipo NO CASH
- 1105* **requería** `bank_account_id` de tipo CASH
- Otras cuentas no podían tener `bank_account_id`

### Ahora
- 1110* y 1105* **no requieren** `bank_account_id` (es opcional)
- Si se proporciona `bank_account_id`:
  - En 1110* → debe ser tipo NO CASH (bancos)
  - En 1105* → debe ser tipo CASH (caja)
- Otras cuentas siguen sin poder tener `bank_account_id`

## Razón

Los asientos automáticos (anticipos, recibos, etc.) pueden no tener banco asociado si la empresa no configuró correctamente la relación entre cuentas contables y cuentas bancarias. Con este cambio, el asiento se crea sin problemas y el movimiento bancario se maneja por separado.
