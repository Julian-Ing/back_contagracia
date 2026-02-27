# Company Payment Methods: CRUD, Consecutive y Schema - 2026-02-11

## Archivos modificados

### Schema
- `contagracia-shared-modules/prisma/schema-master.prisma`
- `contagracia-shared-modules/prisma/schema-tenant.prisma`

### Backend
- `accounting-service/src/app.module.ts`
- `accounting-service/src/modules/company-payment-methods/` (nuevo módulo)
- `accounting-service/src/modules/bank-accounts/bank-accounts.service.ts`

### Seeders
- `contagracia-shared-modules/prisma/seeds/consecutiveTypes.ts`
- `contagracia-shared-modules/prisma/seeds/companyPaymentMethods.ts`
- `contagracia-shared-modules/prisma/scripts/seed-all-tenants.ts`

---

## 1. Schema - CompanyPaymentMethod

Campo `consecutive` agregado (nullable, unique) en master y tenant:

```prisma
model CompanyPaymentMethod {
  consecutive String? @unique
  // ... demás campos
}
```

## 2. Schema - DocumentBankPayment

FK `company_payment_method_id` agregado:

```prisma
model DocumentBankPayment {
  company_payment_method_id String?
  company_payment_method CompanyPaymentMethod? @relation(...)
  @@index([company_payment_method_id])
}
```

Relación inversa `document_bank_payments DocumentBankPayment[]` agregada a `CompanyPaymentMethod`.

---

## 3. Backend - Módulo company-payment-methods

Nuevo módulo CRUD en `accounting-service`:

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/company-payment-methods` | Listar con búsqueda fuzzy y paginación |
| GET | `/company-payment-methods/payment-methods` | Listar tipos de método (catálogo DIAN) |
| GET | `/company-payment-methods/:id` | Obtener por ID |
| POST | `/company-payment-methods` | Crear (genera consecutive automático) |
| PUT | `/company-payment-methods/:id` | Actualizar nombre, descripción, is_active |
| DELETE | `/company-payment-methods/:id` | Eliminar (valida dependencias) |

### Búsqueda fuzzy
`word_similarity()` + `ILIKE` sobre name, consecutive y description.

### Consecutivo automático
Usa `getNextConsecutive(tx, 'company_payment_method')` dentro de transacción al crear. Prefijo: `MP`.

### Validación de eliminación
No permite eliminar si tiene registros en:
- `payments` (company_payment_method_id)
- `documents` (payment_method_id)
- `document_bank_payments` (company_payment_method_id)

### Orden
Resultados ordenados por `consecutive ASC`.

---

## 4. Backend - bank-accounts canDelete corregido

Se eliminó referencia a `Payment.bank_account_id` (FK removido en sesión anterior). Ahora valida las 5 dependencias reales:

1. `journalEntryItem` (bank_account_id)
2. `bankMovement` (bank_account_id)
3. `documentBankPayment` (bank_account_id)
4. `paymentReceiptLine` (kind=BANK, ref_id)
5. `bankReconciliation` (bank_account_id)

---

## 5. Seeders

### consecutiveTypes.ts
Nuevo tipo: `company_payment_method` con prefijo `MP`.

### companyPaymentMethods.ts
Consecutivos asignados a los 5 defaults: MP-0001 a MP-0005.

### seed-all-tenants.ts
- Elimina registros huérfanos sin consecutive antes de upsert.
- Propaga consecutive en create y update.

---

## 6. Migración master

```
npx prisma migrate dev --schema=prisma/schema-master.prisma --name add_consecutive_to_company_payment_methods
```
