# Plan: Modulo PH (Propiedad Horizontal) — Flujo Basico

## Contexto

Migrar el modulo PH del proyecto anterior (horizont/Supabase+React) al nuevo proyecto (NestJS+Next.js).
Implementar el **flujo basico** sin dependencias de otros modulos (igual que CRM actual).
Lo que depende de contabilidad, CxC, pasarelas de pago → dejar **maquetado** (UI placeholder).

**Referencia de patrones:** CRM service (backend) + CRM module (frontend)
**Analisis completo:** `back_contagracia/ANALISIS_PH_HORIZONT.md`
**Puerto del servicio:** 3017

---

## Scope: Que SI y que NO

### SI implementar (flujo basico independiente):
- CRUD Copropiedades + Torres
- CRUD Tipos de Unidad
- CRUD Unidades (con parent_unit, torre, tipo)
- CRUD Copropietarios/Residentes (con terceros del company-service)
- CRUD Vehiculos
- CRUD Zonas Comunes + Reservas (con check de disponibilidad)
- CRUD Conceptos de Cobro (sin vincular cuenta contable)
- CRUD Periodos de Facturacion
- Generacion basica de Cuotas (sin asiento contable)
- CRUD Alquileres entre unidades
- Dashboard basico (KPIs, conteos)
- Settings (tipos de unidad, conceptos)

### NO implementar ahora (maquetado/placeholder):
- Configuracion contable (necesita chart_of_accounts)
- Intereses/descuentos/recargos automaticos (billing_config)
- Comprobantes de pago + flujo de aprobacion
- Pasarelas de pago (ePayco, Bold, Wompi)
- Integracion CxC/asientos contables
- Envio de estados de cuenta por email
- Dashboard financiero avanzado (cartera por edades, tendencias)
- Importacion masiva Excel

---

## Fase 1: Backend — ph-service Setup

### 1.1 Crear el servicio NestJS

**CREAR:** `back_contagracia/ph-service/` (clonar estructura de crm-service)

Archivos base:
- `package.json` — copiar de crm-service, cambiar nombre a "ph-service", quitar nodemailer
- `tsconfig.json`, `tsconfig.build.json`, `nest-cli.json` — copiar de crm-service
- `.env` — DATABASE_MASTER_URL, JWT_SECRET, PORT=3017
- `src/main.ts` — port 3017, titulo "PH Service API", tags de swagger
- `src/app.module.ts` — imports shared (Auth, TenantContext, Audit, Config, Prisma, Tenant)
- `src/app.controller.ts`, `src/app.service.ts` — health check
- `src/modules/prisma/` — copiar de crm-service (PrismaModule + PrismaService para master DB)
- `src/modules/tenant/` — copiar de crm-service (TenantModule + TenantPrismaService)

### 1.2 Registrar en el workspace

**MODIFICAR:** `back_contagracia/pnpm-workspace.yaml` — agregar `- 'ph-service'`
**MODIFICAR:** `back_contagracia/package.json` — agregar scripts:
```
"dev:ph": "cd ph-service && pnpm start:dev"
```
Y agregar `pnpm --filter ph-service start:dev` al script `dev:all`

### 1.3 Agregar Prisma schema (tablas PH en tenant)

**MODIFICAR:** `contagracia-shared-modules/prisma/schema-tenant.prisma`

Agregar 12 modelos (sin tablas de billing_config, adjustments, vouchers, accounting_config por ahora):

