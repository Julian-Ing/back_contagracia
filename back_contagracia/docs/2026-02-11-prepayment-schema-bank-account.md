# Prepayment: bank_account_id y company_payment_method_id

**Fecha:** 2026-02-11

## Cambios en schema

Se agregaron dos campos opcionales al modelo `Prepayment` en `schema-tenant.prisma`:

- `bank_account_id String?` — cuenta bancaria por donde entró/salió el dinero del anticipo
- `company_payment_method_id String?` — método de pago usado para el anticipo

Ambos campos son nullable porque no siempre se conoce o aplica (ej: anticipos migrados, ajustes manuales).

### Relaciones agregadas

- `Prepayment.bank_account` → `BankAccount` (FK)
- `Prepayment.company_payment_method` → `CompanyPaymentMethod` (FK)
- `BankAccount.prepayments` → relación inversa `Prepayment[]`
- `CompanyPaymentMethod.prepayments` → relación inversa `Prepayment[]`

### Índices

- `@@index([bank_account_id])` en Prepayment
- `@@index([company_payment_method_id])` en Prepayment

## Validaciones de eliminación actualizadas

### BankAccount (`bank-accounts.service.ts` → `canDelete`)

Se agregó validación de anticipos como 6ta dependencia:

```typescript
tenantDb.prepayment.count({ where: { bank_account_id: id } })
```

Dependencias totales verificadas:
1. `journalEntryItem` (bank_account_id)
2. `bankMovement` (bank_account_id)
3. `documentBankPayment` (bank_account_id)
4. `paymentReceiptLine` (kind=BANK, ref_id)
5. `bankReconciliation` (bank_account_id)
6. `prepayment` (bank_account_id) — **NUEVO**

### CompanyPaymentMethod (`company-payment-methods.service.ts` → `delete`)

Se agregó validación de anticipos como 4ta dependencia:

```typescript
tenantDb.prepayment.count({ where: { company_payment_method_id: id } })
```

Dependencias totales verificadas:
1. `payment` (company_payment_method_id)
2. `document` (payment_method_id)
3. `documentBankPayment` (company_payment_method_id)
4. `prepayment` (company_payment_method_id) — **NUEVO**

## Frontend

- `CanDeleteBankAccountResponse` actualizado con `prepaymentsCount: number`
