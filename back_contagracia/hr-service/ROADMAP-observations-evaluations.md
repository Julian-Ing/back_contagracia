# Hoja de Ruta: Migración de Employee Observations + Performance Evaluations

> **Origen:** `horizont/src/pages/dashboard/EmployeeObservations.jsx` y `PerformanceEvaluations.jsx`
> **Destino:** `NuevoContagracia/back_contagracia/hr-service` (NestJS) + `front_contagracia` (Next.js)
> **Fecha:** 2026-02-11
> **Estado:** Backend COMPLETO + fix permisos, Frontend Observaciones COMPLETO (2 tabs), Evaluaciones en curso (falta 4 tabs)

---

## 0. Notas y decisiones confirmadas

### 0.1 Activación del hr-service

El hr-service estaba comentado en `pnpm-workspace.yaml`. Se activó:

```yaml
# pnpm-workspace.yaml — ANTES
# - 'hr-service'

# pnpm-workspace.yaml — AHORA
- 'hr-service'
```

Los scripts de `package.json` raíz (`dev:hr`, `build:hr`, `start:hr`) ya existían apuntando a hr-service. Solo faltaba el workspace.

### 0.2 Flujo de migraciones Prisma (multi-tenant)

Documentado en `back_contagracia/README.md` y scripts en `contagracia-shared-modules/prisma/scripts/`:

1. Modificar `schema-tenant.prisma` (en `contagracia-shared-modules/prisma/`)
2. Regenerar clientes: `cd contagracia-shared-modules && pnpm prisma:generate`
3. Sincronizar tenants existentes: `npx ts-node --transpile-only prisma/scripts/migrate-all-tenants.ts --force`
   - Este script lee todas las empresas activas de la master DB
   - Ejecuta `prisma db push --schema=schema-tenant.prisma` contra cada tenant DB
   - Usa `--accept-data-loss --skip-generate`
   - También crea extensión `pg_trgm` e índices GIN para búsqueda fuzzy

**NO se usa `prisma migrate dev` para tenants.** Se usa `db push` via el script `migrate-all-tenants.ts`.

### 0.3 Overall score como Decimal

El `overall_score` en `PerformanceEvaluation` será `Decimal(3,2)` en vez de `Int`, para mantener la precisión del promedio ponderado (ej: `3.50` en vez de `4`). Los scores individuales (`attendance_score`, `performance_score`, `attitude_score`) se mantienen como `Int` (1-5).

### 0.4 Self-view para empleados

Los empleados deben poder ver sus propias observaciones y evaluaciones. Se implementará con el mismo patrón de `time-attendance`:

- `observations.self_view` — Ver mis propias observaciones
- `performance.self_view` — Ver mis propias evaluaciones

Se usará `@RequireAnyPermission('observations.view', 'observations.self_view')` en los endpoints GET, y en el service se filtrará por `employee_profile_id` del usuario si solo tiene `self_view`.

### 0.5 Permisos granulares — YA DEFINIDOS en seeds

Los permisos ya existen en `contagracia-shared-modules/prisma/seeds/modules/actions/hr_performance.ts` bajo el módulo `hr_performance` (módulo 29):

```typescript
// Permisos existentes (17 total):
// --- Performance ---
'performance.view'           // Ver Evaluaciones
'performance.create'         // Crear Evaluación
'performance.edit'           // Editar Evaluación
'performance.delete'         // Eliminar Evaluación
'performance.complete'       // Completar Evaluación
'performance.approve'        // Aprobar Evaluación
'performance.auto_generate'  // Generar Automáticamente
// --- Goals (futuro, no se implementa ahora) ---
'goals.view'                 // Ver Objetivos
'goals.create'               // Crear Objetivo
'goals.edit'                 // Editar Objetivo
'goals.delete'               // Eliminar Objetivo
// --- Observations ---
'observations.view'          // Ver Observaciones
'observations.create'        // Crear Observación
'observations.edit'          // Editar Observación
'observations.delete'        // Eliminar Observación
'observations.send_report'   // Enviar Reporte
'observations.export'        // Exportar Observaciones
```

**Pendiente agregar al seed:**
- `observations.self_view` — Ver Mis Observaciones
- `performance.self_view` — Ver Mis Evaluaciones

El sistema de permisos NO guarda permisos en el JWT. El `PermissionsGuard` global consulta la BD tenant en tiempo real (con cache de 60s). Los action_keys se definen en `system_action` (master) y se asignan a roles en cada tenant.

Los controllers usarán los decoradores de `@contagracia/shared-modules`:
- `@RequirePermissions('action.key')` — Requiere TODOS (AND)
- `@RequireAnyPermission('a', 'b')` — Requiere AL MENOS UNO (OR)

### 0.6 Módulo definido en seeds

El módulo `hr_performance` ya está registrado en `contagracia-shared-modules/prisma/seeds/modules/definitions.ts`:

