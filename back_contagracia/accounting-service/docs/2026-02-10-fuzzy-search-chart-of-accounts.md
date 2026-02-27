# Búsqueda Fuzzy en Plan de Cuentas (pg_trgm)

**Fecha:** 2026-02-10

## Archivo modificado

`src/modules/chart-of-accounts/chart-of-accounts.service.ts`

## Cambio

Búsqueda con `contains` reemplazada por query raw SQL con `ILIKE` + `similarity() > 0.3` (pg_trgm) sobre campos `code` y `name`. Retorna los `code` que coinciden y filtra con `{ code: { in: matchCodes } }`.

## Requisito

Extensión `pg_trgm` + índice GIN `idx_coa_name_trgm` (creados por `migrate-all-tenants`).
