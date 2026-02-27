# Fix: Fuzzy Search en CxC/CxP (AR/AP)

**Fecha:** 2026-02-11

## Archivo modificado

`src/modules/ar-ap/ar-ap.service.ts`

## Problema

El endpoint `GET /ar-ap/summary-by-third-party` usaba `contains` con `mode: 'insensitive'` (Prisma) para buscar terceros por nombre e identificacion. Esto solo matcheaba substrings exactos, sin tolerancia a errores de escritura.

## Cambio

Reemplazado el filtro Prisma por query raw SQL con:
- `ILIKE` para substring matching
- `word_similarity()` (pg_trgm) > 0.3 sobre `name` e `identification_number`

Se usa `word_similarity()` en vez de `similarity()` porque compara el termino de busqueda contra cada **palabra individual** del campo, tomando el mejor match. Esto es critico para nombres compuestos:

- `similarity("MARIO JOHN ALEXANDER", "malio")` → ~0.1 (se diluye con el string largo)
- `word_similarity("malio", "MARIO JOHN ALEXANDER")` → ~0.6 (compara contra "MARIO")

## Query resultante

```sql
SELECT "id" FROM "third_parties"
WHERE "name" ILIKE $1
OR "identification_number" ILIKE $1
OR word_similarity($2, COALESCE("name", '')) > 0.3
OR word_similarity($2, COALESCE("identification_number", '')) > 0.3
```

Los IDs resultantes se usan como filtro: `where.third_party_id = { in: matchIds }`. Si no hay matches, retorna `{ data: [], total: 0 }` sin hacer queries adicionales.

## Requisito

Extension `pg_trgm` + indices GIN `idx_tp_name_trgm`, `idx_tp_id_number_trgm` (creados por `migrate-all-tenants`).
