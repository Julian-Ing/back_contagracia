# Fix: BankMovement direction + race condition en saldo

**Fecha:** 2026-02-12

## Cambios

### schema-tenant.prisma
- Nuevo enum `BankMovementDirection` (INCOME, EXPENSE)
- `BankMovement.direction` nuevo campo con `@default(INCOME)` para filas existentes

### create-bank-movement.ts
- `CreateBankMovementParams.direction`: nuevo campo `'INCOME' | 'EXPENSE'`
- Amount siempre positivo, direction determina si suma o resta al saldo
- **Fix race condition**: balance se lee con `FOR UPDATE` dentro de la transacción (antes se leía fuera, permitiendo sobreescritura por concurrencia)
- Validación `amount > 0` (antes permitía negativos)

### journal-entries.service.ts
- `createBankMovementsForItems`: pasa `direction` según DEBIT/CREDIT, amount siempre positivo
- `createBankMovementsForReversal`: invierte direction (DEBIT original → EXPENSE, CREDIT original → INCOME), amount positivo

### bank-accounts.service.ts
- Saldo inicial pasa `direction: 'INCOME'` con amount positivo

### prepayments.service.ts
- CLIENT → `direction: 'INCOME'` (recibimos del cliente)
- SUPPLIER/EMPLOYEE → `direction: 'EXPENSE'` (pagamos al tercero)
- Amount siempre positivo (`dto.original_amount`)

### Seeders
- `seed-journal-entry-types.ts`: agregado `employee_prepayment` y `employee_prepayment_refund`
- `seed-bank-movement-types.ts`: agregado `employee_prepayment` y `employee_prepayment_refund`
