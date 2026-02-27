# Hoja de Ruta: Companies & Categories - Admin Service

## Objetivo

Implementar la funcionalidad completa de gestión de compañías y categorías, replicando las capacidades del proyecto anterior (`horizont`) adaptándolas a la nueva arquitectura NestJS + Prisma + Next.js.

---

## Contexto

### Proyecto anterior (`horizont`)
- **Archivo:** `src/pages/admin/UserManagement.jsx` (~1079 líneas)
- **Archivo:** `src/pages/admin/CompanyCategories.jsx` (~500 líneas)
- **Stack:** React + Supabase (RPC + Edge Functions)
- **Ruta:** `/#/admin/users` y `/#/admin/categories`

### Proyecto nuevo (`NuevoContagracia`)
- **Backend:** NestJS microservicio `admin-service` (puerto 3002)
- **Frontend:** Next.js 16 + React 19 + TypeScript
- **Database:** PostgreSQL + Prisma ORM (master + tenant)
- **Rutas:** `/admin/companies` y `/admin/categories`
- **Estado actual:** ✅ Completado — Backend y frontend funcionales

---

## Alcance Funcional

### Categories (`/admin/categories`)

| Funcionalidad | Anterior | Nuevo | Estado |
|---|---|---|---|
| Listar categorías con conteo de compañías | ✅ Supabase query | ✅ API REST | Completado |
| Crear categoría (nombre, descripción, color) | ✅ INSERT | ✅ POST /categories | Completado |
| Editar categoría | ✅ UPDATE | ✅ PATCH /categories/:id | Completado |
| Eliminar categoría (cascade assignments) | ✅ DELETE + FK cascade | ✅ DELETE /categories/:id | Completado |
| Validar nombre único (error 23505) | ✅ Catch Supabase | ✅ ConflictException | Completado |
| 11 colores preset + custom picker | ✅ UI | ✅ UI maquetada | Listo |
| Empty state con botón crear | ✅ | ✅ UI maquetada | Listo |

### Companies (`/admin/companies`)

| Funcionalidad | Anterior | Nuevo | Estado |
|---|---|---|---|
| Listar compañías con datos enriquecidos | ✅ RPC `get_admin_company_users()` | ✅ GET /companies | Completado |
| Búsqueda por nombre, NIT, email | ✅ Client-side filter | ✅ Server-side query | Completado |
| Filtro por expiración (expired/30/60/90/90+) | ✅ Client-side | ✅ Server-side query | Completado |
| Filtro por categoría | ✅ Client-side | ✅ Server-side query | Completado |
| Paginación (15 items/página) | ✅ Client-side | ✅ Server-side | Completado |
| Gestionar suscripción (plan, status, fecha, user_plus) | ✅ RPC `update_company_subscription` + UPDATE | ✅ PATCH /companies/:id/subscription | Completado |
| Asignar/remover categorías (popover editor) | ✅ DELETE + INSERT assignments | ✅ PUT /companies/:id/categories | Completado |
| Cambiar rol (admin/user) | ✅ RPC `update_user_role` | ✅ PATCH /companies/:id/role | Completado |
| Cambiar status (active/inactive) | ✅ RPC `set_user_status` | ✅ PATCH /companies/:id/status | Completado |
| Eliminar compañía (cascade) | ✅ Edge Function `delete-user-admin` | ✅ DELETE /companies/:id | Completado |
| Login como compañía (magic link) | ✅ Edge Function `admin-login-as-company` | ✅ POST /companies/:id/impersonate | Completado |
| Notificaciones toast | ✅ Custom toast | ✅ react-hot-toast | Completado |
| Loading states | ✅ | ✅ UI maquetada | Listo |
| Badges de expiración (rojo/amber/verde) | ✅ | ✅ UI maquetada | Listo |

---

## Implementación por Fases

### Fase 1: Base de Datos

**Archivo:** `contagracia-shared-modules/prisma/schema-master.prisma`

**Modelos a agregar:**

```prisma
model CompanyCategory {
  id          String   @id @default(uuid())
  name        String   @unique
  description String?
  color       String   @default("#6366f1")
  is_active   Boolean  @default(true)
  created_at  DateTime @default(now())
  updated_at  DateTime @updatedAt

  assignments CompanyCategoryAssignment[]

  @@map("company_categories")
}

model CompanyCategoryAssignment {
  id          String   @id @default(uuid())
  company_id  String
  category_id String
  assigned_at DateTime @default(now())

  company     Company         @relation(fields: [company_id], references: [id], onDelete: Cascade)
  category    CompanyCategory @relation(fields: [category_id], references: [id], onDelete: Cascade)

  @@unique([company_id, category_id])
  @@index([company_id])
  @@index([category_id])
  @@map("company_category_assignments")
}
```