```prisma
model ph_condominiums {
  id                String   @id @default(uuid())
  company_id        String
  name              String
  nit               String?
  address           String?
  department_id     String?
  municipality_id   String?
  phone             String?
  email             String?
  admin_company_id  String?
  total_units       Int?     @default(0)
  price_per_m2      Decimal? @db.Decimal(15, 2)
  is_active         Boolean  @default(true)
  created_at        DateTime @default(now())
  updated_at        DateTime @updatedAt
  created_by        String?
}

model ph_towers {
  id               String   @id @default(uuid())
  condominium_id   String
  name             String
  code             String?
  total_floors     Int?
  is_active        Boolean  @default(true)
  created_at       DateTime @default(now())
  updated_at       DateTime @updatedAt
}

model ph_unit_types {
  id               String   @id @default(uuid())
  company_id       String
  name             String
  code             String?
  description      String?
  is_rentable      Boolean  @default(false)
  free_minutes     Int?     @default(0)
  rental_fee       Decimal? @db.Decimal(15, 2)
  rental_fee_type  String?  // 'fixed', 'per_hour', 'per_day'
  fee_concept_id   String?
  is_active        Boolean  @default(true)
  created_at       DateTime @default(now())
  updated_at       DateTime @updatedAt
}

model ph_units {
  id               String   @id @default(uuid())
  condominium_id   String
  tower_id         String?
  unit_type_id     String?
  unit_number      String
  floor            Int?
  area_m2          Decimal? @db.Decimal(10, 2)
  coefficient      Decimal? @db.Decimal(10, 6)
  parent_unit_id   String?
  is_active        Boolean  @default(true)
  notes            String?
  created_at       DateTime @default(now())
  updated_at       DateTime @updatedAt
  created_by       String?
}

model ph_unit_residents {
  id              String    @id @default(uuid())
  unit_id         String
  tercero_id      String
  resident_type   String    // 'owner', 'tenant'
  is_primary      Boolean   @default(false)
  move_in_date    DateTime?
  move_out_date   DateTime?
  is_active       Boolean   @default(true)
  notes           String?
  created_at      DateTime  @default(now())
  updated_at      DateTime  @updatedAt
}

model ph_vehicles {
  id              String   @id @default(uuid())
  unit_id         String
  resident_id     String?
  vehicle_type    String   // 'car', 'motorcycle', 'bicycle', 'other'
  brand           String?
  model           String?
  year            Int?
  color           String?
  plate           String?
  sticker_number  String?
  parking_space   String?
  is_active       Boolean  @default(true)
  notes           String?
  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt
}

model ph_fee_concepts {
  id               String   @id @default(uuid())
  company_id       String
  name             String
  code             String?
  description      String?
  default_amount   Decimal? @db.Decimal(15, 2)
  is_recurring     Boolean  @default(true)
  calculation_type String   @default("fixed") // 'fixed', 'per_m2', 'coefficient'
  is_active        Boolean  @default(true)
  created_at       DateTime @default(now())
  updated_at       DateTime @updatedAt
}

model ph_billing_periods {
  id              String    @id @default(uuid())
  condominium_id  String
  name            String
  year            Int
  month           Int
  due_date        DateTime?
  status          String    @default("draft") // 'draft', 'generated', 'closed'
  generated_at    DateTime?
  closed_at       DateTime?
  created_at      DateTime  @default(now())
  updated_at      DateTime  @updatedAt
  created_by      String?

  @@unique([condominium_id, year, month])
}

model ph_fees {
  id                 String    @id @default(uuid())
  billing_period_id  String
  unit_id            String
  fee_concept_id     String
  resident_id        String?
  amount             Decimal   @db.Decimal(15, 2)
  balance            Decimal   @db.Decimal(15, 2)
  status             String    @default("pending") // 'pending', 'partial', 'paid', 'overdue'
  due_date           DateTime?
  paid_at            DateTime?
  fee_type           String    @default("regular") // 'regular', 'interest', 'discount', 'surcharge'
  parent_fee_id      String?
  notes              String?
  created_at         DateTime  @default(now())
  updated_at         DateTime  @updatedAt
}

model ph_common_areas {
  id                 String   @id @default(uuid())
  condominium_id     String
  name               String
  description        String?
  capacity           Int?
  rental_fee         Decimal? @db.Decimal(15, 2)
  requires_deposit   Boolean  @default(false)
  deposit_amount     Decimal? @db.Decimal(15, 2)
  requires_approval  Boolean  @default(false)
  min_hours          Int?
  max_hours          Int?
  available_from     String?  // TIME as string "08:00"
  available_to       String?  // TIME as string "22:00"
  available_days     Int[]    @default([0, 1, 2, 3, 4, 5, 6])
  is_active          Boolean  @default(true)
  created_at         DateTime @default(now())
  updated_at         DateTime @updatedAt
  created_by         String?
}

model ph_common_area_reservations {
  id                  String    @id @default(uuid())
  common_area_id      String
  unit_id             String?
  tercero_id          String?
  reservation_date    DateTime
  start_time          String    // "14:00"
  end_time            String    // "18:00"
  status              String    @default("pending") // 'pending', 'confirmed', 'cancelled', 'completed'
  total_fee           Decimal?  @db.Decimal(15, 2)
  deposit_paid        Boolean   @default(false)
  notes               String?
  cancelled_at        DateTime?
  cancelled_by        String?
  cancellation_reason String?
  confirmed_at        DateTime?
  confirmed_by        String?
  created_at          DateTime  @default(now())
  updated_at          DateTime  @updatedAt
  created_by          String?
}

model ph_unit_rentals {
  id               String    @id @default(uuid())
  unit_id          String
  renter_unit_id   String
  condominium_id   String
  start_time       DateTime
  end_time         DateTime?
  total_minutes    Int?
  billable_minutes Int?
  amount           Decimal?  @db.Decimal(15, 2)
  fee_id           String?
  status           String    @default("active") // 'active', 'completed', 'cancelled'
  notes            String?
  created_by       String?
  created_at       DateTime  @default(now())
  updated_at       DateTime  @updatedAt
}
```