```typescript
{ module_key: 'hr_performance', module_name: 'Evaluaciones', description: 'Desempeño y objetivos', icon: 'Target', group: 'Recursos Humanos', sort_order: 85 }
```

No hay que crear módulos nuevos en las seeds, solo agregar los 2 permisos de self_view.

---

## 1. Análisis del estado actual

### 1.1 Lo que existe en Horizont (viejo)

| Archivo | Líneas | Descripción |
|---------|--------|-------------|
| `EmployeeObservations.jsx` | ~1941 | Página monolítica: CRUD, stats, reportes, email |
| `PerformanceEvaluations.jsx` | ~1936 | Dashboard inteligente, análisis, evaluaciones formales, reportes |
| `EmployeeObservationForm.jsx` | ~370 | Modal form crear/editar observación |
| `EmployeeObservationView.jsx` | ~310 | Modal vista lectura observación |
| `PerformanceEvaluationForm.jsx` | ~420 | Modal form crear/editar evaluación |
| `PerformanceEvaluationView.jsx` | ~360 | Modal vista lectura evaluación |

**Tecnología vieja:** React + Supabase directo (sin backend), lógica de negocio 100% en frontend.

### 1.2 Tablas Supabase a migrar

**`employee_observations`**
- `id`, `employee_id`, `title`, `description`, `action_required`, `follow_up_date`
- `observation_date`, `observation_type` (6 tipos), `severity` (3 niveles), `status` (3 estados)
- `created_by` (auth.users), `created_at`, `updated_at`

**`performance_evaluations`**
- `id`, `employee_id`, `evaluation_period`, `evaluation_date`
- `overall_score`, `attendance_score`, `performance_score`, `attitude_score` (1-5)
- `strengths`, `areas_for_improvement`, `goals_next_period`
- `evaluator_comments`, `employee_comments`
- `evaluator_id` (auth.users), `status` (draft/completed/approved)

### 1.3 Lo que ya existe en NuevoContagracia

**Backend hr-service (puerto 3012) - Módulos actuales:**
- `employees` → ThirdParty + EmployeeProfile + Contracts + Salary
- `company-settings` → Configuración HR por empresa
- `social-security-entities` → EPS, Pensión, ARL
- `time-attendance` → Asistencia + horas extras (AttendanceRecord, OvertimeRecord)
- `leaves` → Solicitudes de permisos/vacaciones
- `hr-expenses` → Viáticos y gastos

**Prisma (schema-tenant.prisma):**
- `EmployeeProfile` ya tiene relaciones con `AttendanceRecord`, `OvertimeRecord`, `LeaveRequest`, `EmployeeTravelExpense`
- **NO existen** modelos para `EmployeeObservation` ni `PerformanceEvaluation`
- **NO existen** los enums necesarios

**Patrón establecido (referencia: `time-attendance`, `leaves`):**
```
src/modules/[modulo]/
├── [modulo].controller.ts    # Endpoints con JwtAuthGuard + RequirePermissions + Swagger
├── [modulo].module.ts        # Module NestJS
├── [modulo].service.ts       # Lógica de negocio con TenantContextService
├── dto/
│   ├── create-*.dto.ts       # class-validator + Swagger decorators
│   ├── update-*.dto.ts
│   ├── query-*.dto.ts
│   └── index.ts
└── index.ts
```

**Patrones clave del service (extraídos de time-attendance y leaves):**
```typescript
@Injectable()
export class XxxService {
  constructor(private readonly tenantContext: TenantContextService) {}

  private verifyCompanyAccess(jwtCompanyId: string, companyId: string): void {
    if (jwtCompanyId !== companyId) {
      throw new ForbiddenException('No tienes acceso a esta empresa');
    }
  }

  private async getTenantDb(companyId: string) {
    const tenantDb = await this.tenantContext.getTenantClient(companyId);
    if (!tenantDb) {
      throw new NotFoundException('Empresa no encontrada o inactiva');
    }
    return tenantDb;
  }
}
```

---

## 2. Qué se hará

### Fase 0: Activar hr-service + agregar self_view al seed

- [x] Descomentar `hr-service` en `pnpm-workspace.yaml`
- [ ] Agregar `observations.self_view` y `performance.self_view` en `hr_performance.ts` (seed de permisos)
- [ ] Re-ejecutar seed para que los nuevos permisos queden en master DB

### Fase 1: Modelos Prisma (schema-tenant.prisma)

**Agregar enums:**
```prisma
enum ObservationType {
  RECOGNITION   // Reconocimiento
  FEEDBACK      // Retroalimentación
  INCIDENT      // Incidente
  WARNING       // Amonestación
  ACHIEVEMENT   // Logro
  CONCERN       // Preocupación
}

enum ObservationSeverity {
  LOW
  MEDIUM
  HIGH
}

enum ObservationStatus {
  ACTIVE
  RESOLVED
  ARCHIVED
}

enum EvaluationStatus {
  DRAFT
  COMPLETED
  APPROVED
}
```

**Agregar modelos:**

