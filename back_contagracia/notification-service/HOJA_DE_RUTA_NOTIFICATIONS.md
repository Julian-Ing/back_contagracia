# Hoja de Ruta: Broadcast Notifications - notification-service

## Objetivo

Levantar el `notification-service` (puerto 3015) para manejar el envío de notificaciones broadcast desde `/admin/notifications` y la lectura de notificaciones desde el dashboard de cada empresa. Crear los modelos en Prisma, configurar el servicio con Prisma + Swagger + ConfigModule, implementar los endpoints, y conectar el frontend eliminando los mocks.

Cada broadcast crea una `CompanyNotification` por empresa destinataria en master DB, visible desde el dashboard de la empresa.

---

## Estado General

| Fase | Descripción | Estado |
|------|-------------|--------|
| Fase 0 | Setup del notification-service | Completado |
| Fase 1 | Schema Prisma — Modelos de Notificación | Completado |
| Fase 2 | Backend — Módulo broadcast | Completado |
| Fase 3 | Frontend — Types, Service y Client | Completado |
| Fase 4 | Frontend — Conectar page.tsx (envío) | Completado |
| Fase 5 | Backend — Módulo company-notifications | Completado |
| Fase 6 | Frontend — NotificationDropdown (campana en dashboard) | Completado |
| Fase 7 | Frontend — Historial de broadcasts en admin | Completado |
| Fase 8 | Frontend — Panel lateral (Sheet) para NotificationDropdown | Completado |
| Fase 9 | Frontend — Página completa de notificaciones para empresas | Pendiente |

---

## Contexto

### Proyecto anterior (`horizont`)

- **Broadcast:** `src/pages/admin/BroadcastNotifications.jsx` — Django + Supabase
- **Vista empresa:** `NotificationBell.jsx` + `NotificationDropdown.jsx` (Sheet panel con tabs) + `Notifications.jsx` (página completa)
- **Real-time:** Supabase subscriptions + sonido de notificación
- **5 tipos admin:** `admin_announcement`, `admin_update`, `admin_improvement`, `admin_support`, `admin_satisfaction`

### Arquitectura Actual

- **Monorepo pnpm** con workspaces
- **Shared modules:** `contagracia-shared-modules/` → Prisma schemas
- **Prisma:** `schema-master.prisma` genera `@prisma/client-master`
- **notification-service:** Puerto 3015, NestJS + Prisma
- **Frontend:** Next.js + React 19, `notificationsClient` Axios apuntando a :3015

---

## Criterios de Aceptación

### Fase 0: Setup notification-service
- [x] Dependencias en `package.json` (shared-modules, prisma-client-master, config, swagger, class-validator)
- [x] `.env` con DATABASE_MASTER_URL y PORT=3015
- [x] PrismaModule conectado a master DB
- [x] `main.ts` con CORS, global prefix `/api`, ValidationPipe, Swagger
- [x] Script `dev:notifications` y `build:notifications` en monorepo root
- [x] notification-service agregado a `pnpm-workspace.yaml`

### Fase 1: Schema Prisma
- [x] Modelo `BroadcastNotification` creado (auditoría admin)
- [x] Modelo `CompanyNotification` creado con `company_id`, `is_read`, `broadcast_id`
- [x] Relación `notifications CompanyNotification[]` en modelo `Company`
- [x] `prisma generate` + `prisma db push` exitosos

### Fase 2: Backend — Broadcast
- [x] Módulo broadcast (controller + service + DTOs)
- [x] `POST /api/notifications/broadcast` — crea broadcast + N company notifications en transacción
- [x] `GET /api/notifications/broadcasts` — lista historial paginado con `_count.notifications`
- [x] Validación con class-validator y Swagger docs

### Fase 3: Frontend — Types, Service y Client
- [x] `notificationsClient` Axios en `apiClient.ts` apuntando a :3015
- [x] Puerto corregido en `api.config.ts` (3014 → 3015)
- [x] Types: `BroadcastNotification`, `CompanyNotification`, `SendBroadcastPayload`, `BroadcastResponse`
- [x] `notification.service.ts` con `sendBroadcast`, `getBroadcasts`, `getCompanyNotifications`, `getUnreadCount`, `markAsRead`, `markAllAsRead`

