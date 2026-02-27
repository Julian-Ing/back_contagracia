# Conciliacion Bancaria

## Descripcion
Sistema de conciliacion bancaria que compara movimientos del extracto bancario contra movimientos del sistema (journal_entry_items con bank_account_id).

**Fuente de verdad:** `journal_entry_items` con `bank_account_id` (NO hay tabla `bank_transactions`).

## Enums

```prisma
enum BankReconciliationStatus {
  PENDING    // En proceso
  RECONCILED // Conciliada
}

enum BankReconciliationItemSource {
  EXTRACT // Del extracto bancario
  SYSTEM  // Del sistema (journal_entry_items)
}

enum BankReconciliationItemStatus {
  PENDING    // Sin conciliar
  MATCHED    // Conciliado con otra linea
  IN_TRANSIT // En transito (cheque/deposito pendiente)
  VOIDED     // Anulado (mas en sistema que en extracto)
}

enum TransactionDirection {
  IN  // Ingreso
  OUT // Egreso
}
```

## Modelos

### BankAdjustmentType

Tipos de ajuste configurables para conciliacion bancaria. Cada tipo tiene una cuenta contable por defecto.

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| id | uuid | PK |
| name | varchar | Gastos bancarios, Comisiones, etc. |
| direction | enum | IN (ingreso), OUT (egreso) |
| account_code | varchar FK | Cuenta contable por defecto |
| is_active | boolean | Activo/Inactivo |

### BankReconciliation

Cabecera de conciliacion bancaria.

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| id | uuid | PK |
| bank_account_id | uuid FK | Cuenta bancaria |
| consecutive | varchar | BC-0001 |
| reconciliation_date | date | Fecha de conciliacion |
| period_start | date | Inicio del periodo |
| period_end | date | Fin del periodo |
| **Saldos Extracto** | | |
| extract_initial_balance | decimal(19,4) | Saldo inicial extracto |
| extract_final_balance | decimal(19,4) | Saldo final extracto |
| **Saldos Sistema** | | |
| system_initial_balance | decimal(19,4) | Saldo inicial sistema |
| system_final_balance | decimal(19,4) | Saldo final sistema |
| difference | decimal(19,4) | Diferencia |
| status | enum | PENDING, RECONCILED |

### BankReconciliationItem

Lineas de conciliacion (extracto y sistema en una sola tabla).

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| id | uuid | PK |
| reconciliation_id | uuid FK | Cabecera |
| source | enum | EXTRACT, SYSTEM |
| transaction_date | date | Fecha transaccion |
| amount | decimal(19,4) | Monto |
| direction | enum | IN, OUT |
| description | text | Descripcion |
| reference | varchar | Referencia del extracto |
| **Solo source=SYSTEM** | | |
| journal_entry_item_id | uuid FK | Linea de asiento contable |
| **Conciliacion** | | |
| status | enum | PENDING, MATCHED, IN_TRANSIT, VOIDED |
| matched_item_id | uuid FK | Linea con la que se concilio (self) |
| adjustment_type_id | uuid FK | Tipo de ajuste (para IN_TRANSIT) |
| matched_at | timestamptz | Fecha de conciliacion |
| matched_by | uuid FK | Usuario que concilio |
| notes | text | Notas |

## Tipos de Ajuste por Defecto (14)

### Egresos (OUT)
| Nombre | Cuenta |
|--------|--------|
| Gastos bancarios | 530506 |
| Comisiones bancarias | 530515 |
| Intereses pagados | 530520 |
| Diferencia en cambio (egreso) | 530525 |
| Descuentos comerciales | 530535 |
| Manejo y emision de tarjetas | 530540 |
| GMF (4x1000) | 530545 |
| Chequeras | 530555 |
| Multas y sanciones | 530560 |

### Ingresos (IN)
| Nombre | Cuenta |
|--------|--------|
| Intereses recibidos | 421005 |
| Reajuste monetario | 421010 |
| Descuentos amortizados | 421015 |
| Diferencia en cambio (ingreso) | 421020 |
| Rendimientos | 421025 |

## Relaciones

```
BankAccount
└── reconciliations → BankReconciliation[]

BankReconciliation
├── bank_account → BankAccount
└── items → BankReconciliationItem[]

BankReconciliationItem
├── reconciliation → BankReconciliation
├── journal_entry_item → JournalEntryItem (solo SYSTEM)
├── matched_item → BankReconciliationItem (self)
├── adjustment_type → BankAdjustmentType
└── matched_by_user → TenantUser

BankAdjustmentType
└── account → ChartOfAccount
```

## Flujo de Conciliacion

1. Se crea conciliacion con periodo y saldos del extracto
2. Sistema carga items de extracto (source=EXTRACT)
3. Sistema carga items del sistema (source=SYSTEM) desde journal_entry_items con bank_account_id
4. Usuario concilia lineas (MATCHED)
5. Lineas sin match en sistema se marcan IN_TRANSIT o VOIDED
6. Lineas sin match en extracto se pueden crear como transaccion
7. Al cerrar, difference debe ser 0 y status cambia a RECONCILED

## Archivos Modificados

- `prisma/schema-master.prisma` - BankAdjustmentType
- `prisma/schema-tenant.prisma` - Enums y modelos de conciliacion
- `prisma/seeds/bankAdjustmentTypes.ts` - Datos seed
- `prisma/seeds/seed-catalogs.ts` - Seed master
- `prisma/scripts/seed-all-tenants.ts` - Seed tenants

## Migracion

```bash
# Master
npx prisma migrate dev --schema=./prisma/schema-master.prisma --name add_bank_reconciliation

# Tenants
npx ts-node prisma/scripts/migrate-all-tenants.ts

# Seeds
pnpm prisma:seed
npx ts-node prisma/scripts/seed-all-tenants.ts
```
