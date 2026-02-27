# Hoja de Ruta — Mejoras Módulo PH (Parte 3)

## Contexto

Continuación de `HOJA_DE_RUTA_PH_MEJORAS_parte2.md` (10 tareas completadas, 16 en total).
Documento de referencia: `Comentarios PH (1).pdf` — items marcados en rojo pendientes.

Esta hoja cubre las features **restantes** del PDF que requieren módulos nuevos o integraciones externas.

---

## Estado General

| # | Tarea | Estado | Prioridad | Complejidad | Asignado |
|---|-------|--------|-----------|-------------|----------|
| 17 | Gestión de PQRS + Asambleas residente | ✅ Completado (17.1–17.10) | Alta | Media-Alta | — |
| 17.11 | Quórum por coeficiente + solo propietarios | ✅ Completado | Alta | Media | — |
| 18 | Comunicados por roles | ✅ Completado | Media | Media | — |
| 18.1 | Categorización plantillas email + rename | ✅ Completado | Media | Media | — |
| 19 | Portería | ✅ Completado | Media | Alta | — |
| 20 | ~~Citofonía Digital~~ | ❌ Descartado | — | — | — |
| 21 | Bancos PH | ❌ Pendiente | Alta | Alta | Otro dev |

---

## Tarea 17 — Gestión de PQRS

**Estado:** ✅ Completado

### Descripción

Sistema de tickets para Peticiones, Quejas, Reclamos y Sugerencias (PQRS) con historial de conversación por correo electrónico. Los residentes/terceros crean solicitudes y el admin responde desde el panel. Cada mensaje del hilo genera un email al destinatario usando el SMTP configurado en integrations-service.

### Subtarea 17.1 — Rol PH Residente + vincular tercero a usuario ✅

- Seed condicional (`seed-ph-roles.ts`): crea rol `ph_resident` solo si el plan del tenant incluye módulo `ph`
- Integrado en `seed-all-tenants.ts` para que se cree automáticamente al seedear
- 6 acciones `ph.pqrs.*` agregadas a la seed de modules (`view`, `create`, `edit`, `delete`, `respond`, `change_status`)
- Rol `ph_resident` con 14 permisos limitados: vistas PH + PQRS (crear/responder) + reservas (crear)
- `CreateUserDto` ahora acepta `third_party_id` opcional para vincular usuario a un tercero existente
- Frontend: `ThirdPartySelect` agregado al formulario de crear usuario en `/dashboard/company-users`

### Subtarea 17.2 — Backend PQRS ✅

- 2 modelos en schema-tenant.prisma: `PhPqrs` + `PhPqrsMessage`
- Endpoints CRUD completos: listar, detalle, crear, actualizar, cambiar estado, eliminar
- Endpoints de mensajes: listar mensajes, agregar mensaje
- Endpoint de estadísticas: contadores por estado (open, in_progress, resolved, closed)
- Integración con `BillingEmailService` para envío de emails via SMTP del tenant
- Auto-generación de `ticket_number` incremental
- Archivos: `pqrs.controller.ts`, `pqrs.service.ts`, `pqrs.module.ts`, DTOs (`create-pqrs.dto.ts`, `update-pqrs.dto.ts`, `create-message.dto.ts`)

### Subtarea 17.3 — Frontend PQRS ✅

- Página `/dashboard/ph/pqrs` con vista lista + vista detalle
- Vista lista: 4 KPIs (abiertos, en proceso, resueltos, cerrados), filtros por copropiedad/tipo/estado/búsqueda, tabla de tickets
- Vista detalle: info del ticket, hilo de conversación estilo chat con diferenciación visual admin (azul) vs residente (verde)
- Diálogo para crear PQRS con selección de copropiedad, unidad, tercero, tipo (P/Q/R/S), prioridad, datos de contacto
- Auto-fill de datos de contacto cuando el residente abre el formulario (desde su tercero vinculado)

### Subtarea 17.4 — Flujo de emails bidireccional ✅

1. Residente crea PQRS → email al admin (`smtp_user`) con datos del solicitante
2. Admin responde desde el panel → email al `contact_email` del residente
3. Residente responde desde su vista → email al admin con datos de contacto completos
4. Cada mensaje registra: `email_sent`, `email_sent_at`, `email_to` para tracking
5. Cambio de estado → email al residente notificando el nuevo estado
6. Eliminación de PQRS → email al residente notificando la eliminación

### Subtarea 17.5 — Permisos granulares y restricciones UI ✅

- 6 acciones en seed: `ph.pqrs.view`, `ph.pqrs.create`, `ph.pqrs.edit`, `ph.pqrs.delete`, `ph.pqrs.respond`, `ph.pqrs.change_status`
- Frontend usa `usePermissions()` hook con `can()` para mostrar/ocultar botones según permisos del usuario
- Residente solo ve: crear PQRS + responder. No ve: cambiar estado, eliminar
- Admin ve todas las acciones
- Modales de confirmación en acciones destructivas (cambiar estado, eliminar)