```prisma
model EmployeeObservation {
  id                  String              @id @default(uuid())
  employee_profile_id String
  title               String
  description         String
  observation_date    DateTime            @db.Date
  observation_type    ObservationType
  severity            ObservationSeverity @default(MEDIUM)
  status              ObservationStatus   @default(ACTIVE)
  action_required     String?
  follow_up_date      DateTime?           @db.Date
  created_by_id       String              // FK → TenantUser.id (quien registra)

  created_at DateTime @default(now())
  updated_at DateTime @updatedAt

  // Relaciones
  employee_profile EmployeeProfile @relation("ProfileObservations", fields: [employee_profile_id], references: [id], onDelete: Cascade)
  created_by       TenantUser      @relation("ObservationCreator", fields: [created_by_id], references: [id])

  @@index([employee_profile_id])
  @@index([observation_type])
  @@index([status])
  @@index([observation_date])
  @@index([created_by_id])
  @@map("employee_observations")
}

model PerformanceEvaluation {
  id                    String           @id @default(uuid())
  employee_profile_id   String
  evaluation_period     String           // "2026-Q1", "2026-01", etc.
  evaluation_date       DateTime         @db.Date
  status                EvaluationStatus @default(DRAFT)

  // Scores individuales (1-5 entero)
  attendance_score      Int?
  performance_score     Int?
  attitude_score        Int?

  // Score general (promedio ponderado, DECIMAL para precisión)
  overall_score         Decimal?         @db.Decimal(3, 2)

  // Campos narrativos
  strengths               String?
  areas_for_improvement   String?
  goals_next_period       String?
  evaluator_comments      String?
  employee_comments       String?

  evaluator_id String // FK → TenantUser.id (quien evalúa)

  created_at DateTime @default(now())
  updated_at DateTime @updatedAt

  // Relaciones
  employee_profile EmployeeProfile @relation("ProfileEvaluations", fields: [employee_profile_id], references: [id], onDelete: Cascade)
  evaluator        TenantUser      @relation("EvaluationEvaluator", fields: [evaluator_id], references: [id])

  @@index([employee_profile_id])
  @@index([evaluation_period])
  @@index([status])
  @@index([evaluator_id])
  @@map("performance_evaluations")
}
```

**Agregar relaciones inversas en modelos existentes:**

En `EmployeeProfile`:
```prisma
// Performance
observations  EmployeeObservation[]    @relation("ProfileObservations")
evaluations   PerformanceEvaluation[]  @relation("ProfileEvaluations")
```

En `TenantUser`:
```prisma
created_observations     EmployeeObservation[]    @relation("ObservationCreator")
evaluations_as_evaluator PerformanceEvaluation[]  @relation("EvaluationEvaluator")
```

**Migración (NO usar `prisma migrate dev`):**
```bash
cd contagracia-shared-modules
pnpm prisma:generate
npx ts-node --transpile-only prisma/scripts/migrate-all-tenants.ts --force
```

---

### Fase 2: Módulo employee-observations (Backend)

**Estructura:**
```
src/modules/employee-observations/
├── employee-observations.controller.ts
├── employee-observations.module.ts
├── employee-observations.service.ts
├── dto/
│   ├── create-observation.dto.ts
│   ├── update-observation.dto.ts
│   ├── query-observations.dto.ts
│   └── index.ts
└── index.ts
```

**Endpoints:**

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| `GET` | `/observations` | `observations.view` OR `observations.self_view` | Listar con filtros, paginación, búsqueda |
| `GET` | `/observations/stats` | `observations.view` | Estadísticas (totales, por tipo, por estado) |
| `GET` | `/observations/:id` | `observations.view` OR `observations.self_view` | Detalle de una observación |
| `POST` | `/observations` | `observations.create` | Crear observación |
| `PATCH` | `/observations/:id` | `observations.edit` | Editar observación |
| `DELETE` | `/observations/:id` | `observations.delete` | Eliminar (soft: archivar) |

**Self-view:** En los endpoints GET, si el usuario solo tiene `observations.self_view` (sin `observations.view`), el service filtra automáticamente por su `employee_profile_id`. Mismo patrón que `time-attendance`.

**DTOs:**

`create-observation.dto.ts`:
- `employee_profile_id` (required, uuid)
- `title` (required, string, max 200)
- `description` (required, string)
- `observation_date` (required, date ISO)
- `observation_type` (required, enum)
- `severity` (optional, enum, default MEDIUM)
- `action_required` (optional, string)
- `follow_up_date` (optional, date ISO)

`query-observations.dto.ts`:
- `page`, `limit` (paginación server-side)
- `search` (buscar por nombre/documento del empleado)
- `employee_profile_id` (filtrar por empleado)
- `observation_type` (filtro)
- `severity` (filtro)
- `status` (filtro)
- `date_from`, `date_to` (rango de fechas)
- `sort_by`, `sort_order`

