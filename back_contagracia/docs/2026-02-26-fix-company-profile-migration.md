# Fix: Migración de perfil de empresa master → tenant CompanySetting

**Fecha**: 2026-02-26

## Problema

La migración `20260227003028_migrate_company_to_tenant_settings` eliminaba 26 columnas de perfil de la tabla `companies` en master (address, phone, department_id, type_document_identification_id, etc.) **sin copiar los datos existentes** a `CompanySetting` del tenant. Resultado: pérdida de datos de perfil para empresas existentes.

## Solución

### 1. Migration SQL corregido (`20260227003028`)

Se agregó un paso ANTES de dropear columnas:

- Crea tabla temporal `_company_profile_staging` en master
- Copia datos de perfil de `companies` → staging (company_info, tax_classification, legal_representative)
- Luego dropea FKs, índices y columnas como antes

### 2. `seed-all-tenants.ts` — `seedCompanyProfileSettings()`

La función que era no-op ahora:

- Lee de `_company_profile_staging` en master para cada company_id
- Escribe a `CompanySetting` del tenant (upsert sin sobrescribir datos existentes)
- Si la tabla staging no existe (migración no aplicada), es no-op seguro
- Al final del seeder, si todos los tenants fueron exitosos, **borra la tabla staging**

### Flujo para nuevos despliegues

```bash
# 1. Aplicar migraciones (crea staging + dropea columnas)
npx prisma migrate deploy --schema=prisma/schema-master.prisma

# 2. Seedear tenants (copia staging → CompanySetting → borra staging)
npx ts-node prisma/scripts/seed-all-tenants.ts --force
```

## Campos migrados

| Categoría | Keys |
|-----------|------|
| `company_info` | dv, phone, address, whatsapp_number, country_id, department_id, municipality_id |
| `tax_classification` | type_document_identification_id, type_organization_id, type_regime_id, type_liability_id |
| `legal_representative` | name, identification, email, phone, signature_url |

## Archivos modificados

- `prisma/migrations/20260227003028_.../migration.sql` — staging table + INSERT antes de DROP
- `prisma/scripts/seed-all-tenants.ts` — seedCompanyProfileSettings lee staging, cleanup al final
