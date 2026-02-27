# Separación de endpoints de actualización de empresa

**Fecha:** 2026-02-17

## Problema

El endpoint monolítico `PATCH /companies/:id` validaba TODOS los campos aunque el frontend solo actualizara campos específicos. El frontend tiene 3 secciones separadas pero todas llamaban al mismo endpoint con el mismo DTO.

## Solución

Se crearon 4 endpoints especializados (3 nuevos + 1 existente):

1. **PATCH /companies/:id/info** - Información general (NIT, razón social, email, etc.)
2. **PATCH /companies/:id/legal-representative** - Representante legal
3. **PATCH /companies/:id/settings** - Configuración de decimales
4. **POST /companies/:id/logo** - Logo (ya existía)

## Cambios Backend

### Nuevos DTOs

**`src/modules/companies/dto/update-company-info.dto.ts`** (NUEVO)
- Solo campos de información general de la empresa
- NO incluye legal_rep_* ni display_decimals

**`src/modules/companies/dto/update-legal-rep.dto.ts`** (NUEVO)
- Solo campos del representante legal: legal_rep_name, legal_rep_identification, legal_rep_phone, legal_rep_email

**`src/modules/companies/dto/update-settings.dto.ts`** (NUEVO)
- Solo display_decimals (validado entre 0-4)

### Nuevos métodos en `companies.service.ts`

**`updateCompanyInfo(companyId, data)`**
- Actualiza info general de la empresa
- Maneja renombrado de carpetas si cambia el NIT
- Usa DV calculado en frontend (NO recalcula)
- Sincroniza con DIAN después del update

**`updateLegalRep(companyId, data)`**
- Actualiza solo campos del representante legal
- No afecta otros campos de la empresa

**`updateSettings(companyId, data)`**
- Actualiza display_decimals en CompanySetting (tenant DB)
- Envía notificación realtime para actualizar otros usuarios conectados

### Nuevos endpoints en `companies.controller.ts`

**PATCH /companies/:id/info**
- Endpoint: `updateCompanyInfo()`
- Audit: `company.info.updated`
- DTO: UpdateCompanyInfoDto

**PATCH /companies/:id/legal-representative**
- Endpoint: `updateLegalRep()`
- Audit: `company.legal-rep.updated`
- DTO: UpdateLegalRepDto

**PATCH /companies/:id/settings**
- Endpoint: `updateSettings()`
- Audit: `company.settings.updated`
- DTO: UpdateSettingsDto

## Cambios Frontend

### Nuevos tipos en `src/modules/company/types/index.ts`

```typescript
export interface UpdateCompanyInfoDto { ... }
export interface UpdateLegalRepDto { ... }
export interface UpdateSettingsDto { ... }
```

### Nuevos métodos en `company.service.ts`

- `updateCompanyInfo(companyId, data)` → PATCH /companies/:id/info
- `updateLegalRep(companyId, data)` → PATCH /companies/:id/legal-representative
- `updateSettings(companyId, data)` → PATCH /companies/:id/settings

### Cambios en `src/app/dashboard/company-profile/page.tsx`

**`performSaveGeneral()`**
- Antes: llamaba `updateCompany()` con TODOS los campos
- Después: llama `updateCompanyInfo()` solo con campos de info general

**`handleSaveLegalRep()`**
- Antes: llamaba `updateCompany()` con TODOS los campos
- Después: llama `updateLegalRep()` solo con campos de representante legal

### Cambios en `CompanySettingsProvider.tsx`

**`setDisplayDecimals()`**
- Antes: llamaba `updateCompany(id, { display_decimals } as any)`
- Después: llama `updateSettings(id, { display_decimals })`

## Manejo de campos dependientes del NIT

Cuando el NIT de una empresa cambia, se deben actualizar automáticamente todos los campos que contienen rutas de uploads con el NIT en su path.

### Configuración centralizada

**Archivo:** `contagracia-shared-modules/src/constants/nit-dependent-fields.ts`

Define TODOS los campos que contienen rutas con NIT:
- Campos en master DB (tabla Company): `logo_url`, `legal_rep_signature_url`
- Campos en tenant DB (tabla CompanySetting): `certificate_path`

**Para agregar un nuevo campo:**
1. Abrir `contagracia-shared-modules/src/constants/nit-dependent-fields.ts`
2. Agregar el campo al array correspondiente (`master` o `tenant`)
3. La actualización será automática, NO requiere modificar `renameUploadFolders()`

### Función `renameUploadFolders()`

Refactorizada para ser genérica y escalable:
- Lee la configuración desde `NIT_DEPENDENT_FIELDS`
- Itera sobre todos los campos configurados
- Actualiza automáticamente las rutas reemplazando `oldNit` por `newNit`
- Retorna un objeto dinámico con todos los campos actualizados

**Antes:**
```typescript
renameUploadFolders(companyId, oldNit, newNit, currentLogoUrl, currentSignatureUrl)
// Retorna: { newLogoUrl, newSignatureUrl }
```

**Después:**
```typescript
renameUploadFolders(companyId, oldNit, newNit, currentValues)
// currentValues: { logo_url: '...', legal_rep_signature_url: '...' }
// Retorna: { logo_url: '...', legal_rep_signature_url: '...', ... }
```

## Servicio de archivos estáticos

**Archivo:** `company-service/src/main.ts`

Se agregó configuración para servir archivos estáticos desde la carpeta `uploads`:

```typescript
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

const app = await NestFactory.create<NestExpressApplication>(AppModule, {...});

const uploadsPath = join(__dirname, '..', '..', '..', '..', 'uploads');
app.useStaticAssets(uploadsPath, {
  prefix: '/uploads/',
});
```

Ahora company-service (puerto 3003) sirve todos los archivos de uploads (logos, firmas, certificados).

## Resultado

- ✅ Cada sección del frontend actualiza solo los campos que le corresponden
- ✅ Validación DTO específica para cada endpoint
- ✅ Mejor separación de responsabilidades
- ✅ Auditoría más granular (`company.info.updated`, `company.legal-rep.updated`, `company.settings.updated`)
- ✅ Configuración de decimales con notificación realtime
- ✅ Manejo automático de campos con rutas de NIT (escalable y mantenible)
- ✅ Company-service sirve archivos estáticos de uploads
