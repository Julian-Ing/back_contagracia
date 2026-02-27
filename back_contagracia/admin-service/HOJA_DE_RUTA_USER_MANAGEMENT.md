# Hoja de Ruta: Gestión de Usuarios Master

## Objetivo

Implementar la gestión de usuarios de la base de datos master desde el panel de administración (`/admin/user-accounts`). Permite listar, buscar, crear y activar/desactivar usuarios. La creación desde admin **no requiere verificación de email** (a diferencia del flujo público que usa OTP + registration_token).

---

## Estado General

| Fase | Descripción | Estado |
|------|-------------|--------|
| Fase 1 | Backend — Módulo users en admin-service | ✅ Completado |
| Fase 2 | Frontend — Service layer y tipos | ✅ Completado |
| Fase 3 | Frontend — Conectar page.tsx (reemplazar mocks) | ✅ Completado |
| Fase 4 | Frontend — Agregar link en sidebar | ✅ Completado |
| Fase 5 | Eliminar usuario con toda su data (tenancy) | ✅ Completado |

---

## Contexto

### Estado Actual

- **Backend (admin-service):** No existe módulo de usuarios. Los endpoints `GET /admin/users` y `GET /admin/overview` referenciados en el frontend no existen
- **Frontend:** Página completa en `/admin/user-accounts` (~265 líneas) con UI funcional pero usando `MOCK_USERS` y `setTimeout`
- **Frontend service:** `adminService.getUsers()` definido pero sin endpoint backend
- **Sidebar:** No tiene link a la gestión de usuarios
- **Prisma:** Modelo `User` completo en `schema-master.prisma` con campos: email, password_hash, full_name, phone, avatar_url, is_active, email_verified, last_login_at, etc. Relación `user_companies` (M:N con Company)

### Flujo de Registro Público (referencia)

El flujo público actual en `auth-service` + `company-service` requiere:
1. `POST /auth/send-verification-code` → envía OTP al email
2. `POST /auth/verify-code` → valida OTP, retorna `registration_token`
3. `POST /companies/register` → crea user + company + tenant DB (requiere `registration_token`)

**En admin:** Se crea el usuario directamente con `email_verified: true`, sin OTP ni token.

### Arquitectura Backend (referencia: `back_contagracia/README.md`)

- **Monorepo pnpm** con workspaces
- **admin-service:** Puerto 3002, NestJS + Prisma
- **Prisma:** `schema-master.prisma` genera `@prisma/client-master`
- **Patrón:** Controller + Service + DTO (class-validator + Swagger)
- **Módulos existentes en admin-service:** SystemActions, Plans, Catalogs, CMS, Categories, Companies, Blog

### Arquitectura Frontend (referencia: `front_contagracia/ARQUITECTURA.md`)

- **Feature-based:** Módulos en `src/modules/` con components, hooks, services, stores, types
- **Shared UI:** `src/shared/components/ui/` (Shadcn)
- **API Client:** `adminClient` de `@/shared/services/api/apiClient` (Axios) → admin-service (3002)
- **Service Pattern:** `export const adminService = { ... }` con métodos async
- **Toast:** `react-hot-toast`
- **Icons:** Lucide React

---

## Decisiones de Diseño

### Users en admin-service (no users-service separado)

El README menciona `users-service` (puerto 3004) como pendiente, pero ese servicio es para gestión de usuarios **dentro de tenants** (empleados de cada empresa). La gestión de usuarios **master** (dueños de companies, admins del sistema) pertenece a `admin-service` porque:
1. Usa la misma DB master que el resto de endpoints admin
2. Es funcionalidad exclusiva del super admin
3. No justifica un microservicio separado para CRUD simple

### Creación sin verificación de email

Cuando el admin crea un usuario:
- Se marca `email_verified: true` automáticamente
- Se marca `is_active: true`
- Password se hashea con bcrypt (12 rounds, mismo patrón que company-service)
- No se envía email de verificación ni OTP
- El usuario puede hacer login inmediatamente

### Interface UserAccount (ya definida)

```typescript
export interface UserAccount {
  id: string;
  email: string;
  full_name?: string;
  status: 'active' | 'inactive' | 'pending';
  role: 'admin' | 'user';
  created_at: string;
  company_id?: string;
  company_name?: string;
  company_role?: 'admin' | 'user';
}
```

