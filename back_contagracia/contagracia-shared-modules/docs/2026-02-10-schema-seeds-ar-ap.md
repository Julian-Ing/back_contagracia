# Schema y Seeds AR-AP - 2026-02-10

## Commit: 8ea74d4

## schema-tenant.prisma — Modelos nuevos

### ArAp
Registro de cuenta por cobrar o pagar.
- id, type (RECEIVABLE|PAYABLE), third_party_id, source_key, source_number, consecutive
- date, due_date, amount, paid, balance, status, journal_entry_id

### Payment
Pago aplicado a un ArAp.
- id, ar_ap_id, amount, date, payment_method_id, bank_account_id
- journal_entry_id, payment_receipt_id, description, consecutive, is_voided

### PaymentReceipt
Recibo de caja o comprobante de egreso (agrupa pagos).
- id, type (RECEIVABLE|PAYABLE), consecutive, description
- third_party_id, beneficiary_type, date, status, journal_entry_id

### Prepayment
Anticipo de cliente o proveedor.
- id, type, third_party_id, amount, used_amount, balance, date, status

## Seeds modificados

- `seed-ar-ap-sources.ts` — Nuevo source type agregado
- `seed-payroll-concepts.ts` — Conceptos de nomina actualizados
- `seed-all-tenants.ts` — Ejecuta seeds actualizados

## migrate-all-tenants.ts (uncommitted)

- Funcion `setupFuzzySearch()` post db-push
- `CREATE EXTENSION IF NOT EXISTS pg_trgm`
- Indices GIN: idx_tp_name_trgm, idx_tp_id_number_trgm, idx_coa_name_trgm
