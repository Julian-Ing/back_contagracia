# Hoja de Ruta — Mejoras Módulo PH (Parte 2)

## Contexto

Continuación de `HOJA_DE_RUTA_PH_MEJORAS.md` (6 tareas completadas).
Documento de referencia: `Comentarios PH (1).pdf` — items marcados en rojo + página 2.

Esta hoja cubre las features que **se pueden implementar** sin depender de módulos completamente nuevos (portería, citofonía, PQRS quedan como features futuras).

---

## Estado General

| # | Tarea | Estado | Prioridad | Complejidad |
|---|-------|--------|-----------|-------------|
| 7 | Abonos / pagos parciales | ✅ Completado | Alta | Media |
| 8 | Factura en PDF | ✅ Completado | Alta | Media |
| 9 | Filtro por mes en cuotas | ✅ Completado | Alta | Baja |
| 10 | Gestión de pólizas | ✅ Completado | Media | Media |
| 11 | Plan de mantenimiento | ✅ Completado | Media | Media |
| 12 | Espacio documental | ✅ Completado | Media | Media |
| 13 | Asambleas (QR + asistencia + votaciones) | ✅ Completado | Media | Alta |
| 14 | Facturación masiva + envíos | ✅ Completado | Media | Alta |
| 15 | Pago de arrendamiento (soporte) | ✅ Completado | Baja | Media |
| 16 | Logo/imagen de copropiedad | ✅ Completado | Baja | Baja |

---

## Tarea 7 — Abonos / pagos parciales

### Descripción

Permitir registrar abonos parciales a cuotas (fees). Actualmente un fee solo cambia de estado mediante la generación, pero no hay forma de registrar pagos/abonos que reduzcan el `balance`.

### Qué se necesita

**Backend** (`ph-service/src/modules/billing/`):
- Nuevo modelo `PhPayment` en schema-tenant.prisma:
  - `id`, `fee_id`, `amount`, `payment_date`, `payment_method` (efectivo, transferencia, consignación), `reference`, `notes`, `receipt_url` (soporte), `created_by`, `created_at`
- Endpoint `POST /billing/fees/:feeId/payments` — registrar abono
  - Validar que `amount <= fee.balance`
  - Actualizar `fee.balance -= amount`
  - Si `balance == 0` → cambiar `fee.status` a `paid`, registrar `paid_at`
  - Si `balance > 0 && fee.status == 'pending'` → cambiar a `partial`
- Endpoint `GET /billing/fees/:feeId/payments` — listar pagos de un fee
- Migración del nuevo modelo

**Frontend** (`front_contagracia`):
- En detalle de cuota (modal read-only): agregar sección "Pagos/Abonos"
- Botón "Registrar Abono" → modal con monto, método, referencia, soporte (upload)
- Lista de abonos realizados con fecha, monto y referencia
- Actualizar la tabla de fees para mostrar el saldo actualizado

### Criterios de aceptación

- [x] Se puede registrar un abono parcial a una cuota
- [x] El saldo se actualiza automáticamente
- [x] Si se paga todo, el fee cambia a `paid`
- [x] Abono parcial cambia fee a `partial`
- [ ] Se puede subir un soporte/comprobante
- [x] No se puede abonar más del saldo pendiente

---

## Tarea 8 — Factura en PDF

### Descripción

Generar y descargar un PDF con el detalle de una cuota o un conjunto de cuotas de una unidad. El PDF debe incluir datos de la copropiedad, unidad, concepto, monto, saldo y estado.

### Qué se necesita

**Backend** (`ph-service`):
- Instalar `@nestjs/serve-static` o usar `pdfkit` / `puppeteer` / `@react-pdf/renderer` en servidor
- Endpoint `GET /billing/fees/:feeId/pdf` → genera PDF del fee individual
- Endpoint `GET /billing/units/:unitId/statement-pdf` → estado de cuenta completo de una unidad
- El PDF incluye: logo empresa, datos copropiedad, datos unidad, tabla de fees, totales, fecha generación

**Frontend:**
- Botón "Descargar PDF" en el detalle de cuota
- Botón "Estado de Cuenta" en la vista de Cartera por unidad
- Descarga directa del archivo

### Criterios de aceptación

- [x] Se puede descargar PDF de un fee individual
- [x] Se puede descargar estado de cuenta de una unidad
- [x] El PDF tiene formato profesional con datos de la empresa
- [x] Funciona la descarga directa desde el navegador

---

## Tarea 9 — Filtro por mes en cuotas

### Descripción

Agregar filtro por mes/periodo en la vista de facturación para poder ver las cuotas de un mes específico.

