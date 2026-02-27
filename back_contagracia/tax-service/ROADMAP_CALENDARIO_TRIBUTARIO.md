# Hoja de Ruta: Calendario Tributario DIAN

## 📋 Resumen Ejecutivo

Migración del sistema de Calendario Tributario desde Python/FastAPI (servicio externo) a NestJS como módulo interno de `tax-service`.

**Sistema anterior:** Servicio Python independiente en `C:\Users\may13\OneDrive\Escritorio\arawana\Contagracia\DIAN`
**Sistema nuevo:** Módulo integrado en `tax-service` (puerto 3009)

---

## 🎯 Objetivo

Implementar un sistema completo de calendario tributario que:
1. Descargue y parsee PDFs del calendario DIAN
2. Almacene fechas de vencimiento por año
3. Calcule obligaciones aplicables según NIT de empresa
4. Envíe recordatorios automáticos de vencimientos
5. Provea APIs REST para frontend

---

## 📚 Referencias de Arquitectura

### Backend (NestJS)
Documento: `C:\Users\may13\OneDrive\Escritorio\arawana\Contagracia\NuevoContagracia\back_contagracia\README.md`

**Estructura de módulos:**
```
src/
├── modules/
│   └── {module}/
│       ├── {module}.module.ts
│       ├── {module}.controller.ts
│       ├── {module}.service.ts
│       ├── dto/
│       ├── entities/
│       └── ...
```

**Patrones:**
- Multi-tenancy: Database-per-tenant
- Prisma ORM (sin funciones SQL personalizadas)
- AuthModule + AuditModule + TenantContextModule
- Decoradores: `@Public()`, `@Audit()`, `@RequirePermissions()`
- Scheduler: `@nestjs/schedule` para cron jobs
- Variables de entorno en `.env`

### Frontend (Next.js)
Documento: `C:\Users\may13\OneDrive\Escritorio\arawana\Contagracia\NuevoContagracia\front_contagracia\ARQUITECTURA.md`

**Estructura de módulos:**
```
src/
├── modules/
│   └── {module}/
│       ├── components/
│       ├── hooks/
│       ├── services/
│       ├── stores/
│       ├── types/
│       └── utils/
```

**Patrones:**
- Feature-based organization
- Service layer para APIs
- Hooks para lógica de estado
- Stores (Zustand) para estado global
- Types con TypeScript estricto

---

## 🔍 Análisis del Sistema Actual (Python)

### Componentes Principales

1. **Parser de PDF** (`calendario/pdf_parser.py`)
   - Biblioteca: `pdfplumber`
   - Descarga PDFs de: `https://www.dian.gov.co/Calendarios/Calendario_Tributario_{year}.pdf`
   - Detecta tipos de impuestos (Renta, IVA, RST, Retención, etc.)
   - Maneja fechas según último dígito del NIT (0-9)
   - Soporta periodicidades: mensual, bimestral, anual

2. **API REST** (`calendario/routes.py`)
   - Framework: FastAPI
   - Endpoints de sincronización (parse, sync desde PDF/URL)
   - Endpoints de consulta (calendario empresa, próximas obligaciones)
   - Endpoints de recordatorios (ejecutar job, ver status)

3. **Job Scheduler** (`calendario/jobs/reminder_job.py`)
   - APScheduler (cron diario 7 AM)
   - Consulta todas las empresas activas
   - Busca obligaciones próximas (30 días)
   - Envía notificaciones a Django API

4. **Base de Datos** (Supabase/PostgreSQL)
   - `tax_obligation_types` - catálogo de tipos
   - `tax_calendar_dates` - fechas del calendario
   - `tax_calendar_sync_logs` - historial
   - Funciones SQL: `get_company_tax_calendar`, `get_upcoming_tax_obligations`

### Stack Tecnológico Actual
- Python 3.10+
- FastAPI
- pdfplumber (parsing PDF)
- Supabase (PostgreSQL)
- httpx (HTTP client)
- APScheduler (cron jobs)

---

## 🏗️ Arquitectura Propuesta (NestJS)

### Stack Tecnológico Nuevo

**Backend:**
- NestJS 11
- Prisma ORM
- pdf-parse o pdf-lib (parsing PDF en Node.js)
- axios (HTTP client)
- @nestjs/schedule (cron jobs)
- @nestjs/bull + bull (jobs en background - opcional)

