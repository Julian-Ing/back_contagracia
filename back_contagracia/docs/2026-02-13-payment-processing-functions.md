# Funciones de Procesamiento de Pagos

> Funciones centralizadas para crear y anular pagos, anticipos y recibos de pago.

## Funciones Creadas

### `create-payment.ts` — Crear Pago contra CxC/CxP

**Firma:** `createPayment(tx, params) → CreatePaymentResult`

**Recibe `tx`** (cliente de transacción Prisma).

**Pasos:**
1. Lock ArAp con `FOR UPDATE`
2. Valida: ArAp no VOIDED/PAID, amount > 0, amount <= balance
3. Calcula: newPaid = paid + amount, newBalance = balance - amount
4. Consecutivo según tipo: RECEIVABLE → `receivable_payment` (RP-XXXX), PAYABLE → `payable_payment` (PP-XXXX)
5. Crea Payment con links opcionales (journal_entry_id, payment_receipt_id, etc.)
6. Actualiza ArAp: paid, balance, status (PARTIAL o PAID)

**Retorna:** `{ id, consecutive, new_paid, new_balance, ar_ap_new_status }`

---

### `create-payment-receipt.ts` — Crear Recibo de Pago + Líneas

**Firma:** `createPaymentReceipt(tx, params) → CreatePaymentReceiptResult`

**Recibe `tx`** (cliente de transacción Prisma).

**Pasos:**
1. Consecutivo según tipo: RECEIVABLE → `payment_receipt` (REC-XXXX), PAYABLE → `disbursement` (CE-XXXX), MANUAL → null
2. Crea PaymentReceipt + PaymentReceiptLines en una operación (nested create)

**Líneas soportan:** kind (DOC, BANK, ACCOUNT, PREP_USED, CXC_CREATED, CXP_CREATED), account_code, debit, credit, ref_id, journal_entry_item_id, applied_to_source_key, applied_to_id, company_payment_method_id, description.

**Retorna:** `{ id, consecutive, lines[{ id, kind, ref_id }] }`

---

### `void-payment.ts` — Anular Pago

**Firma:** `voidPayment(tx, { payment_id }) → VoidPaymentResult`

**Pasos:**
1. Lock Payment con `FOR UPDATE`, valida no anulado
2. Marca `is_voided = true`
3. Lock ArAp con `FOR UPDATE`
4. Restaura: paid -= amount, balance += amount
5. Recalcula status: balance == amount original → PENDING, sino PARTIAL

**Retorna:** `{ id, ar_ap_id, amount_restored, new_paid, new_balance, ar_ap_new_status }`

---

### `void-prepayment-movement.ts` — Anular Movimiento de Anticipo

**Firma:** `voidPrepaymentMovement(tx, { prepayment_movement_id }) → VoidPrepaymentMovementResult`

**Pasos:**
1. Lock PrepaymentMovement con `FOR UPDATE`, valida no anulado
2. Lock Prepayment con `FOR UPDATE`
3. Valida que anticipo no esté REFUNDED ni VOIDED
4. Marca movimiento `is_voided = true`
5. Restaura: balance += amount, si estaba APPLIED → vuelve a ACTIVE

**Retorna:** `{ id, prepayment_id, amount_restored, new_balance, prepayment_new_status }`

---

### `void-payment-receipt.ts` — Anular Recibo Completo

**Firma:** `voidPaymentReceipt(tenantContext, companyId, params) → VoidPaymentReceiptResult`

**Recibe `tenantContext` y `companyId`** (maneja su propia transacción + llamadas a createBankMovement).

**Fase 1 — $transaction atómica:**
1. Lock PaymentReceipt `FOR UPDATE`, valida no VOIDED
2. Void todos los Payments del recibo → `voidPayment(tx)` restaura ArAp balances
3. Void PrepaymentMovements de líneas PREP_USED → `voidPrepaymentMovement(tx)` restaura Prepayment balances
4. Void ArAps creados por CXC_CREATED/CXP_CREATED → status VOIDED (valida no tengan pagos activos de otras fuentes)
5. Marca PaymentReceipt status = VOIDED

**Fase 2 — Movimientos bancarios:**
6. Busca movimientos bancarios por journal_entry_id
7. Crea inversos con `createBankMovement` (dirección opuesta, cada uno con su propio lock)

**NO revierte el asiento contable** — eso lo hace el caller con `reverseJournalEntry`.

**Retorna:** `{ id, journal_entry_id, payments_voided, prepayment_movements_voided, ar_aps_voided, bank_movements_reversed }`

---

### `reverse-bank-movements.ts` — Reversar Movimientos Bancarios

**Firma:** `reverseBankMovements(tenantContext, companyId, params) → ReverseBankMovementsResult`

**Pasos:**
1. Busca BankMovements por reference_id + reference_type='journal_entry'
2. Por cada uno llama `createBankMovement` con dirección inversa (INCOME↔EXPENSE)

**Retorna:** `{ movements_reversed }`

---

## Cambios en journal-entries.service.ts

### create() — Paso 8: Procesamiento de pagos

Después de crear el asiento y movimientos bancarios, si hay líneas no-NORMAL:

1. Obtiene JournalEntryItems creados (para mapear IDs)
2. Crea PaymentReceipt tipo MANUAL (sin consecutivo) con líneas por cada item no-NORMAL
3. Por cada CXC_PAID/CXP_PAID → `createPayment` (crea Payment, actualiza ArAp)
4. Por cada PREP_USED → `createPrepaymentMovement` (reduce balance anticipo)

Todo dentro de `$transaction` — si algo falla, se revierte.

### reverseComplete() — Reversión inteligente

Nuevo método que reemplaza la lógica anterior del controller:

1. Busca si el asiento tiene PaymentReceipt activo
2. Siempre: `reverseJournalEntry()` (crea asiento inversión)
3. Si tiene receipt → `voidPaymentReceipt()` (void pagos, anticipos, ArAps, banco)
4. Si no tiene → `createBankMovementsForReversal()` (comportamiento original)

### Controller

`reverse()` ahora llama `reverseComplete()` en vez de manejar la lógica manualmente.

---

## Relaciones de Schema Agregadas

| Modelo | Relación | Apunta a |
|--------|----------|----------|
| JournalEntry | payment_receipts | PaymentReceipt[] |
| JournalEntry | payments | Payment[] |
| JournalEntryItem | payment_receipt_lines | PaymentReceiptLine[] |
| JournalEntryItem | payments | Payment[] |
| PaymentReceipt | journal_entry | JournalEntry? |
| PaymentReceiptLine | journal_entry_item | JournalEntryItem? |
| PaymentReceiptLine | payments | Payment[] |
| Payment | journal_entry | JournalEntry? |
| Payment | journal_entry_item | JournalEntryItem? |
| Payment | payment_receipt_line | PaymentReceiptLine? |

Índices agregados: `journal_entry_id` en PaymentReceipt, `journal_entry_item_id` en PaymentReceiptLine, `journal_entry_id` y `journal_entry_item_id` en Payment.
