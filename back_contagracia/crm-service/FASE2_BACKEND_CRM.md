# FASE 2 - Backend crm-service (NestJS, Puerto 3011)

> **Servicio:** `crm-service/`
> **Puerto:** 3011
> **Referencia:** `company-service/` (patrón multi-tenant)
> **Fecha inicio:** 2026-02-02

---

## Resumen

Implementar el microservicio CRM completo: setup infraestructura, **13 módulos** de dominio con CRUD, auth JWT, multi-tenant dinámico. ~60 endpoints.

---

## Dependencias verificadas

| Componente | Ubicación | Estado |
|---|---|---|
| `@prisma/client-tenant` (con modelos CRM) | `contagracia-shared-modules/` | ✅ Generado (Fase 1) |
| `@prisma/client-master` (para validar empresa) | `contagracia-shared-modules/` | ✅ Existente |
| `TenantPrismaService` (conexiones dinámicas) | `company-service/src/modules/tenant-users/` | ✅ Patrón a replicar |
| `JwtStrategy` + `JwtAuthGuard` | `company-service/src/common/` | ✅ Patrón a replicar |
| `JwtPayload` interface | `company-service/src/common/interfaces/` | ✅ Patrón a replicar |
| `pnpm-workspace.yaml` | `back_contagracia/` | ⚠️ crm-service comentado, descomentar |

---

## Patrones a seguir (copiados de company-service)

- **Rutas:** `api/companies/:companyId/crm/{recurso}`
- **Auth:** `@UseGuards(JwtAuthGuard)` a nivel controller, `req.user.sub` para userId
- **Tenant:** `TenantPrismaService.getClientForCompany(companyId)` → Prisma client dinámico
- **DTOs:** `class-validator` + `@ApiProperty` para Swagger
- **Soft delete:** filtrar por `is_active: true`, `PATCH` para desactivar (no `DELETE` real)
- **Paginación:** `skip`/`take` como query params
- **Audit:** `created_by`/`updated_by` → `req.user.sub`

---

## Tareas detalladas

### 2.1 Workspace y dependencias

**Archivos a modificar:**

| Archivo | Cambio |
|---|---|
| `pnpm-workspace.yaml` | Descomentar `- 'crm-service'` |
| `back_contagracia/package.json` | Agregar `dev:crm`, `build:crm`, `start:crm` |
| `crm-service/package.json` | Agregar dependencias (ver abajo) |
| `crm-service/.env` | Crear con PORT, JWT_SECRET, DATABASE_MASTER_URL |

**Dependencias a agregar:**
```json
{
  "@contagracia/shared-modules": "file:..\\contagracia-shared-modules",
  "@nestjs/config": "^4.0.2",
  "@nestjs/jwt": "^11.0.2",
  "@nestjs/passport": "^11.0.5",
  "@nestjs/swagger": "^11.2.5",
  "@prisma/client-master": "file:..\\contagracia-shared-modules\\node_modules\\@prisma\\client-master",
  "@prisma/client-tenant": "file:..\\contagracia-shared-modules\\node_modules\\@prisma\\client-tenant",
  "class-transformer": "^0.5.1",
  "class-validator": "^0.14.3",
  "passport": "^0.7.0",
  "passport-jwt": "^4.0.1"
}
```

---

### 2.2 Infraestructura core

**Estructura a crear:**
```
crm-service/src/
├── main.ts                                    # CORS, prefix api, ValidationPipe, Swagger, port 3011
├── app.module.ts                              # ConfigModule, Passport, JWT, PrismaModule, CRM modules
├── common/
│   ├── interfaces/jwt-payload.interface.ts    # Copiar de company-service
│   ├── strategies/jwt.strategy.ts             # Copiar de company-service
│   ├── guards/
│   │   ├── jwt-auth.guard.ts                  # Copiar de company-service
│   │   └── crm-role.guard.ts                  # NUEVO: scoping por rol CRM
│   └── decorators/
│       └── current-user.decorator.ts          # Extraer user del request
├── modules/
│   ├── prisma/
│   │   ├── prisma.service.ts                  # Master DB (@prisma/client-master)
│   │   └── prisma.module.ts                   # @Global()
│   └── tenant/
│       ├── tenant-prisma.service.ts           # Conexiones dinámicas por company
│       └── tenant.module.ts                   # @Global(), exports TenantPrismaService
```

**main.ts (basado en company-service):**
- `app.enableCors()`
- `app.setGlobalPrefix('api')`
- `app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))`
- Swagger: título "Contagracia CRM Service API", BearerAuth
- Puerto: `process.env.PORT ?? 3011`

**crm-role.guard.ts (NUEVO):**
- Consulta `TenantUser.role.hierarchy` en tenant DB
- `hierarchy >= 100` (MANAGER): sin filtro
- `hierarchy >= 50` (SALES_DIRECTOR): filtra por equipo
- `hierarchy < 50` (SALES_ADVISOR): filtra solo asignado a él