Regenerar: `cd contagracia-shared-modules && npx prisma generate --schema=prisma/schema-tenant.prisma`

---

## Fase 2: Backend — Modulos CRUD

Patron por modulo: `module.ts` + `controller.ts` + `service.ts` + `dto/`
Controller: `@Controller('companies/:companyId/ph/resource')`
Service: `TenantPrismaService` → `getClientForCompany(companyId)`
Soft delete: `is_active: false`
User tracking: `created_by: req.user.sub`

### 2.1 Condominiums + Towers
- Controller: `companies/:companyId/ph/condominiums`
- Sub-ruta: `.../condominiums/:condId/towers`
- CRUD completo con filtros (search, is_active)

### 2.2 Unit Types
- Controller: `companies/:companyId/ph/unit-types`
- Campos: name, code, is_rentable, rental_fee, rental_fee_type, free_minutes

### 2.3 Units
- Controller: `companies/:companyId/ph/units`
- Filtros: condominium_id, tower_id, unit_type_id, search

### 2.4 Residents
- Controller: `companies/:companyId/ph/residents`
- Filtros: condominium_id, unit_id, resident_type
- tercero_id como referencia a company-service

### 2.5 Vehicles
- Controller: `companies/:companyId/ph/vehicles`
- Filtros: condominium_id, unit_id, vehicle_type

### 2.6 Common Areas + Reservations
- Controller: `companies/:companyId/ph/common-areas`
- Sub-ruta reservas: `.../common-areas/:areaId/reservations`
- Check disponibilidad: `GET .../check-availability?date=&start_time=&end_time=`
- Acciones: confirm, cancel, complete

### 2.7 Fee Concepts
- Controller: `companies/:companyId/ph/fee-concepts`

### 2.8 Billing (Periods + Fees + Generate)
- Controller: `companies/:companyId/ph/billing`
- Periodos CRUD + cerrar
- Generar cuotas masivas: `POST .../periods/:id/generate-fees`
- Cuotas CRUD + filtros (period, unit, status)

### 2.9 Rentals
- Controller: `companies/:companyId/ph/rentals`
- CRUD + checkout: `PATCH .../rentals/:id/checkout`

### 2.10 Dashboard
- Controller: `companies/:companyId/ph/dashboard`
- `GET /stats` → KPIs basicos

---

## Fase 3: Frontend — Config + Modulo

### 3.1 Modificar configs
- `api.config.ts` → +PH (port 3017)
- `apiClient.ts` → +phClient
- `navigation.ts` → +seccion PH con 9 items + 'ph' en ALL_MODULES

### 3.2 Crear modulo `src/modules/ph/`
- `types/index.ts` — 12 interfaces + enums
- `services/ph.service.ts` — API calls con phClient
- `hooks/` — 10 hooks (useCondominiums, useUnits, useUnitTypes, useResidents, useVehicles, useCommonAreas, useBilling, useFeeConcepts, useRentals, useDashboard)
- `index.ts` — barrel exports

---

## Fase 4: Frontend — Paginas

### 9 paginas en `src/app/dashboard/ph/`

| Pagina | Ruta | Contenido |
|--------|------|-----------|
| Dashboard | `/dashboard/ph` | KPIs, resumen copropiedades, links rapidos |
| Copropiedades | `/dashboard/ph/condominiums` | Tabla CRUD + torres |
| Unidades | `/dashboard/ph/units` | Tabla filtrable + CRUD |
| Copropietarios | `/dashboard/ph/residents` | Tabla + selector tercero |
| Facturacion | `/dashboard/ph/billing` | Tabs: Periodos, Cuotas, Cartera*, Config* |
| Zonas Comunes | `/dashboard/ph/common-areas` | Tabs: Areas, Reservas |
| Vehiculos | `/dashboard/ph/vehicles` | Tabla filtrable + CRUD |
| Alquileres | `/dashboard/ph/rentals` | Tabla + check-in/checkout |
| Configuracion | `/dashboard/ph/settings` | Tabs: Tipos Unidad, Conceptos, Contabilidad* |