### Qué se necesita

**Frontend** (`front_contagracia/src/app/dashboard/ph/billing/page.tsx`):
- Agregar selector de mes/año en la barra de filtros
- Filtrar fees por `due_date` dentro del rango del mes seleccionado
- O filtrar por `billing_period_id` si los periodos son mensuales

**Backend** (si se necesita):
- Agregar query params `month` y `year` al endpoint `GET /billing/fees`
- Filtrar por rango de fechas: `due_date >= inicio_mes AND due_date <= fin_mes`

### Criterios de aceptación

- [x] Se puede filtrar cuotas por mes/año
- [x] El filtro se combina con los filtros existentes (copropiedad, estado, unidad)
- [ ] Por defecto muestra el mes actual

---

## Tarea 10 — Gestión de pólizas

### Descripción

CRUD de pólizas de seguro de las copropiedades. Incluye recordatorios de vencimiento y semáforo visual.

### Qué se necesita

**Backend** (`ph-service`):
- Nuevo modelo `PhInsurancePolicy` en schema-tenant.prisma:
  - `id`, `condominium_id`, `policy_number`, `insurance_company`, `policy_type` (todo riesgo, incendio, terremoto, RC, etc.), `coverage_amount`, `premium`, `start_date`, `end_date`, `renewal_date`, `status` (active, expired, cancelled), `document_url`, `notes`, `created_by`, `created_at`, `updated_at`
- CRUD endpoints: `GET/POST/PATCH/DELETE /insurance-policies`
- Cron job de recordatorio (similar a reservas): notificar X días antes del vencimiento

**Frontend:**
- Nueva página `/dashboard/ph/polizas` dentro del grupo Administración
- Tabla con semáforo: verde (vigente, >60 días), amarillo (próxima a vencer, <60 días), rojo (vencida)
- CRUD modal: crear, editar, eliminar póliza
- Upload de documento de la póliza
- Habilitar item en navegación (actualmente deshabilitado con badge "Pronto")

### Criterios de aceptación

- [x] CRUD completo de pólizas
- [x] Semáforo visual por estado de vencimiento
- [x] Filtro por copropiedad y tipo de póliza
- [x] Se puede subir el documento de la póliza
- [x] ThirdPartySelect para aseguradora (filtra ARL, SUPPLIER, OTHER)
- [x] NumericInput con formato COP y decimales del tenant
- [x] DatePicker con usePortal para modales
- [x] Historial de aseguradoras automático (al cambiar insurer en update, cierra anterior y crea nuevo)
- [x] Notificaciones de vencimiento (cron diario 7AM: alertas a 60d, 30d, 15d, 7d, 3d, 1d, vencida)
- [x] Notificación al cambiar aseguradora (evento inmediato en update)
- [x] Tipos frontend: ph_policy_expiring (amber), ph_policy_expired (red), ph_policy_insurer_changed (blue)

### Implementación notificaciones

**Backend** (`ph-service/src/modules/insurance-policies/jobs/`):
- `policy-reminder.service.ts` — servicio que itera empresas activas, busca pólizas con end_date en thresholds exactos, POST a notification-service
- `policy-reminder.job.ts` — cron `0 7 * * *` (7AM Colombia), configurable via `PH_POLICY_REMINDER_ENABLED`
- Modificar `insurance-policies.service.ts` → notificación inmediata al cambiar aseguradora en update()
- Modificar `insurance-policies.module.ts` → agregar HttpModule, ScheduleModule, nuevos providers

**Frontend** (`NotificationDropdown.tsx`):
- Agregar 3 tipos al TYPE_CONFIG con icono Shield

---

## Tarea 11 — Plan de mantenimiento

### Descripción

CRUD de planes de mantenimiento preventivo para las copropiedades (ascensores, bombas, tanques, jardines, etc.). Incluye semáforo y recordatorios.

### Qué se necesita

**Backend** (`ph-service`):
- Nuevo modelo `PhMaintenancePlan` en schema-tenant.prisma:
  - `id`, `condominium_id`, `name`, `description`, `category` (ascensores, bombas, jardines, eléctrico, plomería, etc.), `frequency` (mensual, trimestral, semestral, anual), `last_maintenance_date`, `next_maintenance_date`, `provider`, `estimated_cost`, `status` (on_track, due_soon, overdue), `notes`, `created_by`, `created_at`, `updated_at`
- Nuevo modelo `PhMaintenanceLog`:
  - `id`, `plan_id`, `maintenance_date`, `performed_by`, `cost`, `observations`, `document_url`, `created_by`, `created_at`