**Service - Lógica clave:**
- CRUD estándar con `tenantContext.getTenantClient(companyId)`
- Stats: conteos agrupados por tipo, severidad, estado
- Validar que `employee_profile_id` pertenezca a la misma empresa
- `created_by_id` se resuelve: JWT `sub` → `TenantUser.id`
- Al "eliminar" → cambiar status a `ARCHIVED`
- Self-view: filtrar por employee_profile_id del usuario autenticado

---

### Fase 3: Módulo performance-evaluations (Backend)

**Estructura:**
```
src/modules/performance-evaluations/
├── performance-evaluations.controller.ts
├── performance-evaluations.module.ts
├── performance-evaluations.service.ts
├── evaluations-analysis.service.ts          <- Lógica pesada separada
├── dto/
│   ├── create-evaluation.dto.ts
│   ├── update-evaluation.dto.ts
│   ├── query-evaluations.dto.ts
│   ├── generate-evaluations.dto.ts
│   ├── query-analysis.dto.ts
│   └── index.ts
└── index.ts
```

**Endpoints CRUD:**

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| `GET` | `/evaluations` | `performance.view` OR `performance.self_view` | Listar evaluaciones formales |
| `GET` | `/evaluations/:id` | `performance.view` OR `performance.self_view` | Detalle evaluación |
| `POST` | `/evaluations` | `performance.create` | Crear evaluación manual |
| `PATCH` | `/evaluations/:id` | `performance.edit` | Editar evaluación |
| `PATCH` | `/evaluations/:id/complete` | `performance.complete` | Marcar como completada |
| `PATCH` | `/evaluations/:id/approve` | `performance.approve` | Aprobar evaluación |
| `DELETE` | `/evaluations/:id` | `performance.delete` | Eliminar evaluación |

**Endpoints de análisis (dashboard inteligente):**

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| `GET` | `/evaluations/analysis/dashboard` | `performance.view` | Dashboard con métricas de todos los empleados |
| `GET` | `/evaluations/analysis/employee/:profileId` | `performance.view` OR `performance.self_view` | Análisis detallado de un empleado |
| `POST` | `/evaluations/generate` | `performance.auto_generate` | Generación automática de evaluaciones |

**`evaluations-analysis.service.ts` - Algoritmos migrados del frontend:**

Este es el servicio más importante. Migra toda la lógica que estaba en el JSX del horizont al backend:

```typescript
// Cálculo de scores por empleado
async calculateEmployeeMetrics(tenantDb, employeeProfileId, dateFrom, dateTo) {
  // 1. Obtener attendance_records del periodo
  // 2. Obtener employee_observations del periodo
  // 3. Calcular:

  // Attendance Score (peso 30%)
  // combinedRate = (attendanceRate * 0.7) + (punctualityRate * 0.3)
  // >= 95%: 5 | >= 90%: 4 | >= 80%: 3 | >= 70%: 2 | < 70%: 1

  // Performance Score (peso 50%)
  // points = (positiveObs * 2) - (negativeObs * 2)
  // ratio = (points + maxPoints) / (2 * maxPoints)
  // >= 0.8: 5 | >= 0.65: 4 | >= 0.45: 3 | >= 0.3: 2 | < 0.3: 1

  // Attitude Score (peso 20%)
  // Basado en tipo + severidad de observaciones

  // Overall Score (DECIMAL)
  // = attendance * 0.3 + performance * 0.5 + attitude * 0.2
}

// Evaluación de riesgo
async calculateRiskLevel(metrics) {
  // riskScore basado en: overall < 2.5/3.5, negativeObs >= 1/3, lateRate > 10%/20%
  // HIGH >= 4 | MEDIUM >= 2 | LOW
}

// Detección de tendencias
async detectTrend(tenantDb, employeeProfileId, currentPeriod) {
  // Compara observaciones positivas del periodo actual vs anterior
  // -> 'improving' | 'declining' | 'stable'
}

// Generación automática de evaluaciones
async generateEvaluations(tenantDb, companyId, evaluatorId, period) {
  // 1. Obtener todos los empleados activos
  // 2. Calcular métricas de cada uno
  // 3. Filtrar: overallScore < 4 OR riskLevel !== 'low' OR totalObs >= 3
  // 4. Crear PerformanceEvaluation con status DRAFT
  // 5. Auto-generar strengths, areas_for_improvement, goals
  // 6. Retornar resumen de evaluaciones generadas
}
```

---

### Fase 4: Registrar módulos en app.module.ts

```typescript
// app.module.ts
import { EmployeeObservationsModule } from './modules/employee-observations';
import { PerformanceEvaluationsModule } from './modules/performance-evaluations';

@Module({
  imports: [
    // ... existentes ...
    EmployeeObservationsModule,
    PerformanceEvaluationsModule,
  ],
})
export class AppModule {}
```

---

### Fase 5: Frontend (Next.js) — Módulo Observaciones

> **Estado:** COMPLETO — CRUD + 2 pestañas (Observaciones + Reportes)