**Frontend:**
- Next.js 16
- React 19
- TypeScript
- Zustand (estado)
- React Query (server state)
- Tailwind CSS + shadcn/ui

### Estructura del Módulo

```
tax-service/
├── src/
│   ├── modules/
│   │   ├── prisma/                    # Prisma service
│   │   │   ├── prisma.module.ts
│   │   │   └── prisma.service.ts
│   │   │
│   │   └── tax-calendar/              # Módulo principal
│   │       ├── tax-calendar.module.ts
│   │       ├── tax-calendar.controller.ts
│   │       ├── tax-calendar.service.ts
│   │       │
│   │       ├── services/              # Servicios especializados
│   │       │   ├── pdf-parser.service.ts
│   │       │   ├── dian-downloader.service.ts
│   │       │   └── reminder.service.ts
│   │       │
│   │       ├── dto/                   # DTOs
│   │       │   ├── sync-calendar.dto.ts
│   │       │   ├── parse-pdf.dto.ts
│   │       │   ├── get-calendar.dto.ts
│   │       │   └── reminder-config.dto.ts
│   │       │
│   │       ├── entities/              # Entidades
│   │       │   ├── tax-obligation-type.entity.ts
│   │       │   ├── tax-calendar-date.entity.ts
│   │       │   └── tax-calendar-sync-log.entity.ts
│   │       │
│   │       └── jobs/                  # Cron jobs
│   │           └── reminder.job.ts
│   │
│   ├── main.ts
│   └── app.module.ts
│
├── .env
└── package.json
```

---

## 🗄️ Esquema de Base de Datos (Prisma)

### Schema Master (`schema-master.prisma`)

```prisma
// Catálogo de tipos de obligaciones tributarias DIAN
model TaxObligationType {
  id            String   @id @default(uuid())
  code          String   @unique  // "RENTA_GC", "IVA_BIMESTRAL", "RST_ANUAL", etc.
  name          String              // "Renta Grandes Contribuyentes", etc.
  description   String?
  is_active     Boolean  @default(true)
  display_order Int      @default(0)
  created_at    DateTime @default(now())
  updated_at    DateTime @updatedAt

  calendar_dates TaxCalendarDate[]

  @@map("tax_obligation_types")
}

// Fechas del calendario tributario por año
model TaxCalendarDate {
  id                       String   @id @default(uuid())
  year                     Int                    // 2025, 2026, etc.
  tax_obligation_type_id   String
  period_name              String                 // "anual", "bimestral", "mensual"
  period_start_month       Int?                   // Mes inicio (1-12)
  period_end_month         Int?                   // Mes fin (1-12)
  installment_number       Int      @default(1)   // Cuota (1, 2, 3 para Renta GC)
  installment_description  String?                // "Primera cuota", "Bimestre ene-feb"
  nit_last_digits          String?                // "0"-"9" o null si no aplica por NIT
  due_date                 DateTime               // Fecha de vencimiento
  due_month_name           String                 // "enero", "febrero", etc.
  due_day                  Int                    // Día del vencimiento (1-31)
  is_declaration           Boolean  @default(false)
  is_payment               Boolean  @default(true)
  source_url               String?                // URL del PDF origen
  created_at               DateTime @default(now())
  updated_at               DateTime @updatedAt

  tax_obligation_type TaxObligationType @relation(fields: [tax_obligation_type_id], references: [id], onDelete: Cascade)

  @@index([year, tax_obligation_type_id])
  @@index([due_date])
  @@index([nit_last_digits])
  @@map("tax_calendar_dates")
}

// Log de sincronizaciones del calendario
model TaxCalendarSyncLog {
  id                 String   @id @default(uuid())
  year               Int
  source_url         String?                // URL del PDF descargado
  source_file_name   String?                // Nombre del archivo
  status             String                 // "success", "partial", "failed"
  records_created    Int      @default(0)
  records_updated    Int      @default(0)
  sync_duration_ms   Int?
  error_message      String?  @db.Text
  created_at         DateTime @default(now())

  @@map("tax_calendar_sync_logs")
}
```

**Nota:** NO se crearán funciones SQL. La lógica de filtrado por NIT y cálculo de días se implementará en Prisma queries y servicios NestJS.