- CRUD endpoints para planes y registros de mantenimiento
- Cron job de recordatorio

**Frontend:**
- Nueva página `/dashboard/ph/mantenimiento` dentro del grupo Administración
- Tabla con semáforo: verde (al día), amarillo (próximo), rojo (vencido)
- Modal para registrar mantenimiento realizado
- Historial de mantenimientos por plan
- Habilitar item en navegación

### Criterios de aceptación

- [x] CRUD de planes de mantenimiento (por copropiedad; unidad se asigna al registrar mantenimiento)
- [x] Registro de mantenimientos realizados (historial con fecha, ejecutor, costo real, observaciones, soporte)
- [x] Edición y eliminación (con confirmación) de registros de mantenimiento
- [x] Selección múltiple de unidades en registro de mantenimiento (vacio = área común)
- [x] Auto-avance de next_maintenance_date al registrar mantenimiento según frecuencia
- [x] Semáforo visual: verde (>15d), ámbar (0-15d), rojo (vencido), gris (pausado), azul (completado)
- [x] ThirdPartySelect para proveedor (SUPPLIER) con pre-fill en editar plan y registrar log
- [x] NumericInput con prefijo $ y alineación izquierda para costos COP
- [x] DatePicker con usePortal para modales
- [x] Filtro por copropiedad, categoría y estado
- [x] Notificaciones de mantenimiento próximo (cron diario 7AM: alertas a 30d, 15d, 7d, 3d, 1d, hoy, vencido)
- [x] Tipos frontend: ph_maintenance_upcoming (amber), ph_maintenance_overdue (red)

---

## Tarea 12 — Espacio documental

### Descripción

Repositorio de documentos por copropiedad. Híbrido: permite subir archivos (PDF, DOCX, XLSX, imágenes) Y/O pegar enlaces externos (Google Drive, OneDrive, etc.).

**Arquitectura (adaptada a media-service)**: Los archivos se suben al `media-service` (puerto 3018) con categoría `ph_document`. El frontend sube primero a media-service, recibe `{ id, url: "/api/media/{id}" }`, y luego pasa la URL como metadato al crear/actualizar el documento en ph-service. ph-service solo guarda metadatos en la tabla `ph_documents` (tenant DB); no maneja archivos directamente.

### Rediseño UX (v2)

**Vista landing**: Grid de copropiedades con conteo de documentos. Click en una copropiedad → drill down a galería.

**Vista galería**: Documentos de esa copropiedad agrupados por categoría. Cada categoría es un Card con badge de color, nombre y conteo. Dentro: tabla de documentos con acciones.

**Categorías dinámicas**: CRUD de categorías de documento (reemplaza las hardcodeadas). Nivel empresa (compartidas entre copropiedades). Dialog de gestión accesible desde la landing.

### Implementación

**Prisma Schema** (`contagracia-shared-modules/prisma/schema-tenant.prisma`):
- Nuevo modelo `PhDocumentCategory`: id, company_id, name, slug, description?, color?, icon?, sort_order, is_active, created_by?, timestamps. `@@unique([company_id, slug])`, `@@map("ph_document_categories")`
- Modificar `PhDocument`: `category String` → `category_id String?` FK a PhDocumentCategory (onDelete: SetNull)

**media-service** (`category-config.ts`):
- Categoría `ph_document`: max 10MB, MIME PDF/DOCX/XLSX/DOC/XLS/PNG/JPG/JPEG, visibilidad `company`

**Backend — módulo document-categories** (`ph-service/src/modules/document-categories/`):
- DTOs: create (name requerido; description?, color?, icon?, sort_order?), update (PartialType + is_active?)
- Service: findAll (con _count documents), create (auto-slug), update, remove (soft delete), seedDefaults (6 categorías estándar con colores)
- Controller: `@Controller('companies/:companyId/ph/document-categories')`, NO @UseGuards
  - `GET /`, `GET /:id`, `POST /`, `POST /seed`, `PATCH /:id`, `DELETE /:id`

**Backend — actualizar documents** (`ph-service/src/modules/documents/`):
- DTOs: `category` → `category_id`
- Service: DOCUMENT_INCLUDE agrega `category: { select: { id, name, slug, color, icon } }`. Filtro por `category_id`. Nuevo método `findByCondominium(companyId, condominiumId)`
- Controller: query `category` → `category_id`. Nuevo endpoint `GET /by-condominium/:condominiumId`

**Script migración** (`prisma/scripts/migrate-document-categories.ts`):
- Para cada tenant: crea 6 categorías default, asigna `category_id` a docs existentes por match de slug con antiguo `category`

