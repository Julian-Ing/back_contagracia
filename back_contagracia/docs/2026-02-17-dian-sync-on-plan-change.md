# Sincronización DIAN al cambiar Plan/Módulos

**Fecha:** 2026-02-17

## Resumen

Cuando se cambia el plan de una compañía o se agregan módulos `electronic_documents` a un plan, se dispara automáticamente la sincronización con el API DIAN para todas las compañías afectadas.

## Casos de sincronización

### 1. Cambiar plan a una compañía (`PATCH /admin/companies/:id/subscription`)

- **Dónde:** `admin-service/companies.service.ts` → `manageSubscription()`
- **Qué:** Cambia el plan de una compañía y luego sincroniza esa compañía con DIAN
- **Cómo:** Hace HTTP POST a `COMPANY_SERVICE_SYNC_URL/internal/sync-dian` con `{ company_id }`
- **No bloquea:** Si falla el sync, continúa (error es logged)

### 2. Reemplazar módulos de un plan (`POST /admin/plans/:id/modules`)

- **Dónde:** `admin-service/plans.service.ts` → `setPlanModules()`
- **Qué:** Reemplaza TODOS los módulos del plan
- **Sincroniza si:** El plan tiene módulo `electronic_documents` después del cambio
- **A quién:** TODAS las compañías con suscripción activa a ese plan
- **Cómo:** Loop sobre todas las compañías, HTTP POST a `COMPANY_SERVICE_SYNC_URL/internal/sync-dian`
- **No bloquea:** Si falla sync para una compañía, continúa con las demás

### 3. Agregar un módulo a un plan (`POST /admin/plans/:id/modules/add`)

- **Dónde:** `admin-service/plans.service.ts` → `addPlanModule()`
- **Qué:** Agrega UN módulo al plan
- **Sincroniza si:** El módulo agregado es `electronic_documents`
- **A quién:** TODAS las compañías con suscripción activa a ese plan
- **Cómo:** HTTP POST a `COMPANY_SERVICE_SYNC_URL/internal/sync-dian` para cada compañía
- **No bloquea:** Errores no bloquean

## Endpoint interno

**`POST /internal/sync-dian`** (company-service, privado)

- **Body:** `{ company_id: string }`
- **Respuesta:** `{ success: boolean; message: string }`
- **Qué hace:** Llama `syncDianByCompanyId(companyId)` que ejecuta la lógica de sync
- **Decorador:** `@Public()` para permitir llamadas desde admin-service (sin JWT)

## Configuración

### admin-service/.env
```
COMPANY_SERVICE_SYNC_URL="http://localhost:3003/internal/companies/sync-dian"
```

## Flujo de integración

```
admin-service (cambio plan/módulos)
    ↓
Valida y actualiza BD master
    ↓
Propaga módulos a tenants (sync BD)
    ↓
Llama HTTP → company-service/internal/sync-dian
    ↓
company-service (syncDianByCompanyId)
    ↓
Valida que compañía tenga electronic_documents en plan
    ↓
Obtiene datos de master (NIT, paramétricas, etc)
    ↓
Llama DianApiService.syncCompany()
    ↓
Guarda token en tenant CompanySetting
```

## Notas
- Los syncs se hacen de forma **asincrónica** (`.catch()` para no bloquear)
- No hay reintentos si falla una sincronización
- Cada compañía se sincroniza independientemente
- Si multiple módulos se agregan al plan, solo `electronic_documents` dispara sync
