# Validaciones createPrepayment + fix validatePeriodOpen en bank-accounts

**Fecha:** 2026-02-12

## Cambios

### prepayments.service.ts - createPrepayment validaciones
- `hasModule('accounting')` al inicio para determinar si tiene contabilidad
- `validatePeriodOpen` solo si tiene módulo de contabilidad
- Validaciones comunes: tercero requerido y existe, tipo válido, monto > 0, fecha requerida
- Si contabilidad: account_code requerido, validar cuenta existe, validar cuenta de cruce existe
- Validar banco existe y activo, método de pago existe y activo
- Validar que tenga banco o cuenta de cruce
- Lógica de creación (prepayment, asiento, movimiento bancario, consecutivo) pendiente TODO

### bank-accounts.service.ts - fix validatePeriodOpen
- Movido `validatePeriodOpen` al inicio de `create()`, solo si `hasAccountingModule`
- Antes se ejecutaba siempre, incluso para compañías sin módulo de contabilidad
- `hasAccountingModule` ahora se declara al inicio y se reutiliza en todo el método

## Nota sobre captura de errores en frontend
- banking/page.tsx: captura `err.response?.data?.message` correctamente (línea 178)
- journal-entries/new/page.tsx: captura `err.response?.data?.message` correctamente (línea 339)
- prepayments/CreatePrepaymentModal.tsx: submit es TODO, cuando se implemente debe usar el mismo patrón