---

## 📡 API Endpoints

### Sincronización

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| POST | `/api/tax-calendar/parse-pdf` | Parsear PDF subido (testing) | Protegido |
| POST | `/api/tax-calendar/sync-from-pdf` | Subir PDF y guardar en BD | Protegido |
| POST | `/api/tax-calendar/sync/:year` | Descargar desde DIAN y sincronizar | Protegido |
| GET | `/api/tax-calendar/status/:year` | Estado del calendario (año cargado?) | Protegido |
| GET | `/api/tax-calendar/sync-logs` | Historial de sincronizaciones | Protegido |

### Consultas

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| GET | `/api/tax-calendar/tipos` | Listar tipos de obligación | Protegido |
| GET | `/api/tax-calendar/:companyId/obligaciones` | Calendario de empresa | Protegido |
| GET | `/api/tax-calendar/:companyId/proximas` | Próximas obligaciones | Protegido |
| GET | `/api/tax-calendar/:companyId/mes/:year/:month` | Vista mensual | Protegido |

### Recordatorios

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| POST | `/api/tax-calendar/recordatorios/ejecutar` | Ejecutar job manualmente | Protegido |
| POST | `/api/tax-calendar/recordatorios/test/:companyId` | Test para empresa | Protegido |
| GET | `/api/tax-calendar/recordatorios/scheduler-status` | Estado del scheduler | Protegido |

---

## 🎨 Frontend - Vistas

### Ruta: `/dashboard/tax-calendar`

**Componentes principales:**
```
modules/tax/
├── components/
│   ├── CalendarView/
│   │   ├── MonthView.tsx           # Vista mensual tipo calendario
│   │   ├── ListView.tsx            # Lista de obligaciones
│   │   └── TimelineView.tsx        # Línea de tiempo
│   │
│   ├── ObligationCard/
│   │   └── ObligationCard.tsx      # Card de obligación individual
│   │
│   ├── UpcomingObligations/
│   │   └── UpcomingWidget.tsx      # Widget próximas obligaciones
│   │
│   ├── SyncModal/
│   │   ├── SyncFromUrlModal.tsx    # Sincronizar desde DIAN
│   │   └── SyncFromPdfModal.tsx    # Sincronizar desde PDF subido
│   │
│   └── FiltersBar/
│       └── FiltersBar.tsx          # Filtros (tipo, mes, estado)
│
├── hooks/
│   ├── useCalendar.ts              # Hook principal del calendario
│   ├── useObligationTypes.ts       # Hook tipos de obligación
│   ├── useUpcomingObligations.ts   # Hook próximas obligaciones
│   └── useSyncCalendar.ts          # Hook sincronización
│
├── services/
│   └── tax-calendar.service.ts     # Service layer API
│
├── stores/
│   └── taxCalendarStore.ts         # Estado global (filtros, vista)
│
├── types/
│   └── index.ts                    # Types del módulo
│
└── utils/
    ├── calendar.utils.ts           # Utilidades de calendario
    └── nit.utils.ts                # Utilidades NIT
```

**Features:**
- Vista mensual (calendario visual)
- Vista lista (tabla filtrable)
- Vista timeline (próximos 30/60/90 días)
- Filtros por tipo de obligación
- Badges de urgencia (vence hoy, vence mañana, urgente, normal, vencido)
- Botón "Sincronizar año" (admin)
- Widget en dashboard principal con próximas 5 obligaciones

---

## 📅 Plan de Implementación

### Fase 1: Setup Inicial (Día 1) ✅ COMPLETADA
- [x] Crear estructura de carpetas en tax-service
- [x] Agregar dependencias: `pdf-parse`, `axios`, `@nestjs/schedule`
- [x] Configurar variables de entorno (.env)
- [x] Crear módulo base `TaxCalendarModule`

### Fase 2: Base de Datos (Día 1-2) ✅ COMPLETADA
- [x] Agregar schema Prisma en `schema-master.prisma`
- [x] Generar cliente Prisma: `pnpm prisma:generate`
- [x] Push schema: `pnpm prisma:push:master`
- [x] Crear seed de tipos de obligación (`seed-tax-obligation-types.ts`)
- [x] Ejecutar seed