**Estructura implementada:**
```
front_contagracia/src/modules/employee-observations/
├── types/index.ts                     # Interfaces + enums + labels/colores
├── services/observations.service.ts   # CRUD + stats via hrClient (port 3012)
├── hooks/useObservations.ts           # Hook con paginación + 3 filtros + búsqueda
├── components/
│   ├── ObservationsList.tsx           # Tabla con filtros tipo/severidad/estado, badges, acciones
│   ├── ObservationForm.tsx            # Dialog create/edit con validación
│   ├── ObservationsReportsTab.tsx     # NUEVO — Tab 2: Reportes (stats, distribución, top empleados, CSV)
│   └── index.ts
└── index.ts

front_contagracia/src/app/dashboard/employee-observations/
└── page.tsx                           # Página con 2 Tabs (Radix UI): Observaciones + Reportes
```

**Funcionalidades:**
- 2 pestañas: Observaciones (listado) + Reportes (solo admin con `observations.view`)
- Listado con búsqueda, filtros (tipo, severidad, estado), paginación server-side
- Formulario crear/editar en Dialog con validación
- Eliminar con AlertDialog de confirmación
- Permisos: `observations.view` + `observations.self_view` en ProtectedRoute
- Carga de empleados activos para el selector del formulario
- **Tab Reportes:** 4 cards métricas, distribución por tipo, top empleados, prioridades, export CSV

---

### Fase 6: Frontend (Next.js) — Módulo Evaluaciones con 4 pestañas

> **Estado:** EN PROGRESO — CRUD base hecho, faltan 3 pestañas de análisis

**Estructura actual (HECHO):**
```
front_contagracia/src/modules/performance-evaluations/
├── types/index.ts                     # Interfaces básicas (Evaluation, filters, DTOs)
├── services/evaluations.service.ts    # CRUD + complete/approve + getDashboard + getEmployeeAnalysis + generate
├── hooks/useEvaluations.ts            # Hook con paginación + filtros status/periodo
├── components/
│   ├── EvaluationsList.tsx            # Tabla con scores colorizados, workflow complete/approve
│   ├── EvaluationForm.tsx             # Dialog con preview del puntaje global en tiempo real
│   └── index.ts
└── index.ts
```

**Estructura pendiente (4 PESTAÑAS):**
```
front_contagracia/src/modules/performance-evaluations/
├── types/index.ts                     # + EmployeeMetrics, DashboardResponse, DashboardSummary, DashboardFilters
├── hooks/useDashboard.ts              # NUEVO — Hook para GET /evaluations/analysis/dashboard con filtros de periodo
├── components/
│   ├── DashboardTab.tsx               # NUEVO — Tab 1: Dashboard Inteligente
│   ├── EmployeeAnalysisTab.tsx        # NUEVO — Tab 2: Análisis por Empleado
│   ├── ReportsTab.tsx                 # NUEVO — Tab 4: Reportes (solo admin)
│   ├── EvaluationsList.tsx            # Tab 3: Evaluaciones Formales (YA EXISTE)
│   ├── EvaluationForm.tsx             # Dialog de crear/editar (YA EXISTE)
│   └── index.ts                       # + exports de los 3 nuevos componentes
└── index.ts                           # + export de useDashboard y nuevos componentes

front_contagracia/src/app/dashboard/performance-evaluations/
└── page.tsx                           # REESTRUCTURAR con Tabs (4 pestañas)
```

#### Tab 1: Dashboard Inteligente (`DashboardTab.tsx`)

Replica la funcionalidad del horizont con datos del endpoint `GET /evaluations/analysis/dashboard`:

- **Selector de periodo:** Botones 1m / 3m / 6m / 1y + rango personalizado (date inputs)
- **4 Cards métricas:**
  - Empleados Analizados (`summary.total_employees`)
  - Score Promedio (`summary.average_score`, estrellas 1-5)
  - Alto Riesgo (`summary.risk_distribution.high`, badge rojo)
  - Mejorando (conteo de trend === 'improving', badge verde)
- **Card "Requieren Atención Inmediata":** Top 5 empleados con score < 3.0 o riesgo alto
  - Nombre + documento, score, observaciones negativas, tardanzas, recomendación principal, badge de riesgo
- **Card "Mejores Desempeños":** Top 5 con score >= 4.0
  - Ranking, nombre, score, observaciones positivas, puntualidad %
- **Card "Estrellas en Ascenso":** Hasta 3 con trend improving + score >= 3.5
  - Nombre con icono TrendingUp, score, observaciones positivas

#### Tab 2: Análisis por Empleado (`EmployeeAnalysisTab.tsx`)

Tabla completa con `data.all_employees` (del mismo endpoint dashboard):

