# Módulo shared-dian — Integración API DIAN

**Fecha:** 2026-02-17

## Resumen

Se creó el módulo `shared-dian` en `contagracia-shared-modules` para centralizar toda la comunicación con la API DIAN. Se migró la consulta de RUT (que estaba en el frontend con token expuesto) al backend, y se implementó la sincronización automática de empresas con la API DIAN.

## Archivos creados

- `contagracia-shared-modules/shared-dian/src/dian-api.module.ts` — Módulo `@Global()`, registra servicio y controller
- `contagracia-shared-modules/shared-dian/src/dian-api.service.ts` — Servicio con `queryRut()`, `syncCompany()`, `getDianToken()`
- `contagracia-shared-modules/shared-dian/src/dian-api.controller.ts` — Endpoint `POST /dian/query-rut` (`@Public`)
- `contagracia-shared-modules/shared-dian/src/index.ts` — Exports

## Archivos modificados

- `contagracia-shared-modules/index.ts` — Export de shared-dian
- `company-service/src/app.module.ts` — Import de `DianApiModule`
- `company-service/src/modules/companies/companies.service.ts` — Inyección de `DianApiService`, método `syncWithDian()`
- `electronic-documents-service/src/app.module.ts` — Import de `DianApiModule`

## Variables de entorno

Cada servicio que use `DianApiModule` necesita en su `.env`:
- `DIAN_API_URL` — URL base del API (ej: `https://api.contagracia.com`)
- `DIAN_API_TOKEN_RUT` — Token para consulta de RUT (solo si usa `queryRut`)

## Flujo de sincronización

1. En `registerCompany()` y `updateCompany()` se llama `syncWithDian(companyId)`
2. Se lee la empresa de **master** con include de paramétricas (para obtener `code`)
3. Se verifica que la suscripción activa tenga el módulo `electronic_documents`
4. `dianApiService.syncCompany()` lee el token existente de **tenant** `CompanySetting` (category: `dian`, key: `api_dian_token`)
5. Llama `POST /api/ubl2.1/config/{nit}/{dv}` al API DIAN
6. Si es primera vez, guarda el token retornado en `CompanySetting`
7. Si falla, solo loguea warning — no bloquea el flujo principal

## Migración de queryRut

- **Antes:** Frontend llamaba directamente al API DIAN con token expuesto en `NEXT_PUBLIC_API_TOKEN_FOR_RUT`
- **Ahora:** Frontend llama a `electronic-documents-service` → `POST /dian/query-rut` → backend llama al API DIAN
- Se eliminaron las vars `NEXT_PUBLIC_API_URL` y `NEXT_PUBLIC_API_TOKEN_FOR_RUT` del frontend