### Fase 3: Parser de PDF (Día 2-3) ✅ COMPLETADA
- [x] Implementar `PdfParserService`
  - [x] Método `extractTextFromPdf(buffer: Buffer)`
  - [x] Método `detectTaxTypes(text: string)`
  - [x] Método `extractDates(text: string, year: number)` - Lógica híbrida adaptada de Python
  - [x] Método `parsePdf(buffer: Buffer, year: number)`
- [x] Crear tests unitarios del parser (`test-parser-full.ts`)
- [x] Probar con PDFs reales de DIAN (2023-2026)
  - **2026:** 153 fechas ✅
  - **2025:** 358 fechas ✅
  - **2024:** 349 fechas ✅
  - **2023:** 281 fechas ✅

### Fase 4: Servicio de Descarga (Día 3) ✅ COMPLETADA
- [x] Implementar `DianDownloaderService`
  - [x] Método `downloadPdf(year: number): Promise<Buffer>`
  - [x] Manejo de errores (404, timeout, etc.)
  - [x] Retry logic (reintentos con backoff exponencial)
  - [x] Método `pdfExists(year)` - verificar existencia con HEAD request
  - [x] Método `getPdfUrl(year)` - obtener URL del PDF

### Fase 5: Servicio Principal (Día 4-5) ✅ COMPLETADA
- [x] Implementar `TaxCalendarService`
  - [x] `parsePdf(buffer, year)` - parsear sin guardar
  - [x] `syncFromPdf(buffer, year)` - parsear y guardar
  - [x] `syncFromDian(year)` - descargar y guardar
  - [x] `getStatus(year)` - verificar si año está cargado
  - [x] `getObligationTypes()` - listar tipos
  - [x] `getCompanyCalendar(companyId, year, month?)` - calendario empresa
  - [x] `getUpcomingObligations(companyId, daysAhead)` - próximas con urgencia
  - [x] `getSyncLogs(limit)` - historial
  - [x] `saveParsedDates()` - guardar fechas en BD (privado)
  - [x] `createSyncLog()` - crear log de sincronización (privado)
- [x] **Corrección de errores de compilación:**
  - [x] Actualizado schema Prisma: TaxCalendarSyncLog con campos correctos
  - [x] Corregida ruta de salida del generador Prisma
  - [x] Regenerado cliente Prisma con modelos tax calendar
  - [x] Corregido campo `company.name` → `company.company_name`
  - [x] Build exitoso sin errores TypeScript ✅

### Fase 6: Controller y DTOs (Día 5) ✅ COMPLETADA
- [x] Crear DTOs
  - [x] `ParsePdfDto` (FormData con file + year)
  - [x] `SyncCalendarDto` + `SyncFromUrlDto` (año + url)
  - [x] `GetCalendarDto` (year, month opcional)
  - [x] `GetUpcomingDto` (daysAhead)
- [x] Implementar `TaxCalendarController`
  - [x] 4 endpoints de sincronización (parse-pdf, sync-from-pdf, sync-from-url, sync/:year)
  - [x] 6 endpoints de consulta (tipos, obligaciones, próximas, mes, status, sync-logs)
- [x] Documentar con Swagger (`@ApiTags`, `@ApiOperation`, `@ApiParam`, `@ApiQuery`, `@ApiResponse`)
- [x] **Permisos definidos:** Cada endpoint tiene un comentario con el permiso requerido para el dev de permisos modulares
  - Permisos de sincronización: `tax-calendar.parse-pdf`, `tax-calendar.sync-from-pdf`, `tax-calendar.sync-from-url`, `tax-calendar.sync-from-dian`
  - Permisos de consulta: `tax-calendar.view-types`, `tax-calendar.view-company-calendar`, `tax-calendar.view-upcoming`, `tax-calendar.view-monthly`, `tax-calendar.view-status`, `tax-calendar.view-sync-logs`
- [x] Instalado `@types/multer` para file uploads
- [x] Build exitoso sin errores ✅

### Fase 7: Job de Recordatorios (Día 6-7) ✅ COMPLETADA
- [x] Implementar `ReminderService`
  - [x] `getActiveCompanies()` - empresas activas con NIT (con filtro post-query)
  - [x] `sendNotification(companyId, obligation)` - enviar notificación al notification-service
  - [x] `determineNotificationType(daysRemaining)` - 8 tipos de notificación según urgencia
  - [x] `processReminders(daysAhead, includeOverdue)` - procesar todas las empresas
  - [x] `processRemindersForCompany(companyId, daysAhead)` - testing para empresa específica