**Frontend — Types + Services:**
- Nuevo tipo `PhDocumentCategory` interface (id, name, slug, color, icon, sort_order, is_active, _count)
- Actualizar `PhDocument`: `category` string → `category_id?` + `category?` object
- Nuevo `documentCategoriesService`: getAll, create, update, remove, seedDefaults
- Agregar `documentsService.getByCondominium()`

**Frontend — Rediseño página** (`app/dashboard/ph/documentos/page.tsx`):
- Estado: `selectedCondominium: PhCondominium | null` (null = landing, set = galería)
- **Landing**: grid responsive de Cards por copropiedad (nombre, dirección, conteo docs) + botón "Gestionar Categorías"
- **Galería**: ← Volver + nombre copropiedad + "+ Nuevo Documento". Docs agrupados por categoría (Card con badge coloreado). Búsqueda por nombre
- **Dialog Crear/Editar**: category_id dinámico (Select desde categories), condominium_id implícito
- **Dialog Categorías**: tabla con color, nombre, count, acciones (editar/eliminar). "+ Nueva Categoría" con form de nombre + color

### Criterios de aceptación

**Base (v1 — completado):**
- [x] CRUD de documentos por copropiedad
- [x] Subir archivos hasta 10MB con drag & drop (vía media-service)
- [x] Pegar enlaces externos (Google Drive, OneDrive, etc.)
- [x] Híbrido: archivo subido Y/O enlace externo
- [x] Archivos gestionados por media-service (categoría `ph_document`, visibilidad `company`)
- [x] Descargar archivo / abrir enlace desde la tabla

**Rediseño UX (v2):**
- [x] Vista landing con grid de copropiedades y conteo de documentos
- [x] Click en copropiedad → galería de documentos agrupados por categoría
- [x] Categorías dinámicas con CRUD (crear, editar, eliminar)
- [x] Categorías con color y nombre personalizable
- [x] Seed automático de 6 categorías default al primer acceso
- [x] Migración de datos: docs existentes asignados a categoría por slug
- [x] Filtro/búsqueda dentro de la galería de una copropiedad
- [x] Archivar/restaurar documentos (toggle de estado con badge visual)
- [x] Descarga autenticada de archivos desde media-service (fetch+blob con JWT)

---

## Tarea 13 — Asambleas (QR + Asistencia + Votaciones + Excel)

### Descripción

Módulo para gestionar asambleas de copropietarios. El admin crea asambleas, genera QR para asistencia (los residentes escanean desde la APP — otro dev). Desde la web se gestiona asistencia manual, votaciones y descarga de resultados en Excel. Nosotros dejamos el backend completo (API) + admin UI web. La APP solo consume los endpoints.

### Prisma Schema (4 modelos nuevos)

**Archivo:** `contagracia-shared-modules/prisma/schema-tenant.prisma`

**PhAssembly:**
- `id` (UUID), `condominium_id` (FK), `title`, `description?`, `assembly_date` (DateTime), `start_time` (String "HH:MM"), `end_time?`, `location?`, `assembly_type` (ordinary/extraordinary), `quorum_required?` (Int %), `quorum_reached` (Boolean), `qr_code?` (UUID token para QR), `status` (scheduled/in_progress/completed/cancelled), `notes?`, `created_by?`, timestamps
- Relaciones: condominium, attendances[], votes[]
- Indexes: condominium_id, status, assembly_date
- `@@map("ph_assemblies")`

**PhAssemblyAttendance:**
- `id`, `assembly_id` (FK), `unit_id?`, `tercero_id?`, `delegate_name?` (si asiste apoderado), `method` (qr/manual), `checked_in_at` (DateTime), `notes?`, `created_at`
- `@@unique([assembly_id, tercero_id])` — un tercero solo se registra una vez
- `@@map("ph_assembly_attendances")`

**PhAssemblyVote** (tema de votación):
- `id`, `assembly_id` (FK), `title`, `description?`, `vote_type` (yes_no/multiple_choice), `options?` (JSON array para opciones), `status` (pending/open/closed), `opened_at?`, `closed_at?`, timestamps
- Relaciones: assembly, results[]
- `@@map("ph_assembly_votes")`

**PhAssemblyVoteResult** (voto individual):
- `id`, `vote_id` (FK), `tercero_id?`, `unit_id?`, `selected_option` (String), `voted_at` (DateTime)
- `@@unique([vote_id, tercero_id])` — un voto por persona por tema
- `@@map("ph_assembly_vote_results")`

### Backend — Módulo assemblies

**Nuevo directorio:** `ph-service/src/modules/assemblies/`