### Subtarea 17.6 — Notificaciones en tiempo real ✅

- Notificación interna (campanita) en: creación, nuevo mensaje, cambio de estado, eliminación
- Tipos: `ph_pqrs_created`, `ph_pqrs_message`, `ph_pqrs_status_changed`, `ph_pqrs_deleted`
- `exclude_user_id` en todas las notificaciones para no notificar al autor de la acción
- WebSocket (Redis pub/sub → Socket.io) para actualización en tiempo real del hilo de conversación
- Frontend suscrito a `notifications:received` — auto-refresca detalle o lista según contexto
- Si se elimina un PQRS que el usuario está viendo, cierra el detalle y refresca la lista
- `NotificationDropdown` configurado con iconos y labels para los 4 tipos de PQRS

### Subtarea 17.7 — Restricción de turnos en conversación ✅

- No se puede enviar un mensaje consecutivo sin respuesta del otro lado
- Frontend verifica `lastMsg.sender_type === mySenderType` → muestra "Esperando respuesta..." si ya envió el último mensaje
- Aplica tanto para admin como para residente

### Criterios de aceptación

- [x] Se puede crear un PQRS con tipo, prioridad y datos de contacto
- [x] El ticket recibe un número incremental (#1, #2, #3...)
- [x] Se pueden agregar mensajes al hilo de conversación
- [x] Cada mensaje envía email al destinatario (admin→contacto, residente→admin)
- [x] El hilo muestra diferenciación visual admin vs residente
- [x] Se puede cambiar el estado: abierto → en proceso → resuelto → cerrado
- [x] KPIs muestran contadores por estado
- [x] Filtros por copropiedad, tipo, estado y búsqueda funcionan
- [x] Permisos granulares: residente limitado a crear/responder, admin tiene control total
- [x] Notificaciones internas + email en cada acción relevante
- [x] Tiempo real via WebSocket para conversaciones
- [x] Modales de confirmación en acciones destructivas
- [x] Restricción de turnos (esperar respuesta antes de enviar otro mensaje)

### Subtarea 17.8 — Restricciones de vista por rol (ph_resident) ✅

**Estado:** ✅ Completado

### Subtarea 17.9 — Vista agrupada de residentes (padre-hijo) ✅

**Estado:** ✅ Completado

**Problema resuelto:** La tabla de residentes mostraba filas planas — si un tercero (ej. Juan David) era responsable de "Prueba Unidad" y "Parqueadero 12", aparecía 2 veces en la tabla. Se implementó agrupación por persona (tercero) con filas padre expandibles.

**Componente reutilizable creado:** `front_contagracia/src/shared/components/ui/expandable-table-group.tsx`
- Genérico tipado `<T>` — puede usarse en cualquier tabla que necesite agrupación padre-hijo
- Retorna `<React.Fragment>` con `<TableRow>` directos (válido semánticamente en `<tbody>`)
- Single-item: datos inline sin chevron. Multi-item: chevron expandible con badge "N unidades"
- `e.stopPropagation()` en botones de acción para no toggle el grupo

**Cambios en página de residentes:** `front_contagracia/src/app/dashboard/ph/residents/page.tsx`
- `groupedResidents` useMemo agrupa `residents` por `tercero_id`
- Estado `expandedTerceros: Set<string>` con toggle individual
- Botón "Expandir/Colapsar todo" en CardHeader
- Columna chevron al inicio de la tabla
- Limpia expandidos al cambiar de página

**Problema resuelto:** Ninguna página PH usaba `usePermissions()`. El residente veía TODO el módulo igual que el admin. La navegación usaba `ph.dashboard.view` como comodín para items que deberían ser admin-only.

**Sidebar deseado para el residente:**
```
PH (Propiedad Horizontal)
├─ Dashboard
├─ Zonas Comunes          ← ver áreas + crear/ver SUS reservas
├─ Contabilidad
│  └─ Cartera             ← ver deuda de SUS unidades
├─ Administración
│  └─ Asambleas           ← ver asambleas, votar, registrar asistencia (no gestionar)
├─ Gestión de PQRS        ← crear/responder (ya implementado)
```

#### Paso 1 — Seed: nuevas acciones admin-only

**Archivo:** `contagracia-shared-modules/prisma/seeds/modules/actions/ph.ts`

Agregar acciones que solo el admin tendrá:
```
ph.documents.view       — Ver documentos
ph.documents.manage     — Gestionar documentos
ph.maintenance.view     — Ver plan de mantenimiento
ph.maintenance.manage   — Gestionar mantenimiento
ph.policies.view        — Ver pólizas
ph.policies.manage      — Gestionar pólizas
ph.billing.manage       — Gestionar facturación (generar, cerrar periodos, etc.)
```

#### Paso 2 — Seed: quitar permisos admin del rol ph_resident

**Archivo:** `contagracia-shared-modules/prisma/scripts/seed-ph-roles.ts`

Quitar de `PH_RESIDENT_PERMISSIONS`:
- `ph.condominiums.view` — gestionar copropiedades es admin
- `ph.units.view` — gestionar unidades es admin
- `ph.residents.view` — gestionar copropietarios es admin
- `ph.vehicles.view` — gestionar vehículos es admin

Permisos finales del residente:
```
ph.view, ph.dashboard.view, ph.common_areas.view,
ph.reservations.view, ph.reservations.create,
ph.billing.view, ph.assemblies.view,
ph.pqrs.view, ph.pqrs.create, ph.pqrs.respond
```
(10 permisos, antes eran 13)

#### Paso 3 — Navigation: permisos correctos por item

**Archivo:** `front_contagracia/src/config/navigation.ts`

| Item del menú | Permiso actual | Permiso nuevo |
|---|---|---|
| Facturación | `ph.billing.view` | `ph.billing.manage` |
| Bancos | `ph.billing.view` | `ph.billing.manage` |
| Asambleas | `ph.dashboard.view` | `ph.assemblies.view` |
| Documentos | `ph.dashboard.view` | `ph.documents.view` |
| Plan Mantenimiento | `ph.dashboard.view` | `ph.maintenance.view` |
| Pólizas | `ph.dashboard.view` | `ph.policies.view` |
| PQRS | `ph.dashboard.view` | `ph.pqrs.view` |
| Portería | `ph.dashboard.view` | sin cambio (disabled) |
| ~~Citofonía~~ | — | Descartado |

Con esto, al residente le desaparecen: Copropiedades, Copropietarios, Unidades, Vehículos, Facturación, Bancos, Documentos, Mantenimiento, Pólizas, Configuración.

#### Paso 4 — Zonas Comunes: permisos en la página

**Archivo:** `front_contagracia/src/app/dashboard/ph/common-areas/page.tsx`

- Agregar `usePermissions()` + `can()`
- Ocultar botones crear/editar/eliminar zonas comunes (admin only)
- Ocultar botones confirmar/cancelar/completar/reactivar reservas (admin only)
- Filtrar reservas para mostrar solo las del residente (por `myUnits`)
- Auto-seleccionar unidad del residente al crear reserva

#### Paso 5 — Asambleas: permisos en la página

**Archivo:** `front_contagracia/src/app/dashboard/ph/asambleas/page.tsx`

- Agregar `usePermissions()` + `can()`
- Ocultar: botón "Nueva Asamblea", editar, eliminar, cambiar estado
- Ocultar: gestión de asistencia (registrar/eliminar), gestión de votaciones (crear/abrir/cerrar)
- Mantener visible: lista de asambleas, detalle, resultados de votaciones, exportar Excel
- Permitir: votar (si la votación está abierta)

#### Paso 6 — Cartera: filtrar por mis unidades

**Archivo:** `front_contagracia/src/app/dashboard/ph/cartera/page.tsx`

- Agregar `usePermissions()` + `isPrivileged`
- Si NO es privilegiado: filtrar la tabla para mostrar solo las unidades del residente
- Ocultar KPIs globales o mostrar solo los del residente
- Mantener: descarga de estado de cuenta PDF (solo de sus unidades)

#### Paso 7 — Correr seeds

```bash
cd contagracia-shared-modules
pnpm prisma:seed                    # registra nuevas actions en master
npx ts-node --transpile-only prisma/scripts/seed-ph-roles.ts --force
npx ts-node --transpile-only prisma/scripts/seed-all-tenants.ts --force
```

#### Criterios de aceptación

- [x] Sidebar del residente muestra solo: Dashboard, Zonas Comunes, Cartera, Asambleas, PQRS
- [x] Zonas Comunes: residente crea reservas pero no gestiona áreas ni aprueba reservas
- [x] Asambleas: residente ve asambleas y vota, no gestiona
- [x] Cartera: residente ve solo la deuda de sus unidades (backend filtra por `third_party_id` → `PhUnitResident`)
- [x] Admin sigue viendo todo sin cambios
- [x] Navegar por URL directa a páginas restringidas no muestra datos admin
- [x] Seeds ejecutados: 672 acciones en master, 10 permisos en ph_resident, 1344 role_perms sincronizados

### Subtarea 17.10 — Asambleas: votación de residente, notificaciones y mejoras ✅

**Estado:** ✅ Completado

**Votación de residente:**
- Residente puede votar en asambleas de sus copropiedades (Sí/No/Abstención o múltiple opción)
- UI de votación solo aparece si: asamblea en curso + asistencia registrada
- Detección automática de votos previos (consulta getVoteResults al entrar al detalle)
- Manejo de conflicto si intenta votar doble (ConflictException → toast "ya votaste")
- Indicador verde "Ya emitiste tu voto: Sí" después de votar

**Modal de asistencia mejorado:**
- Antes: inputs de texto libre para nombre y unidad
- Ahora: selector de residente por copropiedad (fetch residentsService con condominium_id)
- Auto-fill de unidad si el residente tiene una sola; selector si tiene varias
- Backend: residents.service.findAll enriquecido con nombre del tercero (query extra a thirdParty)
- Envía tercero_id + unit_id al backend (antes solo texto plano)

**Notificaciones en tiempo real (WebSocket):**
- Backend: sendNotification() vía HTTP al notification-service (mismo patrón que PQRS)
- Tipos: `ph_assembly_created`, `ph_assembly_status_changed`, `ph_assembly_vote_cast`
- `exclude_user_id` en todas para no notificar al autor de la acción
- Frontend: subscribe('notifications:received') auto-refresca lista y detalle
- Resultados de votación se actualizan en tiempo real para el admin cuando un residente vota
- NotificationDropdown configurado con iconos Landmark para los 3 tipos

**Eliminación del flujo Abrir/Cerrar votación:**
- Antes: cada votación tenía ciclo pending → open → closed con botones dedicados
- Ahora: todo depende del estado de la asamblea (in_progress = se puede votar)
- Backend: castVote verifica assembly.status === 'in_progress' (ya no vote.status)
- Frontend: eliminados botones "Abrir"/"Cerrar" por votación, handlers y VOTE_STATUS_CONFIG

**Otros fixes:**
- Fix botón eliminar asamblea (deleteTarget separado de selectedAssembly)
- Permiso ph.assemblies.export para botones de exportación Excel
- Filtro de asambleas por copropiedades del residente

**Archivos modificados:**
- `back_contagracia/ph-service/src/modules/assemblies/assemblies.service.ts` — sendNotification, castVote, changeStatus
- `back_contagracia/ph-service/src/modules/assemblies/assemblies.module.ts` — HttpModule, ConfigModule
- `back_contagracia/ph-service/src/modules/assemblies/assemblies.controller.ts` — userId en changeStatus
- `back_contagracia/ph-service/src/modules/residents/residents.service.ts` — tercero enrichment en findAll
- `front_contagracia/src/app/dashboard/ph/asambleas/page.tsx` — votación, asistencia, real-time, permisos
- `front_contagracia/src/shared/components/layout/NotificationDropdown.tsx` — tipos assembly

---

### Subtarea 17.11 — Quórum por coeficiente y restricción a propietarios ✅

**Estado:** ✅ Completado

**Contexto:** Según la Ley 675 de 2001 (PH Colombia), el quórum en asambleas se mide por coeficientes de copropiedad, y solo los **propietarios** (o sus delegados) tienen derecho a voto. Actualmente el sistema cuenta unidades planas sin distinguir tipo de residente.

**Modelo actual:**
- `PhUnit.coefficient` — campo Decimal(10,6) ya existe pero no se usa en quórum
- `PhUnitResident.resident_type` — valores `owner` | `tenant` ya existe
- Quórum actual: `asistentes / total_unidades × 100` (incorrecto)

#### Paso 0 — Prerequisito: Coeficiente en UI de Unidades ✅

**Estado:** ✅ Completado

El campo `coefficient` existía en el schema y DTOs pero no estaba expuesto en el frontend. Se agregó:

**Backend:**
- Nuevo endpoint `GET /units/coefficient-sum?condominium_id&exclude_unit_id` — retorna suma agregada de coeficientes por copropiedad (Prisma aggregate)
- `units.service.ts` → `getCoefficientSum()` con soporte para excluir una unidad (al editar)

**Frontend** (`front_contagracia/src/app/dashboard/ph/units/page.tsx`):
- Campo `Coeficiente %` en formularios crear/editar con indicador en tiempo real:
  - Muestra "Asignado: XX%" | "Total: XX%" con colores (verde=100%, ámbar=parcial, rojo=excede)
  - Placeholder dinámico "Disponible: XX.XXXX"
  - Max del input se ajusta al disponible
- Columna `Coef. %` en tabla admin
- Coeficiente en diálogo de detalle
- Badge totalizador en CardHeader al filtrar por copropiedad (verde si ~100%, ámbar si no)

**Archivos modificados:**
- `back_contagracia/ph-service/src/modules/units/units.service.ts`
- `back_contagracia/ph-service/src/modules/units/units.controller.ts`
- `front_contagracia/src/modules/ph/services/ph.service.ts`
- `front_contagracia/src/app/dashboard/ph/units/page.tsx`

#### Paso 1 — Backend: Refactorizar updateQuorum()

**Archivo:** `assemblies.service.ts` → `updateQuorum()`

Cambiar de:
```
totalAttendees / totalUnits × 100
```
A:
```
Σ coeficientes de unidades con propietario presente / Σ coeficientes totales × 100
```

Lógica:
1. Obtener todas las unidades de la copropiedad con `is_active: true`
2. Para el denominador: sumar coeficientes de unidades que tengan al menos un residente activo tipo `owner`
3. Para el numerador: de las asistencias registradas, filtrar solo las que correspondan a propietarios (cruzar `attendance.tercero_id` con `PhUnitResident` donde `resident_type = 'owner'`), y sumar los coeficientes de sus unidades
4. Fallback: si no hay coeficientes (todos null/0), caer en conteo simple de unidades con propietario

#### Paso 2 — Backend: Refactorizar getAttendanceStats()

**Archivo:** `assemblies.service.ts` → `getAttendanceStats()`

Retornar campos adicionales:
```typescript
{
  total_attendees: number,        // todos los asistentes (propietarios + arrendatarios)
  owner_attendees: number,        // solo propietarios presentes
  total_units: number,            // unidades con propietario activo (no TODAS)
  total_coefficient: number,      // Σ coeficientes de unidades con propietario
  present_coefficient: number,    // Σ coeficientes de propietarios presentes
  quorum_percent: number,         // present_coefficient / total_coefficient × 100
  quorum_required: number,
  quorum_reached: boolean,
}
```

#### Paso 3 — Backend: Restringir castVote a propietarios

**Archivo:** `assemblies.service.ts` → `castVote()`

Antes de crear el resultado del voto:
1. Verificar que el `tercero_id` del votante tenga registro en `PhUnitResident` con `resident_type = 'owner'` en la copropiedad de la asamblea
2. Si es arrendatario: `throw BadRequestException('Solo los propietarios pueden votar')`
3. Un propietario vota una vez por votación (ya existe unique constraint `vote_id + tercero_id`)

#### Paso 4 — Frontend: Modal de asistencia — distinguir propietarios

**Archivo:** `asambleas/page.tsx`

- En el selector de residente del modal de asistencia, mostrar el tipo: "Juan David (Propietario - 2 unidades)" o "Pedro (Arrendatario - 1 unidad)"
- Ambos pueden registrar asistencia (para el acta), pero en la UI del quórum solo se cuentan propietarios

#### Paso 5 — Frontend: Card de Quórum mejorada

**Archivo:** `asambleas/page.tsx`

Actualizar la card de Quórum para mostrar:
```
Quórum
45.2%               (coeficiente presente / coeficiente total)
━━━━━━━━━━━━━━      (progress bar)
Requerido: 51%
3 propietarios de 5 presentes
Coef: 0.452 / 1.000
```

#### Paso 6 — Frontend: Residente arrendatario no ve botones de voto

**Archivo:** `asambleas/page.tsx`

- Si el residente logueado es tipo `tenant`: no mostrar UI de votación
- Mostrar mensaje: "Solo los propietarios pueden votar en las asambleas"
- El arrendatario sigue viendo la asamblea, asistencia y resultados

#### Paso 1–3 — Backend: computeQuorum + castVote owner-only ✅

- Nuevo método privado `computeQuorum(db, assembly)` centraliza la lógica:
  - Consulta unidades activas con propietarios activos y sus coeficientes
  - Construye `ownerCoeffMap: Map<tercero_id, suma_coeficientes>` para deduplicar propietarios multi-unidad
  - Cruza con asistencias para calcular `presentCoefficient` y `ownerAttendees`
  - Si `totalCoefficient > 0`: quórum = `presentCoefficient / totalCoefficient × 100`
  - Fallback: `ownerAttendees / totalOwners × 100` (conteo simple)
- `getAttendanceStats()` refactorizado: calcula `quorum_reached` en vivo (no lee valor stale de BD)
- Retorna `total_owners` (propietarios únicos) separado de `total_units`
- `updateQuorum()` reutiliza `computeQuorum()` y actualiza BD
- `castVote()`: verifica `PhUnitResident.resident_type === 'owner'` antes de permitir voto

#### Paso 4–6 — Frontend: UI quórum + restricción arrendatarios ✅

- Modal de asistencia muestra tipo: "Juan David (Propietario - 2 unidades)"
- Card de Quórum: porcentaje, progress bar, "N de N propietarios" (usa `total_owners`), coeficientes presentes/total, arrendatarios presentes como nota aparte
- Arrendatario logueado: ve "Solo los propietarios pueden votar" en vez de botones de voto
- Propietario sin asistencia: ve "Debes registrar tu asistencia antes de poder votar"
- `myIsOwner` useMemo verifica `resident_type === 'owner'` en `myUnits`

#### Criterios de aceptación

- [x] Quórum se calcula por coeficiente de copropiedad (no por conteo de unidades)
- [x] Solo propietarios cuentan para el quórum
- [x] Solo propietarios pueden votar (backend + frontend)
- [x] Arrendatarios pueden ver asambleas y registrar asistencia (acta) pero no votan
- [x] Fallback a conteo simple si no hay coeficientes definidos
- [x] Card de quórum muestra coeficiente presente vs total
- [x] Modal de asistencia distingue tipo de residente (propietario/arrendatario)

---

## Tarea 18 — Comunicados por roles

### Descripción

Envío de comunicados segmentados por rol dentro de la copropiedad. Los administradores pueden enviar mensajes a grupos específicos: copropietarios, arrendatarios, consejo de propietarios, o combinaciones de estos.

### Qué se necesita

**Backend** (`ph-service/src/modules/comunicados/`):
- Modelo `PhComunicado` con: título, cuerpo, roles destinatarios, copropiedad, fecha envío
- Modelo `PhComunicadoRecipient` para tracking de recepción
- Endpoint para crear y enviar comunicado a roles seleccionados
- Resolución de destinatarios via PhUnitResident → ThirdParty → email
- Envío masivo usando SMTP (mismo patrón de facturación masiva)

**Frontend**:
- Página de comunicados con historial de envíos
- Formulario: seleccionar copropiedad, roles destinatarios (checkboxes), título, cuerpo (editor)
- Vista de detalle con estadísticas de envío (enviados, fallidos, sin email)

### Nota de diseño

- Solo owner/tenant por ahora. "Consejo de propietarios" se deja para una futura iteración (requiere agregar `is_council_member` a PhUnitResident).
- Reutiliza `BillingEmailService` (Nodemailer + SMTP config por tenant) — mismo patrón de PQRS.
- Notificaciones in-app via HTTP POST a notification-service.

### Implementación

**Paso 1 — Modelos Prisma** (`contagracia-shared-modules/prisma/schema-tenant.prisma`):
- [x] `PhComunicado`: id, condominium_id, title, body (Text), target_roles (Json), status (draft|sent), sent_at, contadores (total_recipients/sent/failed/no_email), created_by, timestamps
- [x] `PhComunicadoRecipient`: id, comunicado_id, tercero_id, email, email_sent, email_error, created_at
- [x] Relación `comunicados PhComunicado[]` en PhCondominium
- [x] `npx prisma generate`

**Paso 2 — Permisos** (`contagracia-shared-modules/prisma/seeds/modules/actions/ph.ts`):
- [x] `ph.comunicados.view`, `ph.comunicados.create`, `ph.comunicados.delete`

**Paso 3 — Backend** (`ph-service/src/modules/comunicados/`):
- [x] DTOs: `create-comunicado.dto.ts`, `update-comunicado.dto.ts`
- [x] Service: findAll, findOne, create, update, remove, send, getStats, buildEmailHtml
- [x] Controller: GET /, GET /stats, GET /:id, POST /, PATCH /:id, POST /:id/send, DELETE /:id
- [x] Module: imports BillingModule + HttpModule
- [x] Registrar ComunicadosModule en app.module.ts

Flujo de `send()`:
1. Verificar status === 'draft'
2. Query PhUnitResident WHERE condominium_id + resident_type IN target_roles + is_active
3. Distinct por tercero_id (un dueño de 2 unidades recibe 1 email)
4. JOIN ThirdParty para emails
5. Crear PhComunicadoRecipient por cada tercero
6. BillingEmailService.sendEmail() para cada uno con email
7. Actualizar contadores + status='sent' + sent_at
8. Notificación in-app a notification-service

**Paso 4 — Frontend servicio** (`front_contagracia/src/modules/ph/services/ph.service.ts`):
- [x] `comunicadosService`: getAll, getStats, getOne, create, update, send, remove

**Paso 5 — Frontend página** (`front_contagracia/src/app/dashboard/ph/comunicados/page.tsx`):
- [x] Vista lista: KPIs + tabla + filtros + botón crear
- [x] Diálogo crear/editar: copropiedad, checkboxes roles, título, body, guardar/enviar
- [x] Vista detalle: info + stats + tabla recipients + botón enviar (si draft)

**Paso 6 — Navegación** (`front_contagracia/src/config/navigation.ts`):
- [x] Item "Comunicados" con icono, permiso `ph.comunicados.view`

### Criterios de aceptación

- [x] Se puede crear un comunicado seleccionando roles destinatarios
- [x] El sistema resuelve los emails de los residentes según su rol
- [x] Se envía email masivo a los destinatarios seleccionados
- [x] Se muestra estadística de envío (enviados/fallidos/sin email)
- [x] Historial de comunicados enviados con fecha y detalle

---

### Subtarea 18.1 — Categorización de Plantillas de Email + Rename modelo

**Estado:** ✅ Completado

**Contexto:** Las plantillas de email (`CrmEmailTemplate`) no tienen tipo/categoría — todas aparecen en una lista plana. Se quiere crear **tipos de plantilla** gestionables (ej: "Plantillas PH", "Plantillas CRM") asociados a módulos. Además se renombra el modelo a `EmailTemplate` para reflejar uso general.

#### Paso 1 — Rename modelos Prisma

- [x] `CrmEmailTemplate` → `EmailTemplate` (tabla `crm_email_templates` sin cambio)
- [x] `CrmEmailSend` → `EmailSend` (tabla `crm_email_sends` sin cambio)
- [x] Actualizar relaciones en `CrmAutomationStage`, `CrmFormAutomation`, `CrmEventAutomation`

#### Paso 2 — Nuevo modelo EmailTemplateType

- [x] Modelo: id, name, module_key (unique), description, is_active, timestamps
- [x] Agregar `type_id` (FK nullable) a `EmailTemplate`
- [x] `npx prisma generate`

#### Paso 3 — Backend: Rename accessors + CRUD tipos

- [x] Rename en integrations-service: service + controller + DTOs
- [x] Rename en crm-service: service + controller + email-sender + automation-engine
- [x] Rename en seed: seed-email-template.ts
- [x] CRUD tipos: findAllTypes, createType, updateType, removeType
- [x] Endpoint: `GET /api/email-templates/by-module/:moduleKey`
- [x] DTOs nuevos: create-template-type, update-template-type
- [x] Agregar `type_id` a DTOs existentes de template

#### Paso 4 — Frontend: Rename + servicio + hook

- [x] Rename tipos: `CrmEmailTemplate` → `EmailTemplate`, `CrmEmailSend` → `EmailSend`
- [x] Nuevo tipo: `EmailTemplateType`
- [x] emailService: getTypes, createType, updateType, removeType, getByModule
- [x] useEmail hook: estado types + CRUD

#### Paso 5 — Frontend: UI tipos en IntegrationsTab

- [x] Sección expandible "Tipos de Plantilla" (antes de Plantillas)
- [x] CRUD tipos con modal: nombre, módulo (Select), descripción
- [x] Select de tipo en modal crear/editar plantilla
- [x] Columna "Tipo" en tabla de plantillas

#### Paso 6 — Prisma generate + migrate tenants

- [x] `npx prisma generate`
- [x] `migrate-all-tenants.ts`

#### Paso 7 — Filtrado por módulo en consumidores

- [x] CRM automations: selector muestra solo plantillas con `type.module_key === 'crm'`
- [x] EmailTemplateEditor: variables diferenciadas por módulo (PH → PH_VARIABLE_GROUPS, CRM → CRM_VARIABLE_GROUPS, sin tipo → array vacío con mensaje informativo)
- [x] IntegrationsTab: lógica `variableGroups` corregida (antes defaulteaba a CRM cuando no había tipo seleccionado)
- [x] PH Comunicados: selector de plantilla PH opcional en modal de nuevo comunicado (pre-llena título y cuerpo, convierte HTML a texto plano)

#### Criterios de aceptación

- [x] Plantillas existentes siguen funcionando (tabla BD no cambió)
- [x] Se pueden crear tipos con module_key único por módulo
- [x] Plantillas se asignan a un tipo
- [x] Endpoint by-module retorna solo plantillas del tipo vinculado
- [x] CRM automations no se rompen
- [x] Al seleccionar tipo PH en editor de plantillas, aparecen solo variables PH
- [x] Al seleccionar tipo CRM, aparecen solo variables CRM
- [x] Sin tipo seleccionado, aparece mensaje "Selecciona un Tipo de Plantilla..."
- [x] En comunicados, si hay plantillas PH se muestra selector opcional para pre-llenar el comunicado

---

## Tarea 19 — Portería

**Estado:** ✅ Completado

### Descripción

Módulo de control de acceso con registro de ingreso/egreso, minuta digital y gestión de paquetería. Permite al portero registrar visitantes, proveedores y paquetes recibidos desde su propia cuenta con permisos limitados al módulo de portería.

### Rol `ph_portero` — Diseño

El portero tiene su propia cuenta de usuario con rol `ph_portero`, siguiendo el mismo patrón que `ph_resident`. Solo ve y puede operar el módulo de portería — no tiene acceso a facturación, asambleas, PQRS, ni configuración.

**Sidebar del portero:**
```
PH (Propiedad Horizontal)
└─ Portería     ← única sección visible
   ├─ Control de Acceso
   ├─ Paquetería
   └─ Minuta
```

### Implementación

#### Paso 1 — Seeds: nuevas actions para portería ✅

- [x] 4 acciones agregadas en `ph.ts`: `ph.porteria.view`, `ph.porteria.manage_access`, `ph.porteria.manage_packages`, `ph.porteria.manage_minuta`
- [x] `pnpm prisma:seed` ejecutado — total 710 acciones en master

#### Paso 2 — Seed: nuevo rol `ph_portero` ✅

- [x] `PH_PORTERO_PERMISSIONS`: 6 permisos (`ph.view`, `ph.dashboard.view`, `ph.porteria.*`)
- [x] `seedPhPorteroRole()` creado en `seed-ph-roles.ts` (mismo patrón que `ph_resident`)
- [x] Seeds ejecutados: `ph_portero` CREADO con 6 permisos en todos los tenants

#### Paso 3 — Navigation: habilitar ítem Portería ✅

- [x] Permiso corregido: `ph.porteria.view` (antes `ph.maintenance.view`)
- [x] Eliminado `disabled: true` y badge `'Pronto'`

#### Paso 4 — Modelos Prisma ✅

- [x] 3 modelos agregados: `PhAccessLog`, `PhPackage`, `PhMinutaEntry`
- [x] Relaciones en `PhCondominium` y `PhUnit`
- [x] `prisma generate` + `migrate-all-tenants` ejecutados
- [x] `pnpm install` en `back_contagracia/` para propagar cliente actualizado (dep `file:`)

#### Paso 5 — Backend CRUD ✅

**Módulo:** `ph-service/src/modules/porteria/`

- [x] DTOs: `create-access-log.dto.ts`, `create-package.dto.ts`, `create-minuta-entry.dto.ts`
- [x] `porteria.service.ts`: 13 métodos (access logs, packages con stats, minuta)
- [x] `porteria.controller.ts`: 12 endpoints con `@RequirePermissions`
- [x] `porteria.module.ts`: imports BillingModule + HttpModule + ConfigModule
- [x] `PorteriaModule` registrado en `app.module.ts`
- [x] Notificación al residente en `createPackage()`: email via BillingEmailService + in-app via notification-service

#### Paso 6 — Frontend servicio ✅

- [x] `porteriaService` agregado en `ph.service.ts`: 13 métodos + `getPackageStats`

#### Paso 7 — Frontend página ✅

**Archivo:** `front_contagracia/src/app/dashboard/ph/porteria/page.tsx`

- [x] Página con 3 tabs: Control de Acceso, Paquetería, Minuta
- [x] Filtro global de copropiedad en header (selector oculto si solo hay 1)
- [x] Permisos granulares: `canManageAccess`, `canManagePackages`, `canManageMinuta`
- [x] Tab Control de Acceso: tabla con badge de tipo, botón "Salida" en activos, filtros por tipo y fecha
- [x] Tab Paquetería: 3 KPIs (pendientes/notificados/entregados hoy), tabla con estado, botón "Entregado"
- [x] Tab Minuta: tarjetas con badge de tipo + turno, edición/eliminación
- [x] Dialogs UX mejorado: selector de copropiedad oculto cuando ya está seleccionado en header
- [x] Selector de torre en dialogs de acceso y paquete (carga torres del condominio activo)
- [x] Unidades filtradas por torre seleccionada
- [x] Carga dinámica de unidades+torres al seleccionar copropiedad dentro del dialog (sin `filterCondo`)
- [x] Filtrado de copropiedades para `ph_portero`: usa `residentsService.getMyUnits()` + `isPrivileged`
- [x] Auto-selección de copropiedad si el portero solo tiene una

### Criterios de aceptación

- [x] El portero tiene cuenta propia con rol `ph_portero` (solo ve portería)
- [x] Se puede registrar ingreso/egreso de visitantes con hora, motivo, unidad destino
- [x] Se puede registrar salida (exit_at) desde la tabla de accesos activos
- [x] Se puede registrar recepción de paquetes con destinatario
- [x] Se notifica al residente (email + in-app) cuando llega un paquete
- [x] El portero puede marcar un paquete como entregado
- [x] Minuta digital permite registrar novedades del turno con tipo y turno
- [x] Historial de accesos filtrable por fecha, tipo, unidad
- [x] Admin también ve la portería (tiene `ph.porteria.*` por wildcard `*`)
- [x] Seeds ejecutados: 4 nuevas acciones, rol `ph_portero` con 6 permisos
- [x] Dialogs no piden copropiedad cuando ya está seleccionada en el header
- [x] Selector de torre filtra unidades en dialogs de acceso y paquete

---

## ~~Tarea 20 — Citofonía Digital~~ (Descartado)

> Descartado por decisión de dirección. No se implementará.

---

## Tarea 21 — Bancos PH

> **Asignado a:** otro desarrollador

### Descripción

Módulo financiero de conciliación bancaria, registro de caja menor y manejo de efectivo/cuentas. Complementa el módulo de facturación existente.

### Qué se necesita

- Conciliación bancaria (cruce de extractos vs movimientos internos)
- Registro de caja menor
- Registro de efectivo y cuentas bancarias
- Reportes financieros
- Integración con facturación existente

### Criterios de aceptación

- [ ] Se pueden registrar cuentas bancarias de la copropiedad
- [ ] Se puede registrar caja menor con movimientos
- [ ] Conciliación bancaria básica (manual)
- [ ] Reportes de movimientos financieros

---

## Features futuras (NO en esta hoja de ruta)

| Feature | Notas |
|---------|-------|
| APP Residente | Portal/app móvil para residentes (votar, crear PQRS, ver comunicados, recibir notificaciones) |
| Recepción de email (inbound) | Captura automática de respuestas por email via webhook (SendGrid/Mailgun) |
| Facturación electrónica DIAN | Integración con facturación electrónica colombiana |

---

## Orden sugerido de implementación

```
Fase 1 (Completado):
  17. PQRS                    ✅ completado

Fase 2 (Completado):
  18. Comunicados por roles    ✅ completado

Fase 3 (Completado):
  19. Portería                 ✅ completado

~~Fase 4: Descartado (Citofonía Digital)~~

Independiente:
  21. Bancos PH                ← otro desarrollador, puede ir en paralelo
```

---

## Leyenda

- ✅ Completado
- 🚧 En desarrollo
- ❌ Pendiente
- ⏸ Bloqueado / en espera