| Columna | Dato | UI |
|---------|------|----|
| Empleado | nombre + documento | texto |
| Score General | overall_score (1-5) | estrellas con Star icon |
| Asistencia | attendance_score (1-5) | barra de progreso + valor |
| Desempeño | performance_score (1-5) | barra de progreso + valor |
| Actitud | attitude_score (1-5) | barra de progreso + valor |
| Observaciones | positive/negative/neutral | +X verde, -X rojo, ~X gris |
| Puntualidad | punctuality_rate % | porcentaje |
| Tendencia | trend | TrendingUp (verde) / TrendingDown (rojo) / Activity (gris) |
| Riesgo | risk_level | Badge: destructive (alto), secondary (medio), outline (bajo) |
| Recomendaciones | recommendations[] | badges azules con títulos |

Ordenado por `overall_score` descendente. Skeleton loading + empty state.

#### Tab 3: Evaluaciones Formales (existente)

Usa `EvaluationsList` + `EvaluationForm` sin cambios. El flujo CRUD + complete/approve ya funciona.

Botón adicional en el header: **"Generar Automáticas"** (permiso `performance.auto_generate`)
- Llama a `POST /evaluations/generate` con el periodo actual
- Toast con resumen de evaluaciones generadas y omitidas

#### Tab 4: Reportes (`ReportsTab.tsx`) — Solo admin

Visible solo para usuarios con `performance.view` (admin):

- **Cards de Tendencias de Equipo:**
  - Mejorando (verde, TrendingUp icon, conteo)
  - Empeorando (rojo, TrendingDown icon, conteo)
  - Alto Riesgo (amarillo, AlertTriangle icon, conteo)
- **Card de Acciones Recomendadas:** Top 5 recomendaciones agregadas
  - Título, descripción, conteo de empleados afectados
  - Coloreado por prioridad: rojo (alta), amarillo (media), azul (baja)
- **Exportar CSV:** Botón que descarga CSV con columnas:
  - Empleado, Documento, Score General, Asistencia, Desempeño, Actitud, Obs Positivas, Obs Negativas, Puntualidad %, Tendencia, Riesgo, Recomendación

#### Flujo de datos de la página

```
page.tsx (orquesta todo)
  ├─ useDashboard()          → { data, loading, filters, updateFilters, refetch }
  │    ├─ DashboardTab       ← data + filters + updateFilters
  │    ├─ EmployeeAnalysisTab ← data.all_employees
  │    └─ ReportsTab         ← data (summary + all_employees)
  │
  ├─ useEvaluations()        → (interno de EvaluationsList, independiente)
  │    └─ EvaluationsList    ← CRUD callbacks del page
  │
  ├─ EvaluationForm          ← Dialog de crear/editar
  ├─ AlertDialog             ← Confirmación complete/approve
  └─ handleAutoGenerate()    ← Botón "Generar Automáticas"
```

#### UI Components utilizados

- **Tabs:** `@/shared/components/ui/tabs` (Radix UI) — `TabsList` con `grid-cols-4` o `grid-cols-3` dinámico
- **Icons en triggers:** LayoutDashboard, Users, ClipboardList, FileText
- **Charts:** `recharts@^3.7.0` disponible pero no requerido para MVP (se usa en tablas y cards)
- **Score visualization:** Star icon de lucide-react, barras de progreso con div width %
- **Tendencias:** TrendingUp (verde), TrendingDown (rojo), Activity (gris)
- **Riesgo:** Badge con variantes destructive/secondary/outline

---

## 3. Cómo se hará

### Principios

1. **Backend-first:** Toda lógica de negocio (scores, riesgo, tendencias, generación automática) vive en NestJS, no en el frontend
2. **Seguir convenciones existentes:** Mismo patrón que `time-attendance` y `leaves` (TenantContextService, DTOs con class-validator, Swagger, permisos granulares)
3. **Paginación server-side:** A diferencia del horizont que cargaba todo y paginaba en frontend
4. **Separación de responsabilidades:** CRUD en el service principal, análisis en `evaluations-analysis.service.ts`
5. **Soft delete:** Las observaciones se archivan (`ARCHIVED`), no se eliminan físicamente
6. **Permisos granulares reales:** Usar los action_keys ya definidos en el seed `hr_performance.ts`, validados en runtime contra BD tenant via `PermissionsGuard`
7. **Self-view pattern:** Mismo patrón que `time-attendance` con `@RequireAnyPermission` para admin-view + self-view

### Orden de ejecución

```
[0] Activar hr-service en workspace        ← HECHO
[0] Agregar self_view permisos al seed      ← PENDIENTE
[1] Prisma schema     → Enums + Modelos + Relaciones
[2] Prisma migrate    → pnpm prisma:generate + migrate-all-tenants.ts
[3] Observations CRUD → Module + Service + Controller + DTOs
[4] Observations Stats → Endpoint de estadísticas
[5] Evaluations CRUD  → Module + Service + Controller + DTOs
[6] Analysis Service  → Algoritmos de scoring, riesgo, tendencias
[7] Auto-generation   → Endpoint de generación automática
[8] Registrar en app  → app.module.ts
[9] Testing manual    → Swagger UI para validar endpoints
```

### Con qué se hará