**Dependencias nuevas:** `pnpm add qrcode @types/qrcode exceljs`

**DTOs (5 + barrel):**
- `create-assembly.dto.ts` — title (req), condominium_id, assembly_date, start_time, end_time?, location?, assembly_type?, quorum_required?, notes?
- `update-assembly.dto.ts` — PartialType(Create)
- `register-attendance.dto.ts` — unit_id?, tercero_id?, delegate_name?, notes?
- `create-vote.dto.ts` — title (req), description?, vote_type, options? (JSON)
- `cast-vote.dto.ts` — tercero_id?, unit_id?, selected_option (req)

**Service (`assemblies.service.ts`):**

CRUD Asambleas:
- `findAll(companyId, { condominium_id?, status?, skip, take })` — include `_count: { attendances, votes }`
- `findOne(companyId, id)` — include attendances + votes con `_count.results`
- `create(companyId, dto, userId)` — auto-genera qr_code (UUID token)
- `update(companyId, id, dto)`, `remove(companyId, id)` — solo si scheduled
- `changeStatus(companyId, id, newStatus)` — scheduled→in_progress→completed | cancelled
- `generateQrCode(companyId, id)` — retorna data URL PNG del QR (lib `qrcode`)

Asistencia:
- `getAttendances(companyId, assemblyId)` — con info unidad/tercero
- `registerAttendance(companyId, assemblyId, dto, method='manual')` — verifica no duplicado
- `registerByQr(companyId, qrToken, terceroId)` — endpoint para la APP
- `removeAttendance(companyId, assemblyId, attendanceId)`

Votaciones:
- `createVote(companyId, assemblyId, dto)`, `updateVote`, `openVote`, `closeVote`
- `castVote(companyId, voteId, dto)` — solo si vote.status=open y asamblea in_progress
- `getVoteResults(companyId, voteId)` — conteos agrupados

Export Excel (usa `exceljs`):
- `exportAttendanceExcel(companyId, assemblyId)` → Buffer
- `exportVoteResultsExcel(companyId, assemblyId)` → Buffer

**Controller (`assemblies.controller.ts`):**
Ruta base: `companies/:companyId/ph/assemblies`

| Método | Ruta | Acción |
|--------|------|--------|
| GET | / | Listar asambleas |
| GET | /:id | Detalle (con attendance + votes) |
| POST | / | Crear |
| PATCH | /:id | Actualizar |
| DELETE | /:id | Eliminar (solo scheduled) |
| PATCH | /:id/status | Cambiar estado |
| GET | /:id/qr | Obtener QR como data-url |
| POST | /check-in/:qrToken | Registrar por QR (para APP) |
| GET | /:id/attendances | Listar asistencia |
| POST | /:id/attendances | Registrar asistencia manual |
| DELETE | /:id/attendances/:attId | Quitar asistencia |
| GET | /:id/attendances/export | Descargar Excel asistencia |
| POST | /:id/votes | Crear tema votación |
| PATCH | /votes/:voteId | Actualizar tema |
| PATCH | /votes/:voteId/open | Abrir votación |
| PATCH | /votes/:voteId/close | Cerrar votación |
| POST | /votes/:voteId/cast | Emitir voto (para APP) |
| GET | /votes/:voteId/results | Ver resultados |
| GET | /:id/votes/export | Descargar Excel votaciones |

### Frontend — Tipos + Servicios

**Types** (`modules/ph/types/index.ts`):
- `PhAssembly`: id, condominium_id, title, assembly_date, status, qr_code, _count, etc.
- `PhAssemblyAttendance`: id, assembly_id, unit_id, tercero_id, method, checked_in_at
- `PhAssemblyVote`: id, title, vote_type, options, status, _count.results
- `PhAssemblyVoteResult`: id, vote_id, selected_option, voted_at

**Services** (`modules/ph/services/ph.service.ts`):
- `assembliesService`: getAll, getOne, create, update, remove, changeStatus, getQrCode, getAttendances, registerAttendance, removeAttendance, exportAttendanceExcel, createVote, updateVote, openVote, closeVote, castVote, getVoteResults, exportVotesExcel

### Frontend — Página `/dashboard/ph/asambleas/page.tsx`

**Navegación:** Habilitar en `navigation.ts` (quitar `disabled: true`, agregar `href`)

**Patrones reutilizados del CRM:**
- QR: `qrcode.react` + `QRCodeCanvas` (patrón de CRM Forms)
- Excel export: `xlsx` (patrón de CRM Leads)
- Tabs: `Tabs`/`TabsContent` (patrón de CRM Campaigns)
- Stats cards + tabla + dialogs (patrón estándar PH)

