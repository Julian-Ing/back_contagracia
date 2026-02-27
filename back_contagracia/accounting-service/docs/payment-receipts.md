# Recibos de Caja y Comprobantes de Egreso

## Arquitectura

### Funciones base (`functions/`)

| Funcion | Responsabilidad |
|---------|----------------|
| `createPaymentReceipt(tx, params)` | Crea PaymentReceipt + lines, asigna consecutivo, valida balance y datos |
| `createPaymentReceiptWithJournalEntry(tx, params)` | Orquesta: receipt + payments + anticipos + bancos + asiento contable + mapeo |
| `createPayment(tx, params)` | Crea Payment contra ArAp, actualiza paid/balance/status con lock FOR UPDATE |
| `createPrepaymentMovement(tx, params)` | Usa anticipo, reduce balance, cambia status si llega a 0 |
| `createBankMovement(tx, params)` | Crea movimiento bancario, actualiza current_balance con lock FOR UPDATE |
| `createJournalEntry(tx, params)` | Crea asiento contable con validaciones (balance, cuentas, periodo) |
| `voidPaymentReceipt(tx, params)` | Anula receipt: void pagos, anticipos, ArAps creados, banco. NO revierte asiento |
| `voidPaymentReceiptWithJournalEntry(tx, params)` | Wrapper: valida periodo + reversa asiento (si contabilidad) + voidPaymentReceipt |
| `reverseJournalEntry(tx, params)` | Crea asiento de reversion (invierte D/C), marca original is_reversed |

### Servicio (`payment-receipts.service.ts`)

El servicio es delgado: valida tipo, obtiene `hasModule('accounting')`, y llama a `createPaymentReceiptWithJournalEntry` dentro de una `$transaction`.

## Tipos de recibo

| Tipo | Consecutivo | Uso |
|------|-------------|-----|
| `RECEIVABLE` | `REC-XXXX` (payment_receipt) | Recibo de Caja - cobra CxC |
| `PAYABLE` | `CE-XXXX` (disbursement) | Comprobante de Egreso - paga CxP |
| `MANUAL` | null | Creado desde asientos manuales (no desde este servicio) |

## Tipos de linea (`PaymentReceiptLineKind`)

| Kind | Descripcion | ref_id | company_payment_method_id |
|------|-------------|--------|--------------------------|
| `DOC` | Pago a documento CxC/CxP | ar_ap_id (obligatorio) | Obligatorio (RECEIVABLE/PAYABLE) |
| `BANK` | Movimiento bancario | bank_account_id (obligatorio) | No aplica |
| `PREP_USED` | Uso de anticipo | prepayment_id (obligatorio) | No aplica |
| `ACCOUNT` | Linea contable miscelanea | Opcional | No aplica |

## Orden de ejecucion en `createPaymentReceiptWithJournalEntry`

```
1. validatePeriodOpen(tx, date)          ← solo si hasAccounting
2. createPaymentReceipt(tx, ...)         ← receipt + lines + consecutivo
   └─ Valida: ≥2 lineas, debitos=creditos, DOC+payment_method, ref_ids
3. createPayment(tx, ...) x cada DOC    ← lock ArAp FOR UPDATE, detecta redondeo
4. createPrepaymentMovement(tx, ...) x cada PREP_USED  ← lock Prepayment FOR UPDATE, detecta redondeo
5. createBankMovement(tx, ...) x cada BANK  ← lock BankAccount FOR UPDATE
6. Si hasAccounting:
   a. Construir items del asiento con actual_amount (monto real post-redondeo)
   b. Agregar lineas de ajuste por redondeo (si las hay) → finance_rounding_income / finance_rounding_expense
   c. createJournalEntry(tx, ...)        ← asiento contable
   d. Mapear receipt lines ↔ JE items   ← por orden de creacion (created_at asc)
   e. UPDATE PaymentReceiptLine.journal_entry_item_id
   f. UPDATE PaymentReceipt.journal_entry_id
   g. UPDATE Payment.journal_entry_id + journal_entry_item_id  ← via receipt line
   h. UPDATE PrepaymentMovement.journal_entry_id
```

## Mapeo receipt lines ↔ JE items

El mapeo se hace **por orden de creacion** (`orderBy: created_at asc`). Las receipt lines y JE items se crean en el mismo orden que las `lines` del request del usuario, por lo que el indice i de la receipt line corresponde al indice i del JE item.