---

## Implementación por Fases

### Fase 1: Backend — Módulo users en admin-service

**Archivos a crear:**
```
admin-service/src/modules/users/
├── users.module.ts
├── users.controller.ts    # @Controller('admin/users')
├── users.service.ts
└── dto/
    ├── index.ts
    ├── create-user.dto.ts
    └── update-user-status.dto.ts
```

**Endpoints:**

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/admin/users` | Listar usuarios paginados con búsqueda y filtro por status |
| `POST` | `/admin/users` | Crear usuario (sin verificación de email) |
| `PATCH` | `/admin/users/:id/status` | Activar/desactivar usuario |

**CreateUserDto:**
- `email` (required, @IsEmail)
- `password` (required, @MinLength(8))
- `full_name` (optional, @IsString)
- `phone` (optional, @IsString)

**UpdateUserStatusDto:**
- `status` (required, @IsIn(['active', 'inactive']))

**Service `create` lógica:**
1. Validar email no existe (409 Conflict si duplicado)
2. Hash password con bcrypt (12 rounds)
3. Crear user con `email_verified: true`, `is_active: true`
4. Retornar usuario creado (sin password_hash)

**Service `findAll` lógica:**
1. Query `User` con include `user_companies → company`
2. Filtro `search`: buscar en `email`, `full_name` (case-insensitive)
3. Filtro `status`: active (is_active=true), inactive (is_active=false)
4. Paginación: page, limit, skip
5. Transform a `UserAccount` interface

**Service `updateStatus`:**
- `prisma.user.update({ where: { id }, data: { is_active: status === 'active' } })`

**Registrar:** Importar `UsersModule` en `admin-service/src/app.module.ts`

---

### Fase 2: Frontend — Service layer

**Archivo:** `front_contagracia/src/modules/admin/services/admin.service.ts`

Agregar métodos:
- `createUser(data)` → `POST /admin/users`
- `updateUserStatus(userId, status)` → `PATCH /admin/users/:id/status`

(El método `getUsers()` ya existe)

---

### Fase 3: Frontend — Conectar page.tsx

**Archivo:** `front_contagracia/src/app/admin/user-accounts/page.tsx`

**Cambios:**
1. Eliminar `MOCK_USERS` y `setTimeout` simulado
2. Usar `adminService.getUsers()` para cargar datos reales
3. Usar `adminService.updateUserStatus()` para toggle activar/desactivar
4. Agregar botón "Crear Usuario" en header → abre modal
5. Modal con formulario: email, password, nombre completo, teléfono
6. Crear usuario con `adminService.createUser()`
7. Toast de éxito/error con `react-hot-toast`
8. Fix: quitar botón `LayoutGrid` que no está importado

---

### Fase 4: Frontend — Sidebar

**Archivo:** `front_contagracia/src/shared/components/layout/AdminSidebar.tsx`

Agregar en sección "main" (después de "Gestión de Planes"):
```typescript
{ id: 'users', label: 'Gestión de Usuarios', href: '/admin/user-accounts', icon: UserCog }
```

---

## Criterios de Aceptación

### Fase 1: Backend
- [x] Módulo users (controller + service + DTOs)
- [x] `GET /admin/users` lista usuarios con paginación, búsqueda y filtro
- [x] `POST /admin/users` crea usuario con email_verified=true sin OTP
- [x] `PATCH /admin/users/:id/status` activa/desactiva usuario
- [x] Validación con class-validator y Swagger docs
- [x] Build exitoso sin errores

### Fase 2: Frontend — Service
- [x] Método `createUser` en adminService
- [x] Método `updateUserStatus` en adminService

### Fase 3: Frontend — Página
- [x] Mocks eliminados
- [x] Lista de usuarios cargada desde backend
- [x] Búsqueda por email/nombre funcional
- [x] Toggle activar/desactivar con toast
- [x] Modal de creación de usuario funcional
- [x] Toast de éxito/error

### Fase 4: Frontend — Sidebar
- [x] Link "Gestión de Usuarios" visible en sidebar admin
- [x] Navegación funcional a `/admin/user-accounts`

---

## Archivos Creados/Modificados

| Archivo | Acción |
|---------|--------|
| `admin-service/src/modules/users/users.module.ts` | Crear |
| `admin-service/src/modules/users/users.controller.ts` | Crear |
| `admin-service/src/modules/users/users.service.ts` | Crear |
| `admin-service/src/modules/users/dto/create-user.dto.ts` | Crear |
| `admin-service/src/modules/users/dto/update-user-status.dto.ts` | Crear |
| `admin-service/src/modules/users/dto/index.ts` | Crear |
| `admin-service/src/app.module.ts` | Modificar (agregar UsersModule) |
| `front_contagracia/src/modules/admin/services/admin.service.ts` | Modificar (agregar métodos) |
| `front_contagracia/src/app/admin/user-accounts/page.tsx` | Modificar (reemplazar mocks) |
| `front_contagracia/src/shared/components/layout/AdminSidebar.tsx` | Modificar (agregar link) |

---

## Endpoints Disponibles (post-implementación)

| Método | Ruta | Query Params | Descripción |
|--------|------|-------------|-------------|
| `GET` | `/admin/users` | `page`, `limit`, `search`, `status` | Listar usuarios |
| `POST` | `/admin/users` | — | Crear usuario |
| `PATCH` | `/admin/users/:id/status` | — | Activar/desactivar |

---

## Notas

### Relación User ↔ Company

Un usuario puede tener 0 o N compañías a través de `UserCompany` (tabla M:N). La página muestra la primera compañía asociada. Usuarios sin compañía se muestran como "Sin compañía asignada".

### Sobre users-service (puerto 3004)

El README del backend lista `users-service` como pendiente. Ese servicio futuro es para gestión de usuarios **dentro de cada tenant** (empleados, contadores, etc.). No confundir con esta funcionalidad que gestiona usuarios **master** (dueños de empresas y admins del sistema).

---

## Fase 5: Eliminar usuario con toda su data (tenancy incluida)

### Objetivo

Agregar `DELETE /admin/users/:id` que elimina un usuario y **todo** lo asociado: compañías owned, tenant databases, subscriptions, permissions, etc.

### Flujo de eliminación

1. Buscar usuario con sus `user_companies` (include company)
2. Para cada compañía donde es **owner** (`is_primary = true`):
   - Terminar conexiones activas al tenant DB (`pg_terminate_backend`)
   - `DROP DATABASE IF EXISTS "{db_name}"`
   - `DELETE company` (cascade en master elimina: subscriptions, user_companies, permissions, category_assignments, notifications)
3. `DELETE user` (cascade elimina: user_companies restantes, refresh_tokens, sessions, email_verifications, password_resets, action_permissions, module_permissions)
4. BlogPosts quedan con `author_id = null` (onDelete: SetNull en schema)

### Backend

**`users.service.ts`** — Agregar método `remove(id)`:
- Busca usuario + user_companies + company
- Loop: si `is_primary` y `company.db_name` existe → terminate connections → DROP DB → delete company
- Finalmente: `prisma.user.delete({ where: { id } })`

**`users.controller.ts`** — Agregar:
```typescript
@Delete(':id')
@ApiOperation({ summary: 'Eliminar usuario y toda su data (tenant DB incluida)' })
remove(@Param('id') id: string) {
  return this.usersService.remove(id);
}
```

### Frontend

**`admin.service.ts`** — Agregar `deleteUser(userId)` → `DELETE /admin/users/${userId}`

**`page.tsx`** — Agregar:
- Botón "Eliminar" (rojo, icono Trash2) junto a activar/desactivar
- Diálogo de confirmación con advertencia de que elimina compañía + tenant DB
- Llamar `adminService.deleteUser()` → toast → refrescar lista

### Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `admin-service/src/modules/users/users.service.ts` | Agregar `remove()` |
| `admin-service/src/modules/users/users.controller.ts` | Agregar `@Delete(':id')` |
| `front_contagracia/src/modules/admin/services/admin.service.ts` | Agregar `deleteUser()` |
| `front_contagracia/src/app/admin/user-accounts/page.tsx` | Botón eliminar + confirmación |

### Criterios de Aceptación

- [x] Endpoint `DELETE /admin/users/:id` funcional
- [x] Elimina tenant DB (DROP DATABASE) de compañías owned
- [x] Elimina compañía y cascadas en master DB
- [x] Elimina usuario y cascadas en master DB
- [x] Botón "Eliminar" con diálogo de confirmación en UI
- [x] Toast éxito/error
- [x] Build exitoso