*placeholder

---

## Sprints

| Sprint | Contenido | Dependencia | Estado |
|--------|-----------|-------------|--------|
| 1 | Backend setup + condominiums, towers, unit-types, units | ph-service del otro dev | ✅ COMPLETADO |
| 2 | Backend residents, vehicles, common-areas, rentals | Sprint 1 | ✅ COMPLETADO |
| 3 | Backend fee-concepts, billing, dashboard | Sprint 1 | ✅ COMPLETADO |
| 4 | Frontend config + modulo (types, services, hooks) | Sprint 1-3 | ✅ COMPLETADO |
| 5 | Frontend paginas completas | Sprint 4 | ✅ COMPLETADO |

---

## Progreso

### ✅ Fase 1: Backend Setup — COMPLETADO (2026-02-12)
- [x] 1.1 ph-service creado (prisma/, tenant/, .env, package.json con file: refs, tsconfig.build declaration:false)
- [x] 1.2 Registrado en pnpm-workspace.yaml + dev:all script
- [x] 1.3 12 modelos PH agregados a schema-tenant.prisma + Prisma regenerado
- [x] Tablas PH pusheadas a tenant DB

### ✅ Fase 2: Backend CRUD — COMPLETADO (2026-02-12)
- [x] 2.1 Condominiums + Towers
- [x] 2.2 Unit Types
- [x] 2.3 Units
- [x] 2.4 Residents
- [x] 2.5 Vehicles
- [x] 2.6 Common Areas + Reservations (check disponibilidad, confirm/cancel/complete)
- [x] 2.7 Fee Concepts
- [x] 2.8 Billing (Periods + Fees + Generate con calculo fixed/per_m2/coefficient)
- [x] 2.9 Rentals (CRUD + checkout)
- [x] 2.10 Dashboard (stats)
- [x] Todos los modulos wired en AppModule
- [x] Build exitoso (npx nest build)

### ✅ Fase 3: Frontend Config + Modulo — COMPLETADO (2026-02-12)
- [x] 3.1 api.config.ts (PH: 3017), apiClient.ts (phClient), navigation.ts (9 items + 'ph' en ALL_MODULES)
- [x] 3.2 types/index.ts (12 interfaces + enums), services/ph.service.ts, 10 hooks, index.ts barrel

### ✅ Fase 4: Frontend Paginas — COMPLETADO (2026-02-12)
- [x] Dashboard PH
- [x] Copropiedades (CRUD + torres)
- [x] Unidades (CRUD con filtros)
- [x] Copropietarios (CRUD)
- [x] Facturacion (tabs: Periodos, Cuotas, Cartera placeholder, Config placeholder)
- [x] Zonas Comunes (tabs: Areas, Reservas)
- [x] Vehiculos (CRUD)
- [x] Alquileres (CRUD + checkout)
- [x] Configuracion (tabs: Tipos Unidad, Conceptos Cobro, Contabilidad placeholder)

### ✅ Extras — COMPLETADO (2026-02-12)
- [x] Modulo PH registrado en master DB (Module + 51 SystemActions)
- [x] Vinculado a todos los planes (Trial, Basico, Profesional, Empresarial)
- [x] Seed files actualizados (definitions.ts, actions/ph.ts, actions/index.ts)
- [x] Script standalone: prisma/scripts/seed-ph-module.ts

### ⏳ Pendiente (fuera de scope basico)
- [ ] Configuracion contable (chart_of_accounts)
- [ ] Intereses/descuentos/recargos automaticos
- [ ] Comprobantes de pago + flujo aprobacion
- [ ] Pasarelas de pago (ePayco, Bold, Wompi)
- [ ] Integracion CxC/asientos contables
- [ ] Envio estados de cuenta por email
- [ ] Dashboard financiero avanzado
- [ ] Importacion masiva Excel

---

**Fecha inicio:** 2026-02-12
**Fecha completado (flujo basico):** 2026-02-12
**Estado:** ✅ Flujo basico COMPLETADO — pendiente testing y ajustes
