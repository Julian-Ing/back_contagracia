# Prepayment: cuenta de cruce y estado REFUNDED

**Fecha:** 2026-02-11

## Cuenta de cruce

Se agregó `counterpart_account_code String?` al modelo `Prepayment` para guardar la cuenta contable de contrapartida/cruce del anticipo.

- Relación nombrada `PrepaymentCounterpartAccount` hacia `ChartOfAccount`
- La relación existente `account` se renombró a `PrepaymentAccount` para diferenciarla
- Ambas relaciones inversas agregadas en `ChartOfAccount`:
  - `prepayments` → `@relation("PrepaymentAccount")`
  - `prepayments_counterpart` → `@relation("PrepaymentCounterpartAccount")`
- Índice en `counterpart_account_code`

## Estado REFUNDED

Se agregó `REFUNDED` al enum `PrepaymentStatus`:

```prisma
enum PrepaymentStatus {
  ACTIVE   // Activo
  APPLIED  // Aplicado
  REFUNDED // Devuelto
  VOIDED   // Anulado
}
```

- **ACTIVE**: anticipo vigente con saldo disponible
- **APPLIED**: anticipo completamente aplicado a documentos (saldo $0)
- **REFUNDED**: anticipo devuelto (el dinero se regresó al tercero)
- **VOIDED**: registro anulado (error administrativo, sin movimiento de dinero)
