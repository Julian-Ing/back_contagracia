# Arquitectura Multi-Tenant Simplificada

**Fecha:** 2026-01-31

## Resumen

Se simplificó la arquitectura de autenticación y permisos para el sistema multi-tenant, eliminando tablas redundantes del schema master y centralizando la gestión de usuarios de empresa en las bases de datos tenant.

## Cambios Realizados

### 1. Modelo de Autenticación

**Antes:**
- Los usuarios de empresa existían tanto en master (`User` + `UserCompany`) como en tenant (`TenantUser`)
- Permisos duplicados en master y tenant

**Ahora:**
- **System Admins**: Solo en tabla `User` del master (login SIN NIT)
- **Company Users**: Solo en tabla `TenantUser` del tenant (login CON NIT)

### 2. Archivos Modificados

#### `auth.service.ts`
- Login con NIT valida contra `TenantUser` en la base de datos del tenant
- Login sin NIT valida contra `User` en master (solo admins del sistema)
- Respuesta de login ahora retorna `nit` en lugar de `tax_id` para consistencia con el frontend

#### `interfaces/auth-response.interface.ts`
- Campo `company.tax_id` renombrado a `company.nit`

#### `permissions/permissions.service.ts`
- Simplificado para solo verificar módulos del plan de la empresa
- Los permisos específicos de usuario se manejan en el tenant

#### `permissions/permission-resolution.service.ts`
- Eliminada dependencia de Redis (caché de permisos)
- Solo verifica si módulos están incluidos en el plan

#### `permissions/permissions.controller.ts`
- Simplificado a solo dos endpoints:
  - `GET /modules`: Lista módulos habilitados del plan
  - `POST /check-module`: Verifica acceso a un módulo específico

#### `companies/companies.service.ts`
- Método `getMyCompanies` simplificado para la nueva arquitectura

#### `passwords/passwords.service.ts`
- Maneja cambio y recuperación de contraseña tanto para `User` (master) como `TenantUser` (tenant)
- Usa campo `metadata` en `PasswordReset` para almacenar `tenant_user_id` y `company_id`

### 3. Tablas Eliminadas del Master

Las siguientes tablas fueron eliminadas del schema master (migración `20260131170416_remove_user_company_tables`):
- `UserCompany`
- `UserActionPermission`
- `UserModulePermission`

### 4. Sesiones y Password Resets

- `Session.user_id` ahora es opcional (null para sesiones de TenantUser)
- `Session.metadata` almacena `tenant_user_id` y `company_id` para sesiones de empresa
- `PasswordReset.user_id` ahora es opcional
- `PasswordReset.metadata` almacena datos del tenant para resets de usuarios de empresa

## Flujo de Autenticación

```
┌─────────────────────────────────────────────────────────────┐
│                      LOGIN REQUEST                          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │  ¿Tiene NIT?  │
                    └───────────────┘
                     │           │
                    YES         NO
                     │           │
                     ▼           ▼
        ┌────────────────┐  ┌────────────────┐
        │ Buscar Company │  │  Buscar User   │
        │   por NIT      │  │  en Master     │
        └────────────────┘  └────────────────┘
                │                    │
                ▼                    ▼
        ┌────────────────┐  ┌────────────────┐
        │Conectar Tenant │  │ Validar como   │
        │Buscar TenantUser│  │ System Admin   │
        └────────────────┘  └────────────────┘
                │                    │
                ▼                    ▼
        ┌────────────────┐  ┌────────────────┐
        │ user_type:     │  │ user_type:     │
        │ company_user   │  │ system_admin   │
        └────────────────┘  └────────────────┘
```

## Notas de Migración

1. Los usuarios existentes en `UserCompany` deben migrarse a `TenantUser` en sus respectivos tenants
2. Los permisos de `UserActionPermission` deben migrarse a `TenantUserPermission`
3. Las sesiones activas con `user_type: company_user` deben tener `user_id: null` y usar `metadata`
