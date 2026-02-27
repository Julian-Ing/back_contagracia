# Renombre de tax_rates a taxes

## Descripcion
Se renombro la tabla `tax_rates` a `taxes` en todo el sistema para mayor claridad semantica.

## Cambios Realizados

### Schema Master (`schema-master.prisma`)
- Modelo `TaxRate` -> `Tax`
- Tabla `tax_rates` -> `taxes`

### Schema Tenant (`schema-tenant.prisma`)
- Modelo `TaxRate` -> `Tax`
- Tabla `tax_rates` -> `taxes`
- Relacion en `Product.tax` actualizada

### Seeds
- Archivo `taxRates.ts` -> `taxes.ts`
- Variable `taxRates` -> `taxes`
- `seed-catalogs.ts` actualizado para importar desde `taxes.ts`

### Migracion
- `20260201052634_rename_tax_rates_to_taxes/`

## Estructura de la Tabla

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| id | uuid PK | Identificador unico |
| code | varchar | Codigo del impuesto |
| name | varchar | Nombre del impuesto |
| rate | decimal(8,4) | Tasa/porcentaje |
| description | varchar | Descripcion |
| is_active | boolean | Estado activo |

## Archivos Modificados
- `prisma/schema-master.prisma`
- `prisma/schema-tenant.prisma`
- `prisma/seeds/taxes.ts` (antes taxRates.ts)
- `prisma/seeds/seed-catalogs.ts`
