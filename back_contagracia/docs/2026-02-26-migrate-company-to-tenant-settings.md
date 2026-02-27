# Migrar datos de Company (master) a CompanySetting (tenant)

## Resumen
Se movieron 26 campos de perfil de empresa desde la tabla `Company` en master DB hacia filas `CompanySetting` (key-value) en cada tenant DB. Master Company ahora solo contiene campos de routing/infraestructura + copias sincronizadas de `company_name`, `email` y `logo_url`.

## Campos que quedan en master Company
| Campo | Razón |
|-------|-------|
| id, tenant_id | PK / routing |
| db_host, db_port, db_name, db_user, db_password | Conexión tenant |
| nit | Login routing |
| company_name | Copia sync (admin panel, login, header) |
| email | Copia sync (admin panel) |
| logo_url | Copia sync (login response, header) |
| is_active, user_plus | Licenciamiento |
| created_at, updated_at | Auditoría |

## Campos movidos a tenant CompanySetting
- `company_info.*`: dv, phone, address, whatsapp_number, country_id, department_id, municipality_id
- `tax_classification.*`: type_document_identification_id, type_organization_id, type_regime_id, type_liability_id
- `brand.logo_url`
- `legal_representative.*`: name, identification, phone, email, signature_url
- `accountant.*`: name, identification, phone, email, signature_url
- `tax_auditor.*`: name, identification, phone, email, signature_url

## Archivos modificados

### company-service
- `company-settings.helper.ts` - Nuevos metodos: `getAllCompanyProfile()`, `upsertCompanyInfo()`, `upsertTaxClassification()`, `upsertAccountant()`, `upsertTaxAuditor()`
- `companies.service.ts` - `getCompany()` lee de tenant, updates escriben en tenant + sync a master, `registerCompany()` escribe datos iniciales en tenant, `syncWithDian()` lee de tenant
- `constants/nit-dependent-fields.ts` - Actualizado: master solo tiene logo_url, tenant tiene todas las rutas de uploads en CompanySetting

### integrations-service (Twilio)
- `twilio-webhook.controller.ts` - Ruta cambiada: `POST /webhooks/twilio/whatsapp/:companyId`
- `twilio-webhook.service.ts` - Recibe companyId del path, ya no busca por whatsapp_number en master
- `twilio-send.service.ts` - StatusCallback URL incluye companyId
- `twilio.controller.ts` - `saveConfig()` guarda whatsapp_number en tenant CompanySetting en vez de master

### contagracia-shared-modules
- `schema-master.prisma` - Eliminados 26+ campos, FKs y relaciones parametricas de Company
- `migrations/20260227003028_migrate_company_to_tenant_settings/` - Migración SQL que elimina columnas + corrige drift de indices trgm
- `shared-tenant-context/tenant-context.service.ts` - `getCompanyEstablishmentData()` lee address/phone/municipality de tenant CompanySetting
- `prisma/scripts/seed-all-tenants.ts` - `seedCompanyProfileSettings()` ahora es no-op (datos se crean en registerCompany)

### auth-service
- `companies.service.ts` - Removido `phone` del select (ya no existe en master)

### admin-service
- `companies.service.ts` - `company_phone` y `address` ya no se leen de master (cadena vacia). Removidos includes de relaciones parametricas eliminadas (type_document_identification, type_organization, type_regime, type_liability, country, department, municipality)

### media-service
- `scripts/migrate-existing-uploads.ts` - Removida referencia a `legal_rep_signature_url`. Fix tipado `Set<unknown>` → `string[]`

### Frontend
- `company-profile/page.tsx` - Removidas interfaces de objetos parametricos (type_document_identification, etc.) del CompanyData type

## Pasos para desplegar

1. Generar Prisma clients:
   ```bash
   cd contagracia-shared-modules
   npx prisma generate --schema=prisma/schema-master.prisma
   npx prisma generate --schema=prisma/schema-tenant.prisma
   ```

2. Aplicar migración a master DB:
   ```bash
   npx prisma migrate deploy --schema=prisma/schema-master.prisma
   ```

3. Correr migraciones y seeds de tenants:
   ```bash
   npx ts-node prisma/scripts/migrate-all-tenants.ts
   npx ts-node prisma/scripts/seed-all-tenants.ts
   ```

4. Actualizar webhook URL en Twilio dashboard para cada empresa:
   - Antes: `https://domain/webhooks/twilio/whatsapp`
   - Ahora: `https://domain/webhooks/twilio/whatsapp/{companyId}`

## Notas
- La migración SQL usa `IF EXISTS` para ser idempotente
- `seed-all-tenants` es no-op para profile settings (datos se escriben al registrar empresa)
- auth-service NO cambia para login (logo_url sigue como copia en master)
- CRM template variables (company.phone, company.address) quedan pendientes de migrar — fuera de scope
- Los indices trgm en `modules` (creados por seed.ts) fueron re-declarados en la migración para corregir drift previo
