# Periodos Contables

## Descripcion
Sistema de periodos contables para controlar apertura, cierre y reapertura de periodos fiscales.

## Enums

```prisma
enum AccountingPeriodStatus {
  OPEN     // Abierto - permite movimientos
  CLOSED   // Cerrado - no permite movimientos
  REOPENED // Reabierto - para ajustes
}

enum AccountingPeriodActionType {
  OPEN   // Apertura del periodo
  CLOSE  // Cierre del periodo
  REOPEN // Reapertura del periodo
  ADJUST // Ajuste de saldos iniciales
}
```

## Modelos

### AccountingPeriod

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| consecutive | varchar | PC-0001 |
| name | varchar | "Enero 2025", "Año 2025" |
| start_date | date | Inicio del periodo |
| end_date | date | Fin del periodo |
| year | int | Año fiscal |
| is_annual | boolean | TRUE = cierra cuentas 4/5/6 |
| status | enum | OPEN, CLOSED, REOPENED |
| closed_at | timestamp | Fecha de cierre |
| closed_by | FK | Usuario que cerro |
| reopened_at | timestamp | Fecha de reapertura |
| reopened_by | FK | Usuario que reabrio |

### AccountingPeriodAction

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| period_id | FK | Periodo |
| action | enum | OPEN, CLOSE, REOPEN, ADJUST |
| reason | text | Motivo de la accion |
| journal_entry_id | FK | Asiento contable generado |
| created_by | FK | Usuario que ejecuto |

## Comportamiento

### Cierre Mensual (is_annual = false)
- Cambia status a CLOSED
- Registra accion CLOSE
- No genera asientos automaticos

### Cierre Anual (is_annual = true)
1. Cierra cuentas de resultados (4, 5, 6) a Utilidad del Ejercicio
2. Crea asiento de cierre automatico
3. Genera saldos iniciales para siguiente año
4. Crea periodo anual del siguiente año automaticamente

### Reapertura
- Solo usuarios con permiso especial
- Registra motivo obligatorio
- Cambia status a REOPENED

## Relaciones

```
TenantUser
├── periods_closed (periodos que cerro)
├── periods_reopened (periodos que reabrio)
└── period_actions_created (acciones ejecutadas)

JournalEntry
└── accounting_period_actions (acciones que generaron asientos)
```

## Archivo Modificado

- `prisma/schema-tenant.prisma`

## Migracion

```bash
pnpm prisma:generate
npx ts-node prisma/scripts/migrate-all-tenants.ts
```
