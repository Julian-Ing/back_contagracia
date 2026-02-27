# Prepayments findAll endpoint y fix saldo inicial bancos

**Fecha:** 2026-02-11

## Prepayments findAll

Se agregó `GET /prepayments` con búsqueda fuzzy, filtros y paginación.

### Query params
- `search` — fuzzy search en: consecutivo, tercero (nombre e identificación), cuenta, banco, método de pago, cuenta de cruce
- `prepayment_type` — CLIENT, SUPPLIER, EMPLOYEE
- `status` — ACTIVE, APPLIED, REFUNDED, VOIDED
- `from_date` / `to_date` — rango de fechas
- `page` / `limit` — paginación

### Implementación
- Raw SQL con JOINs a `third_parties`, `chart_of_accounts` (x2), `bank_accounts`, `company_payment_methods`
- `ILIKE` + `word_similarity` (pg_trgm) para fuzzy search
- Ordenado por `prepayment_date DESC, consecutive DESC`

### DTOs actualizados
- `CreatePrepaymentDto`: agregados `counterpart_account_code`, `company_payment_method_id`
- Comentario de `refundPrepayment`: corregido a usar status `REFUNDED`

## Fix: saldo inicial en cuentas bancarias

### Problema
`bank-accounts.service.ts` al crear una cuenta con saldo inicial:
1. Solo creaba el asiento contable (si tenía módulo de contabilidad)
2. Nunca creaba el movimiento bancario → `current_balance` quedaba en 0
3. Sin módulo de contabilidad, fallaba la validación de cuenta contable

### Solución
- La validación de cuenta contable + contrapartida solo aplica si `hasAccountingModule`
- Se agregó `createBankMovement` que **siempre** se ejecuta cuando hay saldo inicial (con o sin módulo de contabilidad)
- El movimiento bancario es el que actualiza `current_balance` en la cuenta
- Asiento contable solo se crea si tiene módulo de contabilidad

### Corrección columna
- `tp.document_number` → `tp.identification_number` (nombre real del campo en `third_parties`)