---

### 2.3 Módulo Stages

> Ruta: `api/companies/:companyId/crm/stages`
> Modelo: `CrmOpportunityStage`

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/` | Listar etapas (ordenadas por `position`) |
| POST | `/` | Crear etapa |
| PATCH | `/:id` | Actualizar etapa |
| PATCH | `/reorder` | Reordenar `[{id, position}]` |
| DELETE | `/:id` | Soft delete |

**DTOs:** `CreateStageDto` (name, color, is_won, is_lost), `UpdateStageDto` (partial), `ReorderStagesDto`

---

### 2.4 Módulo Tags

> Ruta: `api/companies/:companyId/crm/tags`
> Modelos: `CrmContactTag`, `CrmContactTagAssignment`

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/` | Listar tags |
| POST | `/` | Crear tag |
| PATCH | `/:id` | Actualizar |
| DELETE | `/:id` | Soft delete |

---

### 2.5 Módulo Contacts

> Ruta: `api/companies/:companyId/crm/contacts`
> Modelo: `CrmContact`

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/` | Listar (search, tags, segment, pagination) |
| GET | `/:id` | Detalle con leads, opportunities, activities |
| POST | `/` | Crear contacto |
| PATCH | `/:id` | Actualizar |
| DELETE | `/:id` | Soft delete |
| POST | `/:id/tags` | Asignar tags (body: `{tagIds: string[]}`) |
| DELETE | `/:id/tags/:tagId` | Quitar tag |

**DTOs:** `CreateContactDto` (full_name, email?, phone?, company_name?, whatsapp_number?, notes?, birth_date?, segment?), `UpdateContactDto`, `ListContactsDto` (search, tags[], segment, skip, take)

**Lógica especial:**
- Búsqueda por `full_name`, `email`, `phone`, `company_name` (OR)
- Filtro por tags via `CrmContactTagAssignment`
- Filtro por `segment`
- Include en detalle: `leads`, `opportunities` (con stage), `activities` (recientes)

---

### 2.6 Módulo Campaigns

> Ruta: `api/companies/:companyId/crm/campaigns`
> Modelo: `CrmCampaign`

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/` | Listar (status, channel, pagination) |
| GET | `/:id` | Detalle con stats (leads count, conversion) |
| POST | `/` | Crear |
| PATCH | `/:id` | Actualizar |
| DELETE | `/:id` | Soft delete |

**DTOs:** `CreateCampaignDto` (name, channel, start_date, end_date?, budget?, description?, target_audience?, status?)

---

### 2.7 Módulo Leads

> Ruta: `api/companies/:companyId/crm/leads`
> Modelo: `CrmLead`

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/` | Listar (stage, source, assigned_to, campaign_id, pagination) |
| GET | `/:id` | Detalle con contact, activities, opportunities |
| POST | `/` | Crear lead (requiere contact_id) |
| PATCH | `/:id` | Actualizar |
| PATCH | `/:id/stage` | Cambiar stage (body: `{stage: LeadStage}`) |
| POST | `/:id/convert` | Convertir a oportunidad |
| PATCH | `/bulk-assign` | Asignar múltiples (body: `{leadIds[], assignedTo}`) |
| DELETE | `/:id` | Soft delete |

**Lógica especial:**
- `convert`: Crea `CrmOpportunity` con `lead_id`, `contact_id` del lead, stage inicial
- `bulk-assign`: Actualiza `assigned_to` en batch
- Filtro por rol CRM (advisor solo ve los suyos)

---

### 2.8 Módulo Opportunities

> Ruta: `api/companies/:companyId/crm/opportunities`
> Modelo: `CrmOpportunity`

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/` | Listar (stage_id, assigned_to, pagination) |
| GET | `/kanban` | Agrupadas por stage para vista kanban |
| GET | `/:id` | Detalle con lead, contact, activities, documents |
| POST | `/` | Crear |
| PATCH | `/:id` | Actualizar |
| PATCH | `/:id/stage` | Cambiar stage (guarda en `history` Json) |
| DELETE | `/:id` | Soft delete |

**DTOs:** `CreateOpportunityDto` (name, contact_id?, lead_id?, stage_id, expected_value, probability?, close_date?, assigned_to?, cost_center_id?)

**Lógica especial:**
- `stage change`: Append a `history` Json: `{from, to, changed_by, changed_at}`
- Si stage `is_won`: setear `won_at = now()`
- Si stage `is_lost`: requerir `lost_reason`
- `kanban`: Retorna `{stages: [{id, name, color, opportunities: [...]}]}`

---

### 2.9 Módulo Activities

