# Búsqueda Fuzzy en Terceros (pg_trgm)

**Fecha:** 2026-02-10

## Archivo modificado

`src/modules/third-parties/third-parties.service.ts`

## Cambio

Búsqueda con `contains` reemplazada por query raw SQL con `ILIKE` + `similarity() > 0.3` (pg_trgm) sobre `name`, `identification_number`, `email`. Usa `COALESCE` para nulls. Early return vacío si no hay coincidencias.

## Requisito

Extensión `pg_trgm` + índices GIN `idx_tp_name_trgm`, `idx_tp_id_number_trgm` (creados por `migrate-all-tenants`).