**Relación a agregar en Company existente:**
```prisma
category_assignments CompanyCategoryAssignment[]
```

**Comandos (desde `contagracia-shared-modules/`):**
```bash
cd contagracia-shared-modules

# Generar clientes Prisma actualizados
pnpm prisma:generate

# Sincronizar schema con la BD (desarrollo)
pnpm prisma:push:master
```

> **Nota:** Se usa `prisma:push:master` (db push) para desarrollo según la guía del proyecto (`back_contagracia/README.md`). Para producción usar `pnpm prisma:migrate:dev`.

---

### Fase 2: Backend - Categories Module

**Ubicación:** `admin-service/src/modules/categories/`

**Archivos:**
```
categories/
├── categories.module.ts
├── categories.controller.ts
├── categories.service.ts
└── dto/
    ├── create-category.dto.ts
    ├── update-category.dto.ts
    └── index.ts
```

**Endpoints:**

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/admin/categories` | Listar todas con `_count.assignments` |
| GET | `/api/admin/categories/:id` | Obtener una con compañías asignadas |
| POST | `/api/admin/categories` | Crear (validar nombre único → ConflictException) |
| PATCH | `/api/admin/categories/:id` | Actualizar |
| DELETE | `/api/admin/categories/:id` | Eliminar (cascade via FK) |

**Patrón:** Igual que `PlansModule` (controller + service + dto con PartialType)

---

### Fase 3: Backend - Companies Module

**Ubicación:** `admin-service/src/modules/companies/`

**Archivos:**
```
companies/
├── companies.module.ts
├── companies.controller.ts
├── companies.service.ts
└── dto/
    ├── manage-subscription.dto.ts
    ├── update-company-role.dto.ts
    ├── update-company-status.dto.ts
    ├── assign-categories.dto.ts
    └── index.ts
```

**Endpoints:**

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/admin/companies` | Listar con filtros, paginación, includes |
| GET | `/api/admin/companies/:id` | Detalle completo |
| PATCH | `/api/admin/companies/:id/role` | Cambiar rol del owner en UserCompany |
| PATCH | `/api/admin/companies/:id/status` | Cambiar `is_active` de Company |
| PATCH | `/api/admin/companies/:id/subscription` | Actualizar suscripción (plan, status, fecha) |
| PUT | `/api/admin/companies/:id/categories` | Reemplazar categorías asignadas |
| DELETE | `/api/admin/companies/:id` | Eliminar compañía y datos asociados |
| POST | `/api/admin/companies/:id/impersonate` | Generar token JWT temporal como usuario de la compañía |

**Query GET /companies (parámetros):**
- `page` (default: 1)
- `limit` (default: 15)
- `search` (busca en company_name, nit, email del owner)
- `subscription_status` (trial/active/expired/cancelled)
- `expiration` (expired/30/60/90/more90)
- `category_id` (filtrar por categoría asignada)

**Response GET /companies:**
```json
{
  "data": [{
    "id": "uuid",
    "company_name": "...",
    "email": "owner@email.com",
    "company_nit": "...",
    "company_phone": "...",
    "user_created_at": "ISO date",
    "plan_name": "...",
    "plan_id": "uuid",
    "subscription_status": "trial|active|expired|cancelled",
    "subscription_ends_at": "ISO date",
    "invoice_count": 0,
    "role": "admin|user",
    "status": "active|inactive",
    "categories": [{ "id": "uuid", "name": "...", "color": "#..." }],
    "user_plus": 0
  }],
  "meta": {
    "total": 47,
    "page": 1,
    "limit": 15,
    "totalPages": 4
  }
}
```

---

### Fase 4: Frontend - Service Layer

**Archivo:** `front_contagracia/src/modules/admin/services/admin.service.ts`

**Métodos a implementar/reemplazar:**

```typescript
// Categories
getCategories(): Promise<CategoryWithCount[]>
createCategory(data: CategoryFormData): Promise<CompanyCategory>
updateCategory(id: string, data: CategoryFormData): Promise<CompanyCategory>
deleteCategory(id: string): Promise<void>

// Companies
getCompanies(params: CompanyQueryParams): Promise<PaginatedResponse<Company>>
updateCompanyRole(companyId: string, role: string): Promise<void>
updateCompanyStatus(companyId: string, status: string): Promise<void>
manageSubscription(companyId: string, data: ManageSubscriptionDto): Promise<void>
assignCategories(companyId: string, categoryIds: string[]): Promise<void>
deleteCompany(companyId: string): Promise<void>
impersonateCompany(companyId: string): Promise<{ access_token: string }>
```

**Archivo:** `front_contagracia/src/modules/admin/types/index.ts`