> Ruta: `api/companies/:companyId/crm/activities`
> Modelo: `CrmActivity`

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/` | Listar (type, status, user_id, contact/lead/opp, date range) |
| GET | `/:id` | Detalle |
| POST | `/` | Crear |
| PATCH | `/:id` | Actualizar |
| PATCH | `/:id/complete` | Marcar completada (`completed_at = now()`) |
| PATCH | `/:id/cancel` | Cancelar |
| DELETE | `/:id` | Soft delete |

---

### 2.10 Módulo Forms

> Ruta: `api/companies/:companyId/crm/forms`
> Modelos: `CrmLeadForm`, `CrmFormField`, `CrmFormSubmission`

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/` | Listar formularios |
| GET | `/:id` | Detalle con fields y submissions count |
| POST | `/` | Crear form + fields (nested) |
| PATCH | `/:id` | Actualizar form + fields |
| DELETE | `/:id` | Soft delete |
| GET | `/:id/submissions` | Listar submissions |

**Endpoint público (sin auth):**
| POST | `/public/forms/:slug/submit` | Recibir submission (crea contacto si no existe) |

---

### 2.11 Módulo Automations

> Ruta: `api/companies/:companyId/crm/automations`
> Modelos: `CrmOpportunityAutomation`, `CrmActivityAutomation`, `CrmFormAutomation`

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/opportunity` | Listar automaciones de oportunidad |
| GET | `/activity` | Listar automaciones de actividad |
| GET | `/form` | Listar automaciones de formulario |
| POST | `/:type` | Crear (type = opportunity\|activity\|form) |
| PATCH | `/:type/:id` | Actualizar |
| DELETE | `/:type/:id` | Soft delete |

**Nota:** El motor de ejecución (disparar acciones) es Fase 4. Aquí solo CRUD de reglas.

---

### 2.12 Módulo Email

> Ruta: `api/companies/:companyId/crm/email`
> Modelos: `CrmEmailTemplate`, `CrmEmailSend`

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/templates` | Listar templates |
| POST | `/templates` | Crear template |
| PATCH | `/templates/:id` | Actualizar |
| DELETE | `/templates/:id` | Soft delete |
| GET | `/sends` | Historial de envíos (pagination) |
| POST | `/sends` | Registrar envío (sin envío real, Fase 4) |

---

### 2.13 Módulo WhatsApp

> Ruta: `api/companies/:companyId/crm/whatsapp`
> Modelos: `CrmWhatsappTemplate`, `CrmWhatsappConversation`, `CrmWhatsappMessage`

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/templates` | Listar templates |
| POST | `/templates` | Crear |
| PATCH | `/templates/:id` | Actualizar |
| GET | `/conversations` | Listar conversaciones |
| GET | `/conversations/:id/messages` | Mensajes de conversación |
| POST | `/messages` | Registrar mensaje (sin envío real, Fase 4) |

---

### 2.14 Módulo Dashboard

> Ruta: `api/companies/:companyId/crm/dashboard`

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/stats` | Conteos generales (contacts, leads, opps, activities) |
| GET | `/pipeline` | Valor acumulado por stage |
| GET | `/leads-by-source` | Distribución leads por `LeadSource` |
| GET | `/recent-activities` | Últimas 10 actividades |

---

### 2.15 Módulo Team

> Ruta: `api/companies/:companyId/crm/team`

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/members` | Miembros CRM con stats (leads, opps, activities) |
| GET | `/members/:userId/performance` | Métricas detalladas de un usuario |
| GET | `/ranking` | Ranking por opps ganadas y valor |

---

## Convenciones aplicadas

- **Controller:** `@ApiTags`, `@ApiBearerAuth`, `@UseGuards(JwtAuthGuard)` a nivel clase
- **Rutas:** `/api/companies/:companyId/crm/{modulo}` (consistente con company-service)
- **Service:** Inyecta `TenantPrismaService` + `PrismaService` (master)
- **DTOs:** `class-validator` decorators + `@ApiProperty` para Swagger
- **Responses:** `{ message: string, data: T }` consistente
- **Soft delete:** `is_active = false`, `deleted_at = now()` (no borra registro)
- **Audit:** `created_by`/`updated_by` seteados desde `req.user.sub`
- **Paginación:** `{ data: T[], total: number, skip: number, take: number }`

---

## Notas

- Los módulos de **Email** y **WhatsApp** solo implementan CRUD de templates y registro de envíos/mensajes. El envío real es **Fase 4** (vía integrations-service).
- El **motor de automatizaciones** (ejecutar acciones por stage change) es **Fase 4**. Aquí solo CRUD de reglas.
- El endpoint público de **Forms** (`/public/forms/:slug/submit`) va sin auth, excluido del global prefix si es necesario.
- El guard de roles CRM filtra datos según hierarchy del `TenantUser.role` en la DB tenant.
