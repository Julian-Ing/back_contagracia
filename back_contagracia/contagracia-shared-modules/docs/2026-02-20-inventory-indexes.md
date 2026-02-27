# Índices de Inventario — Normal + GIN fuzzy search

**Fecha:** 2026-02-20

## Índices Normales (@@index en Prisma)

8 nuevos índices para filtros frecuentes:

| Tabla | Campo | Uso |
|-------|-------|-----|
| product_categories | is_active | Filtro activo/inactivo |
| products | is_active | Filtro activo/inactivo |
| products | is_service | Filtro productos vs servicios |
| product_attributes | is_active | Filtro activo/inactivo |
| product_attribute_options | is_active | Filtro activo/inactivo |
| warehouses | is_active | Filtro activo/inactivo |
| storages | is_active | Filtro activo/inactivo |
| storage_transfers | created_at | Filtro por rango de fechas |
| product_movements | direction | Filtro entradas/salidas |

## Índices GIN pg_trgm (fuzzy search)

15 nuevos índices para búsqueda fuzzy con `ILIKE '%term%'` o `similarity()`:

| Tabla | Campos |
|-------|--------|
| product_categories | description |
| products | name, consecutive, description, sku |
| product_attributes | name, consecutive, description |
| product_attribute_options | name, consecutive |
| warehouses | name, consecutive |
| storages | name, consecutive |

**Nota:** product_categories ya tenía GIN en name y consecutive (previo).

## Archivos Modificados
- `prisma/schema-tenant.prisma` — 8 @@index nuevos
- `prisma/scripts/migrate-all-tenants.ts` — 15 CREATE INDEX GIN nuevos

## Post-cambio
- `npx prisma generate --schema=prisma/schema-tenant.prisma` ✅
- `npx ts-node prisma/scripts/migrate-all-tenants.ts` ✅ (1 tenant)