**Diseño — navegación por estado (`selectedAssembly`):**

**Vista Lista** (selectedAssembly === null):
- Header: "Asambleas" + filtros (copropiedad, estado) + "+ Nueva Asamblea"
- Stats cards: Total, Programadas, En curso, Completadas
- Tabla: Título, Copropiedad, Fecha, Tipo, Asistentes, Votaciones, Estado (badge semáforo), Acciones
- Semáforo: scheduled→azul, in_progress→amarillo, completed→verde, cancelled→rojo

**Vista Detalle** (selectedAssembly !== null):
- Header: ← Volver + Título + badges + botones estado (Iniciar/Finalizar/Cancelar)
- Info card: fecha, hora, lugar, copropiedad, quórum (barra progreso)
- **Tabs** (patrón CRM Campaigns):
  - **Tab Asistencia:** tabla de asistentes + "Registrar" (manual) + "Mostrar QR" (dialog con QRCodeCanvas) + "Exportar Excel"
  - **Tab Votaciones:** lista de temas como Cards + "Nueva Votación" + botones Abrir/Cerrar + resultados (barras progreso) + "Exportar Excel"

**Dialogs:**
- Crear/Editar Asamblea: título, copropiedad (Select), fecha (DatePicker), hora inicio/fin, lugar, tipo, quórum, notas
- Registrar Asistencia Manual: unidad (Select), residente, delegado (opcional)
- QR Dialog: imagen QR grande + instrucciones + botón descargar PNG
- Crear/Editar Votación: título, descripción, tipo (sí/no o múltiple), opciones dinámicas
- Eliminar: confirmación

### Criterios de aceptación

- [x] CRUD de asambleas con estados (scheduled → in_progress → completed)
- [x] Generación de código QR por asamblea (data URL + descarga PNG)
- [x] Endpoint check-in por QR token (para APP)
- [x] Registro de asistencia manual desde la web
- [x] Cálculo de quórum (asistentes / total unidades)
- [x] CRUD de temas de votación con apertura/cierre
- [x] Endpoint para emitir voto (para APP, 1 voto por tercero por tema)
- [x] Visualización de resultados con barras de progreso
- [x] Descarga Excel de asistencia (lista completa)
- [x] Descarga Excel de resultados de votaciones
- [x] Vista lista con stats cards, semáforo y filtros
- [x] Vista detalle con tabs (asistencia + votaciones)
- [x] QR dialog con data URL desde backend (lib qrcode)
- [x] Navegación habilitada en sidebar
- [x] DatePicker y TimePicker personalizados en formulario
- [x] Lugar seleccionable desde zonas comunes o unidades
- [x] Quórum decimal (38,5 o 38.5) con normalización
- [x] Reabrir asamblea completada (completed → in_progress)
- [x] Permisos granulares registrados en seed (ph.assemblies.*)

---

## Tarea 14 — Facturación masiva + envíos

### Descripción

Mejorar el flujo de facturación para permitir enviar las facturas (PDFs) de un periodo masivamente por email a los residentes. El admin genera las cuotas de un periodo, y luego con un botón "Enviar Facturas" se generan los PDFs y se envían al email de cada residente.

La configuración SMTP ya existe en la tabla `EmailSmsConfig` del tenant DB (se configura en company-profile → Integraciones). El patrón de envío con Nodemailer ya existe en crm-service (`EmailSenderService`). ph-service lee la config SMTP directamente del tenant y envía con Nodemailer (mismo patrón que crm-service).

### Qué se necesita

**Prisma** (`schema-tenant.prisma`):
- Agregar `email_sent_at DateTime?` al modelo `PhFee` para tracking de envío

**Backend** (`ph-service`):
- Instalar `nodemailer` + `@types/nodemailer`
- Nuevo `BillingEmailService` (`billing/email.service.ts`):
  - Lee SMTP config de `emailSmsConfig.findFirst()` (tenant DB)
  - `sendEmail(companyId, { to, subject, html, attachments })` con Nodemailer
- Nuevo método `sendPeriodInvoices(companyId, periodId)` en `billing.service.ts`:
  1. Verifica SMTP configurado
  2. Busca todas las fees del periodo (status != cancelled)
  3. Agrupa por unit_id (un email por unidad)
  4. Para cada unidad: obtiene email del residente primario (PhUnitResident → ThirdParty.email)
  5. Genera PDF de cada fee con `generateFeePdf()`
  6. Envía email con PDFs adjuntos
  7. Marca fees con `email_sent_at = now()`
  8. Retorna resumen: `{ total_units, sent, failed, skipped_no_email }`