**Tipos a agregar:**
```typescript
interface CompanyQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  subscription_status?: string;
  expiration?: string;
  category_id?: string;
}

interface PaginatedResponse<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

interface ManageSubscriptionDto {
  plan_id: string;
  status: 'trial' | 'active' | 'expired' | 'cancelled';
  ends_at: string;
  user_plus?: number;
}
```

---

### Fase 5: Frontend - Categories Page

**Archivo:** `front_contagracia/src/app/admin/categories/page.tsx`

**Cambios:**
1. Reemplazar `MOCK_CATEGORIES` → `adminService.getCategories()`
2. `handleSave()` → `adminService.createCategory()` / `adminService.updateCategory()`
3. `confirmDelete()` → `adminService.deleteCategory()`
4. Agregar `toast.success()` / `toast.error()` en cada operación
5. Manejar error de nombre duplicado (409 Conflict)

---

### Fase 6: Frontend - Companies Page

**Archivo:** `front_contagracia/src/app/admin/companies/page.tsx`

**Cambios principales:**
1. Reemplazar mocks → `adminService.getCompanies(params)` con filtros server-side
2. Agregar componente `SubscriptionModal` (Dialog con form: plan selector, status, fecha, user_plus)
3. Agregar componente `CategoryEditor` (Popover con checkboxes de categorías)
4. Agregar `AlertDialog` para confirmar eliminación
5. Agregar `Dialog` para login como compañía (2 estados: confirmar → mostrar enlace/token)
6. Implementar todas las acciones del dropdown:
   - Acceder como compañía → `impersonateCompany()`
   - Gestionar suscripción → abrir modal → `manageSubscription()`
   - Hacer admin/estándar → `updateCompanyRole()`
   - Activar/inactivar → `updateCompanyStatus()`
   - Borrar → confirmación → `deleteCompany()`
   - Categorías → popover → `assignCategories()`
7. Toast notifications en cada acción

---

### Fase 7: Toast Global

**Verificar/agregar** `<Toaster />` de `react-hot-toast` en el layout admin o layout raíz.

---

## Dependencias entre Fases

```
Fase 1 (Schema) ──→ Fase 2 (Categories BE) ──→ Fase 3 (Companies BE) ──→ Fase 4 (Service FE)
                                                                              │
                                                                   ┌──────────┴──────────┐
                                                                   ▼                     ▼
                                                          Fase 5 (Categories FE)   Fase 6 (Companies FE)
                                                                   │                     │
                                                                   └──────────┬──────────┘
                                                                              ▼
                                                                     Fase 7 (Toast)
```

---

## Mapeo de Funcionalidades: Viejo → Nuevo

| Viejo (Supabase) | Nuevo (NestJS/Prisma) |
|---|---|
| `supabase.rpc('get_admin_company_users')` | `GET /api/admin/companies` con Prisma joins |
| `supabase.rpc('update_company_subscription', {...})` | `PATCH /api/admin/companies/:id/subscription` |
| `supabase.rpc('update_user_role', {...})` | `PATCH /api/admin/companies/:id/role` |
| `supabase.rpc('set_user_status', {...})` | `PATCH /api/admin/companies/:id/status` |
| `supabase.rpc('delete_user_cascade', {...})` | `DELETE /api/admin/companies/:id` |
| `supabase.functions.invoke('admin-login-as-company')` | `POST /api/admin/companies/:id/impersonate` |
| `supabase.from('company_categories').select()` | `GET /api/admin/categories` |
| `supabase.from('company_categories').insert()` | `POST /api/admin/categories` |
| `supabase.from('company_categories').update()` | `PATCH /api/admin/categories/:id` |
| `supabase.from('company_categories').delete()` | `DELETE /api/admin/categories/:id` |
| `supabase.from('company_category_assignments').delete/insert` | `PUT /api/admin/companies/:id/categories` |

---

## Criterios de Aceptación

- [x] Categories: CRUD completo funcional desde la UI
- [x] Categories: Conteo de compañías por categoría correcto
- [x] Categories: Validación de nombre duplicado con mensaje de error
- [x] Companies: Lista con datos reales (plan, suscripción, categorías)
- [x] Companies: Filtros de búsqueda, expiración y categoría funcionando
- [x] Companies: Paginación server-side funcional
- [x] Companies: Gestionar suscripción desde modal
- [x] Companies: Asignar/desasignar categorías desde popover
- [x] Companies: Cambiar rol y status
- [x] Companies: Eliminar compañía con confirmación
- [x] Companies: Login como compañía (impersonate)
- [x] Notificaciones toast en todas las operaciones
- [x] Sin errores de TypeScript
- [x] Patrones consistentes con el resto del proyecto