| Herramienta | Uso |
|-------------|-----|
| **Prisma** | Schema, `db push` via `migrate-all-tenants.ts`, queries tipados |
| **NestJS** | Controllers, Services, Modules, Guards |
| **class-validator** | Validación de DTOs |
| **@nestjs/swagger** | Documentación automática de API |
| **@contagracia/shared-modules** | `TenantContextService`, `JwtAuthGuard`, `RequirePermissions`, `RequireAnyPermission`, `Audit`, `@Public()` |
| **TypeScript** | Tipado estricto en todo el módulo |

---

## 4. Decisiones de diseño

### 4.1 ¿Por qué separar `evaluations-analysis.service.ts`?

El dashboard inteligente cruza 3 tablas (`AttendanceRecord`, `EmployeeObservation`, `PerformanceEvaluation`), ejecuta algoritmos de scoring con pesos ponderados, detecta tendencias comparando periodos, y calcula niveles de riesgo. Mezclar esto con el CRUD básico haría un archivo de 800+ líneas imposible de testear. El service separado:
- Se puede testear unitariamente con datos mockeados
- Se puede inyectar en otros módulos si se necesita (ej: notificaciones automáticas)
- Mantiene el service principal limpio (~200 líneas)

### 4.2 ¿Por qué `TenantUser` y no un userId genérico?

En horizont, `created_by` y `evaluator_id` apuntaban a `auth.users` (Supabase). En el nuevo stack multi-tenant, cada empresa tiene su propio `TenantUser` que se resuelve desde el JWT (`sub` → `TenantUser.id`). Esto mantiene la aislación de datos por tenant.

### 4.3 ¿Por qué `overall_score` es Decimal y los demás Int?

Los scores individuales (`attendance_score`, `performance_score`, `attitude_score`) son valores discretos de 1 a 5. El `overall_score` es un promedio ponderado (`att*0.3 + perf*0.5 + act*0.2`) que produce decimales como `3.50` o `4.10`. Usar `Decimal(3,2)` preserva esa precisión sin redondeo.

### 4.4 ¿Qué pasa con los reportes HTML/CSV?

Los reportes se quedan para una fase posterior. La prioridad es tener el CRUD + análisis funcionando. Cuando se implementen, serán endpoints del backend (`GET /evaluations/reports/csv`, etc.) en vez de generarse en el frontend como hacía horizont.

### 4.5 ¿Qué pasa con el email de observaciones?

El horizont usaba una Supabase Edge Function (`employee-observations-email`). En el nuevo stack esto se delegará al `notification-service` que ya existe en el monorepo. No es parte de esta migración.

---

## 5. Mapeo de permisos

Todos los action_keys pertenecen al módulo `hr_performance` (seed: `hr_performance.ts`).

| Action Key (seed) | Decorator en Controller | Descripción |
|--------------------|------------------------|-------------|
| `observations.view` | `@RequireAnyPermission('observations.view', 'observations.self_view')` | Ver todas las observaciones |
| `observations.self_view` | (mismo endpoint, filtro en service) | Ver solo mis observaciones |
| `observations.create` | `@RequirePermissions('observations.create')` | Crear observación |
| `observations.edit` | `@RequirePermissions('observations.edit')` | Editar observación |
| `observations.delete` | `@RequirePermissions('observations.delete')` | Archivar observación |
| `observations.send_report` | (fase posterior) | Enviar reporte por email |
| `observations.export` | (fase posterior) | Exportar a CSV |
| `performance.view` | `@RequireAnyPermission('performance.view', 'performance.self_view')` | Ver todas las evaluaciones |
| `performance.self_view` | (mismo endpoint, filtro en service) | Ver solo mis evaluaciones |
| `performance.create` | `@RequirePermissions('performance.create')` | Crear evaluación |
| `performance.edit` | `@RequirePermissions('performance.edit')` | Editar evaluación |
| `performance.delete` | `@RequirePermissions('performance.delete')` | Eliminar evaluación |
| `performance.complete` | `@RequirePermissions('performance.complete')` | Completar evaluación |
| `performance.approve` | `@RequirePermissions('performance.approve')` | Aprobar evaluación |
| `performance.auto_generate` | `@RequirePermissions('performance.auto_generate')` | Generación automática |

---

## 6. Dependencias entre módulos

```
employee-observations (independiente)
    ^
    | consulta observations para calcular scores
    |
performance-evaluations
    |-- usa: EmployeeObservation (lectura via Prisma)
    |-- usa: AttendanceRecord (lectura via Prisma)
    '-- usa: EmployeeProfile (lectura via Prisma)
```

> `performance-evaluations` lee datos de `employee-observations` y `time-attendance` pero NO depende de sus módulos NestJS. Accede directamente via Prisma al tenant DB (mismo patrón que los demás módulos).

---

## 7. Checklist de progreso

### Backend

