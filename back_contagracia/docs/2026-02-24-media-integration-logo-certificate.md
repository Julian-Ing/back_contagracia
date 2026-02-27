# Integración Media Service — Logo de empresa y Certificado digital

**Fecha:** 2026-02-24

## Resumen

Se integró media-service para gestionar el logo de empresa y el certificado digital (.p12), reemplazando el almacenamiento directo en disco sin control de acceso.

## Cambios

### 1. company-service: Endpoint PATCH /companies/:id/brand

**Archivos:**
- `company-service/src/modules/companies/dto/update-brand.dto.ts` (nuevo)
- `company-service/src/modules/companies/companies.service.ts` (método `updateBrand`)
- `company-service/src/modules/companies/companies.controller.ts` (endpoint `PATCH :id/brand`)

**Motivo:** `UpdateCompanyDto` requiere todos los campos (nit, nombre, etc.). Se creó un DTO separado `UpdateBrandDto` con campos opcionales `logo_url` y `legal_rep_signature_url` para actualizar solo la marca.

**Flujo:**
1. Frontend sube imagen a media-service → recibe `/api/media/{uuid}`
2. Frontend hace `PATCH /companies/:id/brand` con `{ logo_url: "/api/media/{uuid}" }`
3. Backend guarda en CompanySetting del tenant + tabla Company de master

### 2. electronic-documents-service: Certificado vía media-service

**Archivos:**
- `electronic-documents-service/src/modules/certificate/certificate.service.ts` (reescrito)
- `electronic-documents-service/src/modules/certificate/certificate.controller.ts` (pasa JWT)

**Antes:** El certificado .p12 se guardaba como archivo en disco en ruta predecible sin control de acceso.

**Ahora:**
1. Valida archivo → envía a API DIAN (base64)
2. Si DIAN OK → sube a media-service con `category: certificate`, `visibility: private`
3. Guarda URL `/api/media/{uuid}` en CompanySetting del tenant
4. Soft-delete del certificado anterior en media-service

**Nota técnica:** Se usa el paquete `form-data` con `getBuffer()` + `getHeaders()` para enviar multipart desde backend a media-service via `fetch()`. No se puede pasar el stream de `form-data` directo a `fetch()` nativo de Node.

### 3. media-service: Permisos corregidos en category-config.ts

**Archivo:** `media-service/src/modules/media/category-config.ts`

Permisos corregidos para usar los del seeder real:
| Categoría | uploadPermission | viewPermission | visibility |
|-----------|-----------------|----------------|------------|
| company_logo | `company.logo.upload` | null | company |
| company_signature | `company.signature.upload` | null | company |
| certificate | `electronic_documents.certificate.load` | `electronic_documents.certificate.load` | private |
| employee_document | `employees.edit` | `employees.view` | company |

### 4. Migración: tabla media con IF NOT EXISTS

**Archivo:** `contagracia-shared-modules/prisma/migrations/20260224142101_add_media_table/migration.sql`

Todos los statements usan `IF NOT EXISTS` / `IF EXISTS` porque algunos compañeros ya tienen las tablas via `db push`.

### 5. Workspace: electronic-documents-service habilitado

- `pnpm-workspace.yaml`: descomentado
- `package.json`: scripts `dev:electronic`, `build:electronic`, `start:electronic` agregados y agregado a `dev:all`

## Almacenamiento en disco

```
uploads/media/{category}/{company_id}/{uuid}.ext
```

- Metadata en tabla `media` (tenant DB si tiene company_id, master DB si no)
- Acceso via `GET /api/media/{uuid}` con JWT + MediaAccessGuard