- [x] Implementar `ReminderJob` con `@Cron()`
  - [x] Job diario a las 7 AM (Colombia timezone)
  - [x] Job semanal los lunes a las 8 AM (60 días adelante)
  - [x] Métodos `executeManually()` y `executeForCompany()` para testing
  - [x] Variables de entorno: `TAX_REMINDER_ENABLED`, `TAX_REMINDER_CRON`, `TAX_REMINDER_DAYS_AHEAD`, `TAX_REMINDER_INCLUDE_OVERDUE`, `TAX_REMINDER_OVERDUE_DAYS`
- [x] Integración con notification-service vía HTTP (POST /api/notifications)
- [x] **3 endpoints agregados al controller con permisos definidos:**
  - `POST /recordatorios/ejecutar` - Permission: `tax-calendar.execute-reminders`
  - `POST /recordatorios/test/:companyId` - Permission: `tax-calendar.test-reminder`
  - `GET /recordatorios/scheduler-status` - Permission: `tax-calendar.view-scheduler-status`
- [x] Build exitoso sin errores ✅

### Fase 8: Testing Backend (Día 7-8)
- [ ] Unit tests de servicios
- [ ] Integration tests de endpoints
- [ ] E2E tests de flujo completo

### Fase 9: Frontend - Service Layer (Día 8-9) ✅ COMPLETADA
- [x] Crear `tax-calendar.service.ts`
  - [x] `syncFromDian(year)`
  - [x] `syncFromPdf(file, year)`
  - [x] `syncFromUrl(url, year)`
  - [x] `parsePdf(file, year)` - preview sin guardar
  - [x] `getStatus(year)`
  - [x] `getObligationTypes()`
  - [x] `getCalendar(companyId, year, month?)`
  - [x] `getUpcoming(companyId, daysAhead)`
  - [x] `getMonthlyCalendar(companyId, year, month)`
  - [x] `getSyncLogs(limit)`
  - [x] `executeReminders(daysAhead, includeOverdue)` - recordatorios
  - [x] `testForCompany(companyId, daysAhead)` - test empresa
  - [x] `getSchedulerStatus()` - estado del scheduler
- [x] Crear tipos TypeScript completos:
  - [x] `TaxObligationType`, `TaxCalendarDate`, `CompanyObligation`
  - [x] `CalendarStatusResponse`, `SyncLogEntry`
  - [x] `UpcomingObligationsResponse`, `CompanyCalendarResponse`
  - [x] `SyncResult`, `ParsePdfResult`
  - [x] `ReminderExecutionResult`, `ReminderTestResult`, `SchedulerStatus`
  - [x] Filtros: `CalendarFilters`, `UpcomingFilters`
- [x] Servicios organizados: `obligationTypesService`, `syncService`, `calendarService`, `reminderService`
- [x] Build exitoso sin errores ✅

### Fase 10: Frontend - Hooks (Día 9-10) ✅ COMPLETADA
- [x] `useTaxCalendar()` - calendario principal con navegación
  - [x] `fetchCalendar()`, `fetchMonthlyCalendar()`
  - [x] Navegación: `goToPreviousMonth()`, `goToNextMonth()`, `goToCurrentMonth()`
  - [x] Filtros: año, mes, tipo de obligación
- [x] `useUpcomingObligations()` - obligaciones próximas
  - [x] Filtro por urgencia (`urgent`, `soon`, `normal`)
  - [x] Helpers: `getUrgentObligations()`, `getSoonObligations()`, `getNormalObligations()`
  - [x] Agrupación: `getGroupedByDate()`, `getGroupedByType()`
- [x] `useTaxSync()` - sincronización
  - [x] `checkStatus(year)`, `fetchSyncLogs(limit)`
  - [x] `syncFromDian(year)`, `syncFromUrl(url, year)`, `syncFromPdf(file, year)`
  - [x] `parsePdf(file, year)` - preview
- [x] `useReminders()` - recordatorios
  - [x] `fetchSchedulerStatus()`, `executeReminders()`, `testReminders()`, `testForCompany()`