- Endpoint `POST /billing/periods/:periodId/send-invoices`
- Template HTML inline con datos del periodo, unidad, conceptos y montos

**Frontend** (`front_contagracia`):
- Método `sendInvoices` en `billingPeriodsService`
- Botón "Enviar Facturas" (icono Mail) en acciones de cada periodo (tabla Periodos)
  - Disabled si status === `draft`
- Dialog de confirmación: nombre periodo, copropiedad, # cuotas
- Dialog de resultado: enviadas, fallidas, sin email
- Campo `email_sent_at` en tipo PhFee

### Flujo de datos: Fee → Email

```
PhFee.resident_id → PhUnitResident.tercero_id → ThirdParty.email (tenant DB)
Si resident_id es null: PhFee.unit_id → PhUnit.residents (is_primary=true) → tercero_id → ThirdParty.email
```

### Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `contagracia-shared-modules/prisma/schema-tenant.prisma` | +`email_sent_at DateTime?` en PhFee |
| `ph-service/package.json` | +`nodemailer`, `@types/nodemailer` |
| `ph-service/src/modules/billing/email.service.ts` | **NUEVO** — Nodemailer wrapper |
| `ph-service/src/modules/billing/billing.service.ts` | +`sendPeriodInvoices()` |
| `ph-service/src/modules/billing/billing.controller.ts` | +endpoint POST send-invoices |
| `ph-service/src/modules/billing/billing.module.ts` | +BillingEmailService provider |
| `front_contagracia/src/modules/ph/services/ph.service.ts` | +`sendInvoices` method |
| `front_contagracia/src/modules/ph/types/index.ts` | +`email_sent_at` en PhFee |
| `front_contagracia/src/app/dashboard/ph/billing/page.tsx` | +botón + dialog + handler |

### Dependencias

- Tarea 8 (Factura PDF) ✅ completada
- SMTP configurado en company-profile → Integraciones

### Criterios de aceptación

- [x] Se pueden enviar todas las facturas de un periodo por email
- [x] Cada residente recibe email con PDF(s) adjunto(s) de sus cuotas
- [x] Se registra `email_sent_at` en cada fee enviada
- [x] Dialog de confirmación antes de enviar
- [x] Resultado muestra: enviadas, fallidas, sin email
- [x] Botón deshabilitado si periodo en draft (sin fees)
- [x] Re-envío funciona (actualiza `email_sent_at`)
- [x] Residentes sin email aparecen como "sin email" en resultado

---

## Tarea 15 — Soporte de Pago de Arrendamiento (PDF)

### Descripción

Generar un soporte/recibo PDF del alquiler completado. El módulo de alquileres ya tiene CRUD + checkout con cálculo de minutos/monto. Solo falta el PDF. Patrón PDF ya existe en billing (`pdfkit`). No requiere modelos nuevos ni cambios en Prisma.

### Qué se necesita

**Backend** (`ph-service/src/modules/rentals/`):

- Método `generateReceiptPdf(companyId, rentalId)` en `rentals.service.ts`:
  - Busca rental con relaciones (unit → unit_type + residents, renter_unit + residents, condominium)
  - Genera PDF con `pdfkit` (mismo patrón que `billing.service.ts`):
    - Header: logo empresa + nombre copropiedad
    - Título: "Soporte de Alquiler"
    - Datos: unidad alquilada (número + tipo), residentes/arrendatarios de ambas unidades, copropiedad, entrada, salida, duración total, minutos libres, minutos facturables, tarifa, **monto total (COP)**, estado, notas
    - Footer: fecha generación
  - Retorna `Promise<Buffer>`
- Endpoint `GET /rentals/:id/receipt` en `rentals.controller.ts`:
  - Responde `Content-Type: application/pdf`, `Content-Disposition: attachment`
  - JSDoc: `/** Permission: ph.rentals.view */`

**Frontend** (`front_contagracia`):

- Método `downloadReceipt` en `rentalsService` (responseType: blob)
- Handler `handleDownloadReceipt(rentalId)` en la página de alquileres
- Botón "Descargar Soporte" en:
  - Dropdown de acciones (tabla) — solo si status === 'completed'
  - Dialog de detalle — solo si status === 'completed'
- Mismo patrón de descarga que `handleDownloadFeePdf` en billing

### Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `ph-service/src/modules/rentals/rentals.service.ts` | +método `generateReceiptPdf` (~80 líneas) |
| `ph-service/src/modules/rentals/rentals.controller.ts` | +endpoint `GET /:id/receipt` (~15 líneas) |
| `front_contagracia/src/modules/ph/services/ph.service.ts` | +método `downloadReceipt` (2 líneas) |
| `front_contagracia/src/app/dashboard/ph/rentals/page.tsx` | +handler + botón en dropdown + botón en detalle (~30 líneas) |

### Dependencias

- Módulo de alquileres ya existente
- `pdfkit` ya instalado en ph-service (lo usa billing)

### Criterios de aceptación

- [x] Se puede generar soporte PDF de un alquiler completado
- [x] El PDF incluye datos del arrendatario (residentes de la unidad que alquila)
- [x] El PDF incluye datos de la unidad alquilada (número, tipo, copropiedad)
- [x] El PDF muestra desglose: duración, minutos libres, facturables, tarifa, monto COP
- [x] Botón solo visible en alquileres con status 'completed'
- [x] Descarga directa desde dropdown y desde dialog de detalle
- [x] DatePicker con usePortal para evitar recorte en modal

---

## Tarea 16 — Logo/imagen de copropiedad

### Descripción

Agregar campo de imagen/logo a las copropiedades para que aparezca en los PDFs (facturación, soporte de alquiler, asambleas) y en la UI. Actualmente los informes salen sin logo porque no hay imagen asociada a la copropiedad.

### Qué se necesita

**Prisma** (`schema-tenant.prisma`):
- Agregar `logo_url String?` al modelo `PhCondominium`
- Migración

**Backend** (`ph-service/src/modules/condominiums/`):
- Aceptar `logo_url` en create/update DTOs
- Incluir `logo_url` en los selects existentes

**media-service** (`category-config.ts`):
- Nueva categoría `ph_condominium_logo`: max 2MB, MIME PNG/JPG/JPEG/WEBP, visibilidad `public` (para `<img>` sin auth)

**Frontend** (`app/dashboard/ph/condominiums/page.tsx`):
- Agregar upload de imagen en modal crear/editar (mismo patrón que documentos: subir a media-service, guardar URL)
- Mostrar preview de la imagen en la tabla/card de copropiedades

**PDFs** (billing, rentals, assemblies):
- Usar `fetchImageBuffer(condominium.logo_url)` para incluir logo en el header de los PDFs generados

### Criterios de aceptación

- [x] Se puede subir imagen/logo al crear o editar copropiedad
- [x] La imagen se sube via media-service (categoría `ph_condominium_logo`)
- [x] Se muestra preview en la tabla de copropiedades
- [x] Los PDFs de facturación incluyen el logo de la copropiedad (prioriza copropiedad > empresa)
- [x] El soporte de alquiler incluye el logo de la copropiedad
- [ ] Los exports de asambleas incluyen el logo (opcional, futuro)
- [x] Se muestra logo en el diálogo de detalle de copropiedad
- [x] `fetchImageBuffer` resuelve URLs relativas de media-service (`/api/media/{id}` → `http://localhost:3018/api/media/{id}`)

---

## Features futuras (NO en esta hoja de ruta)

Estas requieren módulos completamente nuevos y/o integración con APP móvil:

| Feature | Notas |
|---------|-------|
| Comunicados por roles | Sistema de mensajería (copropietarios, arrendatarios, consejo) |
| Portería | Control ingreso/egreso, minuta digital, paquetería |
| Citofonía Digital | Comunicación en tiempo real (requiere WebRTC/VoIP) |
| PQRS | Peticiones, Quejas, Reclamos con workflow (requiere APP) |
| Bancos PH | Conciliación bancaria, caja menor, registro de efectivo |
| Mejora ingresos contables | No pedir cuenta contable al registrar ingreso, cargar soporte |

---

## Orden sugerido de implementación

```
Fase 1 (Quick wins - extienden lo existente):
  9. Filtro por mes en cuotas          ← 1-2 horas
  7. Abonos / pagos parciales          ← 1 día

Fase 2 (PDFs y envíos):
  8. Factura en PDF                    ← 1 día
  14. Facturación masiva + envíos      ← depende de 8
  15. Pago arrendamiento (soporte)     ← depende de 8

Fase 3 (Módulos nuevos - CRUD):
  10. Gestión de pólizas               ← 1 día
  11. Plan de mantenimiento            ← 1 día
  12. Espacio documental               ← 1 día

Fase 4 (Módulo complejo):
  13. Asambleas                        ← 2-3 días
```

---

## Leyenda

- ✅ Completado
- 🚧 En desarrollo
- 🔍 Pendiente de iniciar
- ⏳ Esperando dependencias
- ❌ No aplica