### Fase 4: Frontend — Página admin de envío
- [x] Mocks eliminados (`MOCK_COMPANIES`, `MOCK_CATEGORIES`, interfaces mock)
- [x] Empresas y categorías cargadas desde `adminService`
- [x] Envío real vía `notificationService.sendBroadcast()`
- [x] Toast de éxito con `sent_count` y toast de error
- [x] Filtro por categoría funcional

### Fase 5: Backend — Company Notifications
- [x] Módulo `company-notifications` (controller + service)
- [x] `GET /api/notifications/company/:companyId` — notificaciones paginadas + unread_count
- [x] `GET /api/notifications/company/:companyId/unread-count` — conteo rápido
- [x] `PATCH /api/notifications/company/:companyId/:id/read` — marcar como leída
- [x] `PATCH /api/notifications/company/:companyId/read-all` — marcar todas como leídas

### Fase 6: Frontend — NotificationDropdown (campana)
- [x] Componente `NotificationDropdown` en `shared/components/layout/`
- [x] Campana con badge de no leídas
- [x] Dropdown con tabs (Todas / No leídas)
- [x] Lista de notificaciones con iconos por tipo y colores
- [x] Marcar como leída (individual y todas)
- [x] Polling cada 30s para conteo de no leídas
- [x] Integrado en `Header.tsx` reemplazando botón estático
- [x] Funciona solo con login de empresa (NIT + email + password)

### Fase 7: Historial de broadcasts en admin
- [x] Tabs "Enviar" / "Historial" en `/admin/notifications`
- [x] Lista paginada de broadcasts enviados
- [x] Muestra tipo, título, mensaje, fecha, destinatarios
- [x] Paginación funcional

### Fase 8: Panel lateral (Sheet) para NotificationDropdown (Completado)

Portar la UI del proyecto anterior (horizont `NotificationDropdown.jsx`) al proyecto nuevo. Convertir el dropdown actual (`position: absolute`) a un **Sheet** lateral deslizante desde la derecha.

**Paso 1 — Crear componente `Sheet`**
- **CREAR:** `front_contagracia/src/shared/components/ui/sheet.tsx`
- Basado en Radix `@radix-ui/react-dialog` (ya instalado — lo usa el Dialog actual)
- Patrón estándar shadcn/ui: Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose
- `SheetContent` con prop `side` (default `"right"`), overlay con backdrop, animaciones slide-in/out

**Paso 2 — Reescribir `NotificationDropdown.tsx`**
- **MODIFICAR:** `front_contagracia/src/shared/components/layout/NotificationDropdown.tsx`

Cambios principales:
- Reemplazar el div dropdown (`absolute right-0 top-full`) por `Sheet` lateral (`side="right"`, `w-full sm:max-w-md`)
- Usar `useRealtime()` para obtener `isConnected`

**Header del Sheet:**
- Icono bell en círculo azul + título "Notificaciones"
- Estado de conexión (punto verde/rojo + "Conectado"/"Desconectado")
- Botón toggle sonido (Volume2/VolumeX) con persistencia en `localStorage` key `notification_sound_enabled`

**3 Tabs estilo segmented/pill** (como en horizont):
- "En Progreso" — placeholder vacío (infra de background tasks no existe aún), con icono Loader2
- "Todas" — lista completa de notificaciones
- "No leídas" — filtradas, con badge count

**Botón "Marcar todas como leídas"** debajo de tabs (solo si hay unread y no estamos en tab progress)

**Notification Cards** (portando estilo horizont):
- Icono circular 10x10 con color por `type` (reusar/expandir `TYPE_CONFIG`)
- Badge de tipo (outline) + indicador no-leído (punto azul)
- Título bold + mensaje `line-clamp-2`
- Tiempo relativo + botones hover (check para marcar leída)
- Card unread: `bg-primary/5 border border-primary/20`
- Card read: `border border-transparent hover:border-border`

**Content** en `ScrollArea` (ya existe en el proyecto)

**Footer:** Botón "Ver todas las notificaciones" con ChevronRight → navega a `/dashboard/notifications`

**Paso 3 — Header.tsx (sin cambios)**
- Ya importa `NotificationDropdown` y le pasa `companyId`
- El componente usa `useRealtime()` internamente