- [x] **Fase 0:** Activar hr-service en pnpm-workspace.yaml
- [x] **Fase 0:** Comentar tax-service en pnpm-workspace.yaml
- [x] **Fase 0:** Agregar `observations.self_view` y `performance.self_view` al seed
- [ ] **Fase 0:** Re-ejecutar seed de permisos (pendiente para registrar self_view en master DB)
- [x] **Fase 1:** Enums en schema-tenant.prisma (ObservationType, ObservationSeverity, ObservationStatus, EvaluationStatus)
- [x] **Fase 1:** Modelo EmployeeObservation en schema-tenant.prisma
- [x] **Fase 1:** Modelo PerformanceEvaluation en schema-tenant.prisma (con overall_score Decimal(3,2))
- [x] **Fase 1:** Relaciones inversas en EmployeeProfile y TenantUser
- [x] **Fase 2:** prisma:generate + migrate-all-tenants.ts --force
- [x] **Fase 3:** employee-observations module + service + controller + DTOs
- [x] **Fase 3:** Endpoint GET /observations (listar con filtros/paginación + self_view)
- [x] **Fase 3:** Endpoint GET /observations/stats (estadísticas)
- [x] **Fase 3:** Endpoint GET /observations/:id (detalle + self_view)
- [x] **Fase 3:** Endpoint POST /observations (crear)
- [x] **Fase 3:** Endpoint PATCH /observations/:id (editar)
- [x] **Fase 3:** Endpoint DELETE /observations/:id (archivar)
- [x] **Fase 4:** performance-evaluations module + service + controller + DTOs
- [x] **Fase 4:** CRUD endpoints (GET, POST, PATCH, DELETE + self_view)
- [x] **Fase 4:** Endpoints de complete/approve
- [x] **Fase 4:** evaluations-analysis.service.ts (calculateEmployeeMetrics, calculateRiskLevel, detectTrend)
- [x] **Fase 4:** Endpoint GET /evaluations/analysis/dashboard
- [x] **Fase 4:** Endpoint GET /evaluations/analysis/employee/:profileId (+ self_view)
- [x] **Fase 4:** Endpoint POST /evaluations/generate (generación automática)
- [x] **Fase 4:** Registrar módulos en app.module.ts
- [x] **Fase 4:** Testing manual (observaciones CRUD verificado end-to-end)
- [x] **Fix:** TS2742/TS4053 — Agregar `: Promise<any>` a todos los métodos públicos (Prisma inferred types)
- [x] **Fix:** PermissionsGuard — Adjuntar `req.user.permissions` después de verificar (admin/owner: `['*']`)
- [x] **Fix:** Quitar `@UseGuards(JwtAuthGuard)` redundante de controllers (sobreescribía req.user)
- [x] **Fix:** Rebuild shared-auth dist (`pnpm build:auth`) con cambios del guard
- [x] **Extra:** Script seed-hr-test-data.ts (5 empleados, 294 attendance, 20 obs, 10 evaluations)

### Frontend — Observaciones

- [x] **Fase 5:** types/index.ts (interfaces + enums + labels/colores)
- [x] **Fase 5:** services/observations.service.ts (CRUD + stats via hrClient)
- [x] **Fase 5:** hooks/useObservations.ts (paginación + filtros + búsqueda)
- [x] **Fase 5:** components/ObservationsList.tsx (tabla + filtros + acciones)
- [x] **Fase 5:** components/ObservationForm.tsx (dialog create/edit)
- [x] **Fase 5:** components/ObservationsReportsTab.tsx (Tab 2: stats, distribución, top empleados, CSV export)
- [x] **Fase 5:** page.tsx `/dashboard/employee-observations` — 2 tabs (Observaciones + Reportes)
- [x] **Fase 5:** Actualizar barrel exports (components/index.ts + index.ts)

### Frontend — Evaluaciones (4 pestañas)

- [x] **Fase 6:** types/index.ts (interfaces básicas Evaluation, filters, DTOs)
- [x] **Fase 6:** services/evaluations.service.ts (CRUD + dashboard + generate)
- [x] **Fase 6:** hooks/useEvaluations.ts (paginación + filtros status/periodo)
- [x] **Fase 6:** components/EvaluationsList.tsx (Tab 3: tabla con scores + workflow)
- [x] **Fase 6:** components/EvaluationForm.tsx (dialog con preview score global)
- [ ] **Fase 6:** types/index.ts → Agregar EmployeeMetrics, DashboardResponse, DashboardSummary, DashboardFilters
- [ ] **Fase 6:** hooks/useDashboard.ts (hook para GET /analysis/dashboard con filtros periodo)
- [ ] **Fase 6:** components/DashboardTab.tsx (Tab 1: Dashboard Inteligente)
- [ ] **Fase 6:** components/EmployeeAnalysisTab.tsx (Tab 2: Análisis por Empleado)
- [ ] **Fase 6:** components/ReportsTab.tsx (Tab 4: Reportes con CSV export)
- [ ] **Fase 6:** page.tsx → Reestructurar con 4 pestañas (Tabs Radix UI)
- [ ] **Fase 6:** Actualizar barrel exports (components/index.ts + index.ts)
