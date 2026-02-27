# Saldo Inicial en Formulario de Cuentas Bancarias

## Fecha: 2026-02-06

## Descripción

El formulario de creación de cuentas bancarias ahora soporta saldo inicial con cuenta contrapartida.

## Campos Nuevos

| Campo | Tipo | Condición | Descripción |
|-------|------|-----------|-------------|
| `initial_balance` | NumericInput | Siempre visible | Saldo inicial (default: 0) |
| `account_id` | AccountSelect | Si `initial_balance > 0` y `canAssignAccount` | Cuenta contable (1110* o 1105*) |
| `counterpart_account_id` | AccountSelect | Si `initial_balance > 0` y `canAssignAccount` | Cuenta contrapartida (excluye 1110*, 1105*) |

## Comportamiento

1. Campo "Saldo inicial" siempre visible
2. Si saldo > 0 y tiene permiso `accounting.bank_accounts.assign`:
   - Campos cuenta contable y contrapartida son requeridos
   - Contrapartida pre-cargada con `accounting_social_capital` (310505)
   - Contrapartida excluye cuentas de banco/caja
3. Si saldo = 0: campos de cuenta opcionales

## Cuenta Contrapartida por Defecto

Se carga al abrir el modal:
```typescript
const config = await accountingConfigService.getByKey('accounting_social_capital');
// config.account_code = '310505' (Capital suscrito y pagado)
```

## Archivo Modificado

`src/app/dashboard/banking/page.tsx`
