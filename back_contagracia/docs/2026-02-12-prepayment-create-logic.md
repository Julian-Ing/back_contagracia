# Lógica completa de createPrepayment

**Fecha:** 2026-02-12

## Flujo

1. `hasModule('accounting')` + mapeo `typeKey` (client_prepayment, supplier_prepayment, employee_prepayment)
2. `validatePeriodOpen` solo si tiene contabilidad
3. Validaciones comunes: tercero, tipo, monto > 0, fecha
4. Validaciones contables (si tiene módulo): account_code requerido, validar cuenta existe, validar cuenta de cruce si aplica
5. Validaciones banco: banco existe y activo, método de pago existe y activo
6. Validar banco o cuenta de cruce
7. **Resolver cuenta de contrapartida**: si banco + contabilidad → `bankAccount.account_id` o fallback a config (`finance_bank_account` / `finance_cash_account`). Se guarda en `counterpart_account_code` del prepayment
8. **Crear anticipo** con consecutivo (`getNextConsecutive(tx, 'prepayment')`) en transacción
9. **Descripción**: `Anticipo {consecutivo} a {tipo} {tercero} por {monto}` + notas opcionales
10. **Movimiento bancario** (solo si banco): amount positivo, direction INCOME (cliente) o EXPENSE (proveedor/empleado)
11. **Asiento contable** (solo si contabilidad): CLIENT → anticipo CREDIT / cruce DEBIT. SUPPLIER/EMPLOYEE → anticipo DEBIT / cruce CREDIT. Vincula journal_entry_id al prepayment

## Frontend (CreatePrepaymentModal)
- `handleSubmit` conectado a `prepaymentsService.create(payload)`
- Captura errores con `err.response?.data?.message`
- Botón muestra "Guardando..." mientras envía
