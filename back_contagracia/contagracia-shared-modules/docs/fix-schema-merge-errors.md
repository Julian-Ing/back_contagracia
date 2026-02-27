# Fix Schema Merge Errors

## Fecha: 2025-02-02

## Errores Solucionados

### 1. Residuo de merge en schema-tenant.prisma (linea 3291)

**Problema:** Habia un "=======" suelto entre los modelos `CrmSegmentationConfig` y `CashSession`, residuo de un merge mal resuelto.

**Solucion:** Eliminado el caracter suelto.

### 2. CashRegister sin relaciones

**Problema:** El modelo `CashRegister` (linea 2703) no tenia las relaciones definidas:
- cash_account (BankAccount)
- storage (Storage)
- cost_center (CostCenter)
- resolution (Resolution)
- sessions (CashSession[])

**Solucion:** Agregadas las relaciones e indices al modelo original:
```prisma
// Relations
cash_account BankAccount  @relation("CashRegisterCashAccount", fields: [cash_account_id], references: [id])
storage      Storage?     @relation(fields: [storage_id], references: [id])
cost_center  CostCenter?  @relation(fields: [cost_center_id], references: [id])
resolution   Resolution?  @relation(fields: [resolution_id], references: [id])
sessions     CashSession[]

@@index([cash_account_id])
@@index([storage_id])
@@index([cost_center_id])
@@map("cash_registers")
```

### 3. CrmContactTag con indice invalido

**Problema:** El modelo `CrmContactTag` tenia un indice `@@index([is_active])` pero el campo `is_active` no existia en el modelo.

**Solucion:** Eliminado el indice invalido.

### 4. Ano de Exogena dinamico

**Problema:** En `seed-all-tenants.ts`, el ano para exogenous formats usaba `new Date().getFullYear()` que tomaba el ano actual del sistema.

**Solucion:** Cambiado a ano fijo 2025:
```typescript
// Antes
const currentYear = new Date().getFullYear();

// Despues
const currentYear = 2025;
```

## Archivos Modificados

- `prisma/schema-tenant.prisma`
- `prisma/scripts/seed-all-tenants.ts`
