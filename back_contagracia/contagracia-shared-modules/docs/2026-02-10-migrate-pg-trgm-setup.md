# Setup automático de pg_trgm en migrate-all-tenants

**Fecha:** 2026-02-10

## Archivo modificado

`prisma/scripts/migrate-all-tenants.ts`

## Cambio

Función `setupFuzzySearch()` que se ejecuta después del `db push` de cada tenant:
1. `CREATE EXTENSION IF NOT EXISTS pg_trgm`
2. Índices GIN: `idx_tp_name_trgm` (third_parties.name), `idx_tp_id_number_trgm` (third_parties.identification_number), `idx_coa_name_trgm` (chart_of_accounts.name)

Importa `PrismaClient` de `@prisma/client-tenant` para ejecutar queries raw en cada DB tenant.