**Lo que NO se porta:**
- Supabase queries (el nuevo usa API REST + WebSocket)
- `activeTasks` con progress bars reales (placeholder, la infra no existe)
- `deleteNotification` (no hay endpoint delete en la API actual)
- `useNavigate` de React Router (se usa `useRouter` de Next.js)

**Criterios de aceptación:**
- [x] Click en campana abre Sheet lateral desde la derecha con animación
- [x] Header muestra estado de conexión (punto verde + "Conectado")
- [x] Toggle sonido funciona y persiste en localStorage
- [x] 3 tabs visibles: "En Progreso" (placeholder), "Todas", "No leídas"
- [x] Notificaciones con cards estilo horizont (icono, badge tipo, título, mensaje, tiempo)
- [x] Mark as read y Mark all as read funcionan
- [x] Footer navega a `/dashboard/notifications`
- [x] Dark mode funciona correctamente
- [x] Se cierra con click en overlay o botón X del Sheet

---

### Fase 9: Página completa de notificaciones para empresas (Pendiente)
- [ ] Página `/dashboard/notifications` con todas las notificaciones
- [ ] Filtros por tipo, estado (leída/no leída)
- [ ] Paginación
- [ ] Marcar como leída desde la página

---

## Archivos Creados/Modificados

### Backend (notification-service)
- `notification-service/.env` — Variables de entorno
- `notification-service/package.json` — Dependencias actualizadas
- `notification-service/src/main.ts` — CORS, Swagger, ValidationPipe
- `notification-service/src/app.module.ts` — ConfigModule, PrismaModule, BroadcastModule, CompanyNotificationsModule
- `notification-service/src/modules/prisma/prisma.service.ts` — PrismaClient wrapper
- `notification-service/src/modules/prisma/prisma.module.ts` — Global module
- `notification-service/src/modules/broadcast/broadcast.controller.ts`
- `notification-service/src/modules/broadcast/broadcast.service.ts`
- `notification-service/src/modules/broadcast/broadcast.module.ts`
- `notification-service/src/modules/broadcast/dto/send-broadcast.dto.ts`
- `notification-service/src/modules/company-notifications/company-notifications.controller.ts`
- `notification-service/src/modules/company-notifications/company-notifications.service.ts`
- `notification-service/src/modules/company-notifications/company-notifications.module.ts`

### Schema Prisma
- `contagracia-shared-modules/prisma/schema-master.prisma` — Modelos BroadcastNotification, CompanyNotification + relación en Company

### Monorepo
- `back_contagracia/pnpm-workspace.yaml` — Agregado notification-service
- `back_contagracia/package.json` — Scripts dev:notifications, build:notifications, start:notifications

### Frontend
- `front_contagracia/src/config/api.config.ts` — Puerto corregido a 3015
- `front_contagracia/src/modules/admin/types/index.ts` — Types de notificaciones
- `front_contagracia/src/modules/admin/services/notification.service.ts` — Service layer
- `front_contagracia/src/app/admin/notifications/page.tsx` — Envío real + historial
- `front_contagracia/src/shared/components/layout/NotificationDropdown.tsx` — Dropdown de campana
- `front_contagracia/src/shared/components/layout/Header.tsx` — Integración del dropdown

---

## Notas

### Auth: super_admin vs company owner
El mismo usuario puede ser super_admin y dueño de empresa. Si se loguea sin NIT → modo admin (`company: null`, no ve notificaciones de empresa). Si se loguea con NIT → modo empresa (`company: { id, name, ... }`, ve notificaciones). Este es un tema de diseño de auth pendiente de resolver por otro dev.

### Endpoints disponibles

**Admin (broadcast):**
- `POST /api/notifications/broadcast` — Enviar broadcast
- `GET /api/notifications/broadcasts?page=1&limit=20` — Historial

**Company-facing:**
- `GET /api/notifications/company/:companyId?page=1&limit=20` — Notificaciones
- `GET /api/notifications/company/:companyId/unread-count` — Conteo no leídas
- `PATCH /api/notifications/company/:companyId/:id/read` — Marcar leída
- `PATCH /api/notifications/company/:companyId/read-all` — Marcar todas leídas
