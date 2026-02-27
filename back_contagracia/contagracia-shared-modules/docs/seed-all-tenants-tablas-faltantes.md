# Tablas Faltantes Agregadas a seed-all-tenants

## Descripcion
Se agregaron tablas parametricas que faltaban en el script `seed-all-tenants.ts` y que si estaban en `tenant.service.ts`.

## Tablas Agregadas

| Tabla | Descripcion |
|-------|-------------|
| banks | Bancos |
| payment_methods | Metodos de pago DIAN |
| product_units | Unidades de producto |
| tax_types | Tipos de impuesto |
| taxes | Impuestos |
| consecutive_types | Tipos de consecutivo |
| consecutives | Consecutivos por tenant |

## Problema Resuelto
Antes, `company_payment_methods` mostraba 0 en el seed porque dependia de `payment_methods` que no se estaba seedeando. Ahora se seedean todas las tablas en orden correcto.

## Orden de Seed (respeta FKs)

1. Tablas base sin dependencias
2. `tax_types` (antes de `taxes`)
3. `payment_methods` (antes de `company_payment_methods`)
4. `consecutive_types` (antes de `consecutives`)
5. Tablas con FKs

## Cambio en company_payment_methods
Se cambio de logica `findFirst + create` a `upsert` para consistencia con las demas tablas y que siempre muestre el conteo correcto.

## Archivo Modificado
- `prisma/scripts/seed-all-tenants.ts`