- [x] Todos los hooks usan patrón estándar: `useState/useEffect/useCallback` + `react-hot-toast`
- [x] Integración con `useAuthStore` para `companyId`
- [x] Build exitoso sin errores ✅

### Fase 11: Frontend - Componentes (Día 10-12) ✅ COMPLETADA
- [x] `MonthView` - Vista calendario mensual (CalendarGrid inline en page.tsx)
- [x] `ListView` - Vista lista con filtros (modo lista en Vista Mensual + Lista Completa)
- [ ] `TimelineView` - Vista timeline (pendiente, no prioritario)
- [x] `ObligationCard` - Card individual (inline en page.tsx)
- [ ] `UpcomingWidget` - Widget dashboard (pendiente)
- [ ] `SyncFromUrlModal` - Modal sincronizar desde DIAN (sync directo por botón)
- [ ] `SyncFromPdfModal` - Modal subir PDF (pendiente)
- [x] `FiltersBar` - Barra de filtros (FuzzySearchInput + Select de días/año)

### Fase 12: Frontend - Página Principal (Día 12-13) ✅ COMPLETADA
- [x] Crear `/app/(dashboard)/dashboard/tax-calendar/page.tsx`
- [x] Layout y tabs (Próximas / Vista Mensual / Lista Completa)
- [x] Integrar componentes
- [x] Estados de loading/error
- [x] Responsive design

### Fase 12.1: Búsqueda Fuzzy + Descarga PDF ✅ COMPLETADA
- [x] Componente reutilizable `FuzzySearchInput` en `shared/components/ui/`
- [x] Filtro por texto en las 3 pestañas (nombre obligación, período)
- [x] Descarga PDF con jsPDF + autoTable (mes, semestre, año)
- [x] Logo de empresa en PDF, link clickeable a DIAN
- [x] Ver detalle en `ROADMAP-busqueda-pdf-calendario.md`

### Fase 13: Frontend - Widget Dashboard (Día 13)
- [ ] Crear `UpcomingTaxWidget` para dashboard home
- [ ] Mostrar próximas 5 obligaciones
- [ ] Link a página completa

### Fase 14: Testing Frontend (Día 14)
- [ ] Unit tests de utils
- [ ] Integration tests de hooks
- [ ] E2E tests con Playwright

### Fase 15: Deployment y Documentación (Día 15)
- [ ] Documentación de API en README
- [ ] Documentación de uso para usuarios
- [ ] Variables de entorno en .env.example
- [ ] Deploy a staging
- [ ] QA y correcciones

---

## 🔧 Configuración

### Variables de Entorno

**tax-service/.env**
```env
# Database
DATABASE_MASTER_URL="postgresql://postgres:root@localhost:5432/contagracia_master?schema=public"
TENANT_DB_HOST="localhost"
TENANT_DB_PORT="5432"
TENANT_DB_USER="postgres"
TENANT_DB_PASSWORD="root"

# Auth
JWT_SECRET="dev-secret-key-change-in-production-256-bits-minimum"

# Service
PORT=3009
NODE_ENV="development"

# Tax Calendar
DIAN_CALENDAR_BASE_URL="https://www.dian.gov.co/Calendarios"
TAX_REMINDER_ENABLED="true"
TAX_REMINDER_CRON="0 7 * * *"  # 7 AM diario
TAX_REMINDER_DAYS_AHEAD="30"
TAX_REMINDER_INCLUDE_OVERDUE="true"
TAX_REMINDER_OVERDUE_DAYS="7"

# Notifications
NOTIFICATION_SERVICE_URL="http://localhost:3015"
```

---

## 🚨 Consideraciones Técnicas

### Diferencias Python → NestJS

| Aspecto | Python (Actual) | NestJS (Nuevo) |
|---------|----------------|----------------|
| PDF Parsing | `pdfplumber` | `pdf-parse` o `pdf-lib` |
| HTTP Client | `httpx` | `axios` o `@nestjs/axios` |
| Scheduler | `APScheduler` | `@nestjs/schedule` |
| ORM | Supabase raw SQL | Prisma ORM |
| Validación | Pydantic | `class-validator` + DTOs |
| Documentación | FastAPI auto | Swagger (`@nestjs/swagger`) |

