# Plan de Cuentas Base (PUC)

## Resumen

Se agregó la tabla `chart_of_accounts` como PUC base en Master que se replica a cada Tenant nuevo.

## Enum AccountType

9 tipos de cuenta según PUC Colombia:

| Enum | Clase | Nombre |
|------|-------|--------|
| ASSET | 1 | Activo |
| LIABILITY | 2 | Pasivo |
| EQUITY | 3 | Patrimonio |
| INCOME | 4 | Ingresos |
| EXPENSE | 5 | Gastos |
| COST | 6 | Costos |
| PRODUCTION_COST | 7 | Costos de Producción |
| DEBTOR_ACCOUNTS | 8 | Cuentas Deudoras |
| CREDITOR_ACCOUNTS | 9 | Cuentas Acreedoras |

## Modelo ChartOfAccount

```prisma
model ChartOfAccount {
  id        String      @id @default(uuid())
  code      String      @unique
  name      String
  type      AccountType
  parent_id String?
  is_active Boolean     @default(true)

  parent   ChartOfAccount?  @relation("AccountHierarchy", ...)
  children ChartOfAccount[] @relation("AccountHierarchy")

  @@map("chart_of_accounts")
}
```

## Mapeo en Código

Archivo: `src/constants/account-types.ts`

```typescript
import { ACCOUNT_TYPE_CLASS, getAccountClass, detectAccountTypeFromCode } from 'contagracia-shared-modules';

// Enum a número
getAccountClass('ASSET'); // 1

// Detectar tipo por código PUC
detectAccountTypeFromCode('1105'); // 'ASSET'
detectAccountTypeFromCode('5305'); // 'EXPENSE'
```

## Archivos

| Archivo | Descripción |
|---------|-------------|
| `prisma/schema-master.prisma` | Enum + Modelo ChartOfAccount |
| `prisma/schema-tenant.prisma` | Enum actualizado (9 valores) |
| `src/constants/account-types.ts` | Mapeo enum ↔ número |
| `prisma/scripts/seed-all-tenants.ts` | Replicación a tenants existentes |

## Migración

```
prisma/migrations/20260130183015_add_chart_of_accounts_base/
```

## Pendiente

- Seeder con PUC base colombiano (datos)
- Cuando se agregue el seeder, ejecutar:
  ```bash
  npx prisma db seed
  npx ts-node prisma/scripts/seed-all-tenants.ts --force
  ```
