# Saldo Inicial en Cuentas Bancarias

## Fecha: 2026-02-06

## Descripción

Al crear una cuenta bancaria con saldo inicial, se genera automáticamente un asiento contable de tipo `bank_account_opening`.

## Flujo

1. Usuario crea cuenta bancaria con saldo inicial > 0
2. Si tiene módulo contable (`accounting.bank_accounts.assign`):
   - Debe seleccionar cuenta contable (1110* o 1105*)
   - Debe seleccionar cuenta contrapartida (excluye 1110* y 1105*)
   - Por defecto se sugiere `accounting_social_capital` (310505)
3. Se crea la cuenta bancaria con `initial_balance` y `current_balance` = saldo inicial
4. Se crea asiento tipo `bank_account_opening`:
   - DÉBITO: cuenta contable del banco/caja (con bank_account_id)
   - CRÉDITO: cuenta contrapartida (ej: capital social)
5. El asiento genera automáticamente el movimiento bancario

## Endpoint

`POST /bank-accounts`

**Body con saldo inicial:**
```json
{
  "account_type": "SAVINGS",
  "bank_id": "uuid",
  "account_number": "123456789",
  "account_name": "Cuenta Principal",
  "account_id": "11100501",
  "initial_balance": 5000000,
  "counterpart_account_id": "310505"
}
```

## Validaciones

- Si `initial_balance > 0`:
  - `account_id` es requerido
  - `counterpart_account_id` es requerido
  - `counterpart_account_id` no puede ser 1105* ni 1110*

## Concepto por Defecto

El frontend carga `accounting_social_capital` como cuenta contrapartida por defecto usando:

```typescript
accountingConfigService.getByKey('accounting_social_capital')
```

Cuenta por defecto: `310505` (Capital suscrito y pagado)