### Desafíos del Parser PDF

**Python con pdfplumber:**
- Muy robusto para extraer texto de PDFs
- Buena detección de tablas
- Manejo flexible de formatos

**Node.js con pdf-parse:**
- Menos robusto que pdfplumber
- Extrae texto plano sin estructura de tablas
- Puede requerir más regex y lógica de parsing

**Solución:**
- Implementar parser robusto con regex
- Probar con PDFs de múltiples años
- Tener fallback manual (subir PDF parseado)
- Considerar usar librería alternativa si pdf-parse no es suficiente

### Lógica de Filtrado por NIT

**Antes (Función SQL):**
```sql
WHERE (nit_last_digits IS NULL OR nit_last_digits = v_last_digit)
```

**Ahora (Prisma Query):**
```typescript
const lastDigit = company.nit.slice(-1);

const dates = await this.prisma.taxCalendarDate.findMany({
  where: {
    year,
    OR: [
      { nit_last_digits: null },      // Aplica a todos
      { nit_last_digits: lastDigit }, // Aplica a este NIT
    ],
    tax_obligation_type: { is_active: true },
  },
  include: { tax_obligation_type: true },
  orderBy: { due_date: 'asc' },
});
```

### Notificaciones

**Antes:**
- Enviaba a Django: `POST /api/notifications/create/`

**Ahora:**
- Enviará a `notification-service`: `POST /api/notifications`
- Payload similar, ajustar según API del notification-service

---

## ✅ Criterios de Éxito

### Backend
- [ ] Parser PDF funcional con PDFs DIAN reales
- [ ] Sincronización exitosa de años 2024, 2025
- [ ] Endpoints REST documentados en Swagger
- [ ] Filtrado correcto por NIT de empresa
- [ ] Cálculo correcto de días hasta vencimiento
- [ ] Job de recordatorios ejecutándose diariamente
- [ ] Notificaciones enviadas correctamente
- [ ] Tests unitarios >80% coverage
- [ ] Sin errores en logs

### Frontend
- [ ] Vista calendario mensual funcional
- [ ] Vista lista con filtros y paginación
- [ ] Vista timeline de próximas obligaciones
- [ ] Widget en dashboard mostrando próximas 5
- [ ] Modal de sincronización (URL y PDF)
- [ ] Estados de loading/error bien manejados
- [ ] Responsive en mobile
- [ ] Integración con backend funcional

---

## 📦 Dependencias

### Backend (tax-service)
```json
{
  "dependencies": {
    "@nestjs/common": "^11.0.1",
    "@nestjs/core": "^11.0.1",
    "@nestjs/config": "^4.0.0",
    "@nestjs/platform-express": "^11.0.1",
    "@nestjs/swagger": "^11.1.3",
    "@nestjs/schedule": "^4.0.0",
    "@nestjs/axios": "^3.0.0",
    "axios": "^1.6.0",
    "pdf-parse": "^1.1.1",
    "class-validator": "^0.14.1",
    "class-transformer": "^0.5.1",
    "@prisma/client-master": "file:../contagracia-shared-modules/node_modules/@prisma/client-master",
    "@contagracia/shared-modules": "file:../contagracia-shared-modules"
  },
  "devDependencies": {
    "@types/pdf-parse": "^1.1.4"
  }
}
```

### Frontend (front_contagracia)
```json
{
  "dependencies": {
    "react-big-calendar": "^1.8.5",
    "date-fns": "^3.0.0"
  }
}
```

---

## 📝 Notas Finales

1. **No usar funciones SQL**: Toda la lógica se implementa en Prisma y servicios NestJS
2. **Multi-tenancy**: El calendario está en master DB (no es tenant-specific), pero las consultas filtran por company_id
3. **Parser PDF**: Es el componente crítico, requiere testing exhaustivo
4. **Notificaciones**: Integrar con notification-service del nuevo sistema
5. **Scheduler**: Configurar cron job para recordatorios diarios
6. **Frontend**: Seguir patrones de arquitectura frontend (feature-based)
7. **Testing**: Priorizar tests del parser y lógica de filtrado por NIT

---

**Fecha de creación:** 2026-02-04
**Autor:** Claude Sonnet 4.5
**Versión:** 1.0
