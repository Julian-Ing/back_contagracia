# Modulo AR-AP Backend + CXC/CXP desde Asientos - 2026-02-10

## Commit: 8ea74d4

## Archivos nuevos

- `src/functions/create-ar-ap.ts` — Funcion que crea registros ArAp (CXC/CXP) desde lineas de asiento contable
- `src/modules/ar-ap/ar-ap.module.ts` — Modulo NestJS
- `src/modules/ar-ap/ar-ap.controller.ts` — Controller REST
- `src/modules/ar-ap/ar-ap.service.ts` — Servicio con queries Prisma

## Archivos modificados

- `src/app.module.ts` — Import de ArApModule
- `src/functions/create-journal-entry.ts` — Llama create-ar-ap para lineas con reference_type CXC/CXP
- `src/functions/index.ts` — Export de create-ar-ap
- `src/modules/journal-entries/journal-entries.controller.ts` — Acepta reference_type y due_date en items
- `src/modules/journal-entries/journal-entries.service.ts` — Validacion de reference_type + tercero obligatorio, banco/caja solo NORMAL
- `src/modules/periods/periods.service.ts` — Validacion: no cerrar si hay periodos anuales anteriores abiertos
- `src/main.ts` — Puerto actualizado

## Funcion create-ar-ap

Cuando un asiento contable tiene lineas con `reference_type` distinto de NORMAL, crea registros en la tabla `ArAp`:

| reference_type | Accion |
|---|---|
| CXC_CREATED | Crea ArAp tipo RECEIVABLE (cuenta por cobrar) |
| CXP_CREATED | Crea ArAp tipo PAYABLE (cuenta por pagar) |
| CXC_PAID | Crea Payment contra ArAp RECEIVABLE existente |
| CXP_PAID | Crea Payment contra ArAp PAYABLE existente |
| PREP_USED | Crea/usa Prepayment (anticipo) |

## Endpoints AR-AP (solo lectura)

| Metodo | Endpoint | Descripcion |
|---|---|---|
| GET | `/ar-ap/summary-by-third-party` | Resumen agrupado por tercero |
| GET | `/ar-ap/third-party/:id/detail` | Detalle de documentos y pagos de un tercero |
| GET | `/ar-ap/payment-receipts` | Lista de recibos de caja / comprobantes de egreso |

### GET /ar-ap/summary-by-third-party

Query params: `type` (RECEIVABLE|PAYABLE), `search?`, `bucket?` (all|overdue|0-30|31-60|60+), `tab?` (pending|paid), `dateFrom?`, `dateTo?`, `dueDateFrom?`, `dueDateTo?`, `page?`, `limit?`

Respuesta: tercero_id, tercero_name, tercero_document, total_amount, total_paid, total_balance, pending_docs, last_doc_date, last_payment_date, avg_overdue_days

### GET /ar-ap/third-party/:id/detail

Query params: `type`, `dateFrom?`, `dateTo?`, `dueDateFrom?`, `dueDateTo?`

Respuesta: transactions[] (id, source_key, source_number, consecutive, date, due_date, amount, paid, balance, status, days_overdue) + payments[] (id, consecutive, date, amount, payment_method_name, bank_account_name, description, is_voided, payment_receipt_id, receipt_consecutive)

### GET /ar-ap/payment-receipts

Query params: `type`, `search?`, `dateFrom?`, `dateTo?`, `page?`, `limit?`

Respuesta: id, consecutive, description, tercero_name, tercero_document, beneficiary_type, date, income_amount, expense_amount, bank_amount, document_amount, client_prepayment_amount, supplier_prepayment_amount, status, has_journal

## Validaciones agregadas en journal-entries

- `reference_type` distinto de NORMAL requiere `third_party_id`
- Cuentas de banco/caja (1110*, 1105*) solo permiten reference_type NORMAL
- `amount > 0` obligatorio para tipo manual
- `account_code` obligatorio en toda linea

## Validacion de cierre de periodos

No se puede cerrar un periodo anual si hay periodos anuales anteriores abiertos (OPEN o REOPENED).