Las lineas de ajuste por redondeo (si las hay) quedan al final del JE sin receipt line correspondiente.

Los **Payments** se mapean a JE items **via su receipt line**, no buscando directo en JE items.

## Edicion

La edicion de un recibo se implementa como **anulacion + creacion** en una sola transaccion atomica.

### Endpoint

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| `PUT` | `/payment-receipts/:id` | Editar recibo (anula actual, crea nuevo en 1 tx) |

### Orden de ejecucion en `editPaymentReceipt`

```
1. voidPaymentReceiptWithJournalEntry(tx, ...)  ← anula recibo actual (restaura saldos)
2. createPaymentReceiptWithJournalEntry(tx, ...)  ← crea nuevo recibo con datos editados
```

Ambas operaciones ocurren en la misma `$transaction`, garantizando atomicidad.

### GET /payment-receipts/:id — campos para edicion

El endpoint `GET` devuelve `ref_current_balance` en cada linea DOC y PREP_USED:
- **DOC**: `ref_current_balance` = saldo actual del ArAp en BD
- **PREP_USED**: `ref_current_balance` = saldo actual del Prepayment en BD

El frontend calcula el maximo disponible para edicion:
```
ref_max_amount = ref_current_balance + sum(montos de todas las lineas con mismo ref_id en este recibo)
```

Esto permite que al editar, los documentos/anticipos que fueron pagados/usados en el recibo original esten disponibles con su saldo restaurado.

## Anulacion / Reversion

### Endpoints

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| `GET` | `/payment-receipts/:id` | Detalle del recibo con lineas enriquecidas (ref_label, account info, ref_current_balance) |
| `POST` | `/payment-receipts/:id/reverse` | Anular recibo (body opcional: `{ reason }`) |

### Orden de ejecucion en `voidPaymentReceiptWithJournalEntry`

```
1. Lock PaymentReceipt FOR UPDATE + validar status != VOIDED
2. Si hasAccounting + journal_entry_id:
   a. validatePeriodOpen(tx, reversal_date)
   b. reverseJournalEntry(tx, ...)  ← crea asiento de reversion
3. voidPaymentReceipt(tx, ...)
   a. voidPayment x cada Payment    ← restaura ArAp.paid/balance/status
   b. voidPrepaymentMovement x cada PREP_USED  ← restaura Prepayment.balance/status
   c. Void ArAps creados (CXC_CREATED/CXP_CREATED)  ← valida sin pagos externos
   d. PaymentReceipt.status = VOIDED
   e. Crea movimientos bancarios inversos
```

### Permisos

### Recibos de Caja (CxC - cobros)

| Accion | Permiso |
|--------|---------|
| Ver recibos de caja | `cash_receipts.view` |
| Crear recibo de caja | `cash_receipts.create` |
| Editar recibo de caja | `cash_receipts.edit` |
| Anular recibo de caja | `cash_receipts.void` |
| Imprimir recibo de caja | `cash_receipts.print` |

### Comprobantes de Egreso (CxP - pagos)

| Accion | Permiso |
|--------|---------|
| Ver comprobantes de egreso | `payment_vouchers.view` |
| Crear comprobante de egreso | `payment_vouchers.create` |
| Editar comprobante de egreso | `payment_vouchers.edit` |
| Anular comprobante de egreso | `payment_vouchers.void` |
| Imprimir comprobante de egreso | `payment_vouchers.print` |

## Modulo de contabilidad opcional

Se usa `tenantContext.hasModule(companyId, 'accounting')`:
- **Con contabilidad**: valida periodo, crea asiento, mapea IDs
- **Sin contabilidad**: crea receipt, payments, anticipos y bancos sin asiento

## Ejemplo de request

```json
POST /payment-receipts
{
  "type": "RECEIVABLE",
  "date": "2026-02-11",
  "third_party_id": "uuid-tercero",
  "description": "Cobro facturas febrero",
  "lines": [
    {
      "kind": "DOC",
      "account_code": "130505",
      "debit": 0,
      "credit": 100000,
      "ref_id": "uuid-arap-1",
      "company_payment_method_id": "uuid-metodo"
    },
    {
      "kind": "BANK",
      "account_code": "111005",
      "debit": 100000,
      "credit": 0,
      "ref_id": "uuid-bank-account"
    }
  ]
}
```
