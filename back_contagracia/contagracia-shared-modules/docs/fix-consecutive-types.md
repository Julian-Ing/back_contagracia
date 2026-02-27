# Fix Consecutive Types

## Fecha: 2025-02-02

## Cambios Realizados

### 1. Correccion de prefijo fixed_asset

**Antes:** `ACT`
**Despues:** `AF`

### 2. Tipos de consecutivos agregados

| Type | Prefix | Descripcion |
|------|--------|-------------|
| prepayment_movement | ATM | Movimiento de Anticipo |
| accounting_period | PC | Periodo Contable |
| ar_ap | CXC | Cuenta por Cobrar/Pagar |
| tax_report | TR | Reporte de Impuestos |

## Archivo Modificado

- `prisma/seeds/consecutiveTypes.ts`

## Seeder Ejecutado

Se ejecuto `seed-all-tenants.ts` para aplicar los nuevos tipos de consecutivos a todos los tenants activos.
