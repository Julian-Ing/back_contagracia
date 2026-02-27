# Centro de Costos por Línea en Recibos de Caja / Comprobantes de Egreso

**Fecha:** 2026-02-24

## Resumen

Se agrega soporte de centro de costos (CC) por línea en recibos de caja (RECEIVABLE) y comprobantes de egreso (PAYABLE), replicando la funcionalidad que ya existía en asientos manuales. Solo aplica si la compañía tiene el módulo `cost_centers` activo.

## Schema

**Modelo `PaymentReceiptLine`** — 2 campos nuevos + 2 FK:

```prisma
cost_center_id                String?
cost_center_movement_type_key String?

cost_center                   CostCenter?              @relation(...)
cost_center_movement_type     CostCenterMovementType?  @relation(...)
```

**Lados inversos** agregados en `CostCenter` y `CostCenterMovementType`:
```prisma
payment_receipt_lines  PaymentReceiptLine[]
```

## Archivos modificados

### `contagracia-shared-modules/prisma/schema-tenant.prisma`
- Campos `cost_center_id`, `cost_center_movement_type_key` en `PaymentReceiptLine`
- Relaciones FK a `CostCenter` y `CostCenterMovementType`
- Índice en `cost_center_id`
- Relación inversa `payment_receipt_lines` en ambos modelos

### `accounting-service/src/functions/create-payment-receipt.ts`
- `CreatePaymentReceiptLineInput`: campos `cost_center_id?`, `cost_center_movement_type_key?`
- Se pasan al `tx.paymentReceipt.create`

### `accounting-service/src/functions/create-payment-receipt-with-journal-entry.ts`
- `CreatePRWithJELineInput`: campos `cost_center_id?`, `cost_center_movement_type_key?`
- `CreatePRWithJEParams`: campo `hasCostCentersModule?`
- Se pasa `cost_center_id` a cada JE item
- **Nuevo paso 5g**: si `hasCostCentersModule`, crea CC movements (misma lógica que `journal-entries.service.ts`):
  1. Carga natures de `CostCenterMovementType`
  2. Para cada línea con CC: determina sign (POSITIVE/NEGATIVE), crea movement vía `createCostCenterMovement`, vincula al JE item

### `accounting-service/src/modules/payment-receipts/payment-receipts.service.ts`
- **DTO**: `cost_center_id?`, `cost_center_movement_type_key?` en `CreatePaymentReceiptLineDto`
- **Validación**: si módulo CC activo, todas las líneas requieren `cost_center_id` y `cost_center_movement_type_key`
- **`createPaymentReceipt` y `editPaymentReceipt`**: pasan CC fields + `hasCostCentersModule` a la función
- **`getOne`**: incluye `cost_center` y `cost_center_movement_type` en el select de líneas

## Tipo de movimiento CC — AUTO vs MANUAL

El tipo de movimiento CC se auto-determina según el kind de la línea:

| Kind | Tipo CC (auto) | Fuente |
|------|---------------|--------|
| DOC (RECEIVABLE) | `cxc` | receipt type |
| DOC (PAYABLE) | `cxp` | receipt type |
| BANK (type=BANK) | `bank_movement` | accountType |
| BANK (type=CASH) | `cash_movement` | accountType |
| PREP_USED (CLIENT) | `prepayment_customer` | prepayment_type |
| PREP_USED (SUPPLIER) | `prepayment_supplier` | prepayment_type |
| PREP_USED (EMPLOYEE) | `prepayment_employee` | prepayment_type |
| **ACCOUNT** | **usuario selecciona** | SearchableSelect |

## Notas

- La reversión de recibos (`voidPaymentReceiptWithJournalEntry`) ya maneja CC movements automáticamente vía la reversión del JE
- Se reutiliza `createCostCenterMovement` de `@contagracia/shared-modules`
- Sin módulo CC activo, el flujo es idéntico al anterior (sin cambios)
