# Contagracia - Arquitectura Multi-Tenant y Schemas Prisma

## Arquitectura

### Contagracia (Multi-Tenancy - Database per Tenant)
- **Master DB**: Users, Companies, Roles, Plans, Subscriptions, Paramétricas globales
- **Tenant DB (por empresa)**: Terceros, Facturas, Productos, Contabilidad, Paramétricas replicadas
- **Decisión**: Paramétricas se **REPLICAN** en cada Tenant DB donde se necesiten para permitir JOINs locales

---

## Distribución de Tablas Paramétricas

### Paramétricas en MASTER DB (solo referencia Company)

| Tabla | Uso |
|-------|-----|
| `Country` | FK en Company (`country_id`) |
| `Department` | FK en Company (`department_id`) |
| `Municipality` | FK en Company (`municipality_id`) |
| `TypeDocumentIdentification` | FK en Company |
| `TypeOrganization` | FK en Company |
| `TypeRegime` | FK en Company |
| `TypeLiability` | FK en Company |
| `EconomicActivity` | Opcional para Company |
| `Bank` | Solo catálogo global |
| `PaymentMethod` | Solo catálogo global |
| `ProductUnit` | Solo catálogo global |
| `TaxRate` | Solo catálogo global |

### Paramétricas REPLICADAS en TENANT DB

| Tabla | Usado por |
|-------|-----------|
| `Department` | Tercero |
| `Municipality` | Tercero |
| `TypeDocumentIdentification` | Tercero |
| `TypeOrganization` | Tercero |
| `TypeRegime` | Tercero |
| `TypeLiability` | Tercero |
| `Bank` | Tercero, BankAccount |
| `PaymentMethod` | Tercero, Invoice (futuro) |
| `ProductUnit` | Product |
| `TaxRate` | Product, InvoiceItemTax (futuro) |
| `TypeContract` | Tercero (solo tenant) |
| `TypeWorker` | Tercero (solo tenant) |
| `SubTypeWorker` | Tercero (solo tenant) |
| `ArlRisk` | Tercero (solo tenant) |

**Flujo de replicación**: Al crear un nuevo tenant, se copian todas las paramétricas desde Master DB. Son READ-ONLY en el tenant.

---

## MASTER DB (schema-master.prisma)

### Company (Estado Actual)

```prisma
model Company {
  id            String   @id @default(uuid())
  company_name  String
  nit           String   @unique
  dv            String?
  email         String?
  phone         String?
  address       String?
  logo_url      String?

  // Representante Legal
  legal_rep_name           String?
  legal_rep_identification String?

  // FKs a tablas paramétricas
  type_document_identification_id String?
  type_organization_id            String?
  type_regime_id                  String?
  type_liability_id               String?
  country_id                      String?
  department_id                   String?
  municipality_id                 String?

  // Multi-tenancy
  database_name String   @unique
  database_url  String   @unique

  // Status
  is_active     Boolean  @default(true)
  created_at    DateTime @default(now())
  updated_at    DateTime @updatedAt

  // Relations
  user_companies         UserCompany[]
  subscriptions          Subscription[]
  action_permissions     UserActionPermission[]
  module_permissions     UserModulePermission[]

  // Relaciones a paramétricas
  type_document_identification TypeDocumentIdentification? @relation(...)
  type_organization            TypeOrganization? @relation(...)
  type_regime                  TypeRegime? @relation(...)
  type_liability               TypeLiability? @relation(...)
  country                      Country? @relation(...)
  department                   Department? @relation(...)
  municipality                 Municipality? @relation(...)

  @@map("companies")
}
```

### Otras entidades Master
- `User`: Usuarios del sistema
- `Role`: Roles (admin, user, manager, accountant)
- `UserCompany`: Relación usuario-empresa con rol
- `Plan`: Planes de suscripción
- `PlanAction`: Acciones disponibles por plan
- `Subscription`: Suscripciones de empresas
- `SystemAction`: Acciones del sistema para permisos
- `UserActionPermission`: Permisos específicos de usuario
- `UserModulePermission`: Permisos de módulo por usuario
- `Session`, `RefreshToken`: Gestión de sesiones
- `EmailVerification`, `PasswordReset`: Flujos de autenticación

---

## TENANT DB (schema-tenant.prisma)

### ENUMs

```prisma
enum TerceroType {
  CLIENT            // Cliente
  SUPPLIER          // Proveedor
  EMPLOYEE          // Empleado
  EPS               // Entidad Promotora de Salud
  PENSION_FUND      // Fondo de Pensiones
  ARL               // Administradora de Riesgos Laborales
  COMPENSATION_FUND // Caja de Compensación Familiar
  SEVERANCE_FUND    // Fondo de Cesantías
  OTHER             // Otro
}

enum InvoiceStatus {
  DRAFT      // Borrador
  SENT       // Enviada
  PAID       // Pagada
  CANCELLED  // Anulada
  OVERDUE    // Vencida
}

enum PaymentStatus {
  PENDING   // Pendiente
  PARTIAL   // Pago parcial
  PAID      // Pagado
  REFUNDED  // Reembolsado
}

enum PurchaseStatus {
  PENDING    // Pendiente
  RECEIVED   // Recibida
  CANCELLED  // Cancelada
}

enum AccountType {
  ASSET      // Activo
  LIABILITY  // Pasivo
  EQUITY     // Patrimonio
  INCOME     // Ingreso
  EXPENSE    // Gasto
}

enum BankAccountType {
  SAVINGS  // Ahorros
  CHECKING // Corriente
}

enum EmployeeRole {
  SALES_ADVISOR    // Asesor comercial
  SALES_DIRECTOR   // Director comercial
  ADMINISTRATIVE   // Administrativo
  MANAGER          // Gerente
  OTHER            // Otro
}

enum EmployeeStatus {
  ACTIVE     // Activo
  INACTIVE   // Inactivo
  ON_LEAVE   // En licencia
  TERMINATED // Retirado
}
```

### Paramétricas Replicadas

```prisma
// Geolocalización
model Department { ... }
model Municipality { ... }

// Tipos DIAN
model TypeDocumentIdentification { ... }
model TypeOrganization { ... }
model TypeRegime { ... }
model TypeLiability { ... }

// Catálogos
model Bank { ... }
model PaymentMethod { ... }
model ProductUnit { ... }
model TaxRate { ... }

// Solo Tenant (nómina)
model TypeContract { ... }
model TypeWorker { ... }
model SubTypeWorker { ... }
model ArlRisk { ... }
```

### Tercero (Entidad Unificada)

```prisma
model Tercero {
  id                    String        @id @default(uuid())

  // Identificación
  name                  String
  identification_number String?
  dv                    String?

  // FKs a paramétricas
  type_document_identification_id String?
  type_organization_id            String?
  type_regime_id                  String?
  type_liability_id               String?
  department_id                   String?
  municipality_id                 String?
  bank_id                         String?

  // Contacto
  email                 String?
  phone                 String?
  address               String?
  contact_person        String?

  // Roles (array - puede tener múltiples)
  roles                 TerceroType[]

  // Persona Natural
  first_name            String?
  second_name           String?
  first_surname         String?
  second_surname        String?

  // Tax Info
  is_tax_responsible    Boolean       @default(false)
  codigo_pila           String?

  // Vinculación usuario
  user_id               String?

  // Cuentas contables
  cxc_account_id        String?
  cxp_account_id        String?

  // Datos de empleado (solo si roles incluye EMPLOYEE)
  hire_date             DateTime?
  contract_end_date     DateTime?
  contract_type_id      String?
  payment_method_id     String?
  worker_type_id        String?
  worker_subtype_id     String?
  arl_risk_class_id     String?

  // Seguridad social (FKs a otros Terceros)
  eps_id                String?
  pension_fund_id       String?
  arl_id                String?
  compensation_fund_id  String?
  severance_fund_id     String?

  // Salario
  salary                    Decimal?   @db.Decimal(15, 2)
  basic_salary              Decimal?   @db.Decimal(15, 2)
  transportation_allowance  Decimal?   @db.Decimal(15, 2)
  variable_salary           Decimal?   @db.Decimal(15, 2)
  fixed_fees                Decimal?   @db.Decimal(15, 2)

  // Datos bancarios empleado
  bank_name             String?
  bank_account_type     BankAccountType?
  bank_account_number   String?

  // Centro de costos y rol
  cost_center_id        String?
  employee_role         EmployeeRole?
  commission_rate       Decimal?      @db.Decimal(5, 2)
  director_id           String?
  is_administrative     Boolean       @default(false)
  employee_status       EmployeeStatus?

  // Estado
  is_active             Boolean       @default(true)
  created_at            DateTime      @default(now())
  updated_at            DateTime      @updatedAt

  // Relations a paramétricas
  type_document_identification TypeDocumentIdentification? @relation(...)
  type_organization            TypeOrganization? @relation(...)
  type_regime                  TypeRegime? @relation(...)
  type_liability               TypeLiability? @relation(...)
  department                   Department? @relation(...)
  municipality                 Municipality? @relation(...)
  bank                         Bank? @relation(...)
  contract_type                TypeContract?  @relation(...)
  payment_method               PaymentMethod? @relation(...)
  worker_type                  TypeWorker?    @relation(...)
  worker_subtype               SubTypeWorker? @relation(...)
  arl_risk_class               ArlRisk?       @relation(...)

  // Self-relations (seguridad social)
  eps               Tercero?  @relation("TerceroEps", ...)
  pension_fund      Tercero?  @relation("TerceroPension", ...)
  arl               Tercero?  @relation("TerceroArl", ...)
  compensation_fund Tercero?  @relation("TerceroCompensation", ...)
  severance_fund    Tercero?  @relation("TerceroSeverance", ...)

  // Inversa de self-relations
  employees_eps              Tercero[] @relation("TerceroEps")
  employees_pension          Tercero[] @relation("TerceroPension")
  employees_arl              Tercero[] @relation("TerceroArl")
  employees_compensation     Tercero[] @relation("TerceroCompensation")
  employees_severance        Tercero[] @relation("TerceroSeverance")

  // Jerarquía
  director          Tercero?  @relation("TerceroDirector", ...)
  subordinates      Tercero[] @relation("TerceroDirector")

  // Cuentas contables
  cxc_account           ChartOfAccount? @relation("TerceroCxcAccount", ...)
  cxp_account           ChartOfAccount? @relation("TerceroCxpAccount", ...)
  cost_center           CostCenter?     @relation(...)

  // Facturas y compras
  invoices_as_client    Invoice[]  @relation("ClientInvoices")
  purchases_as_supplier Purchase[] @relation("SupplierPurchases")

  @@map("terceros")
}
```

### Invoice (Estado Actual - Básico)

```prisma
model Invoice {
  id                String        @id @default(uuid())
  invoice_number    String        @unique
  client_id         String

  issue_date        DateTime      @default(now())
  due_date          DateTime?

  subtotal          Decimal       @db.Decimal(15, 2)
  tax_amount        Decimal       @db.Decimal(15, 2) @default(0)
  discount_amount   Decimal       @db.Decimal(15, 2) @default(0)
  total             Decimal       @db.Decimal(15, 2)

  status            InvoiceStatus @default(DRAFT)
  payment_status    PaymentStatus @default(PENDING)

  cufe              String?       @unique
  qr_code           String?
  xml_url           String?
  pdf_url           String?

  created_at        DateTime      @default(now())
  updated_at        DateTime      @updatedAt

  client       Tercero       @relation("ClientInvoices", ...)
  items        InvoiceItem[]

  @@map("invoices")
}

model InvoiceItem {
  id          String  @id @default(uuid())
  invoice_id  String
  product_id  String?

  description String
  quantity    Decimal @db.Decimal(10, 2)
  unit_price  Decimal @db.Decimal(15, 2)
  tax_rate    Decimal @db.Decimal(5, 2) @default(0)
  discount    Decimal @db.Decimal(15, 2) @default(0)
  total       Decimal @db.Decimal(15, 2)

  invoice Invoice  @relation(...)
  product Product? @relation(...)

  @@map("invoice_items")
}
```

### Product (Estado Actual)

```prisma
model Product {
  id              String   @id @default(uuid())
  code            String   @unique
  name            String
  description     String?
  category        String?

  cost            Decimal  @db.Decimal(15, 2) @default(0)
  price           Decimal  @db.Decimal(15, 2)

  // FKs a paramétricas
  tax_rate_id     String?
  unit_id         String?

  stock           Decimal  @db.Decimal(10, 2) @default(0)
  min_stock       Decimal  @db.Decimal(10, 2) @default(0)

  is_active       Boolean  @default(true)
  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt

  // Relations
  tax_rate        TaxRate?     @relation(...)
  unit            ProductUnit? @relation(...)
  invoice_items   InvoiceItem[]
  purchase_items  PurchaseItem[]

  @@map("products")
}
```

### Purchase (Estado Actual)

```prisma
model Purchase {
  id              String          @id @default(uuid())
  purchase_number String          @unique
  supplier_id     String

  purchase_date   DateTime        @default(now())

  subtotal        Decimal         @db.Decimal(15, 2)
  tax_amount      Decimal         @db.Decimal(15, 2) @default(0)
  total           Decimal         @db.Decimal(15, 2)

  status          PurchaseStatus  @default(PENDING)

  created_at      DateTime        @default(now())
  updated_at      DateTime        @updatedAt

  supplier Tercero       @relation("SupplierPurchases", ...)
  items    PurchaseItem[]

  @@map("purchases")
}

model PurchaseItem {
  id          String  @id @default(uuid())
  purchase_id String
  product_id  String?

  description String
  quantity    Decimal @db.Decimal(10, 2)
  unit_price  Decimal @db.Decimal(15, 2)
  total       Decimal @db.Decimal(15, 2)

  purchase Purchase @relation(...)
  product  Product? @relation(...)

  @@map("purchase_items")
}
```

### Contabilidad

```prisma
model ChartOfAccount {
  id          String      @id @default(uuid())
  code        String      @unique
  name        String
  type        AccountType
  parent_id   String?

  is_active   Boolean     @default(true)
  created_at  DateTime    @default(now())
  updated_at  DateTime    @updatedAt

  parent   ChartOfAccount?  @relation("AccountHierarchy", ...)
  children ChartOfAccount[] @relation("AccountHierarchy")

  terceros_cxc Tercero[] @relation("TerceroCxcAccount")
  terceros_cxp Tercero[] @relation("TerceroCxpAccount")

  // Configuraciones de cuentas contables...

  @@map("chart_of_accounts")
}

model BankAccount {
  id              String          @id @default(uuid())
  bank_id         String?
  account_number  String
  account_type    BankAccountType
  account_name    String
  account_id      String?         // FK a ChartOfAccount

  initial_balance Decimal         @db.Decimal(15, 2) @default(0)
  current_balance Decimal         @db.Decimal(15, 2) @default(0)

  is_active       Boolean         @default(true)
  created_at      DateTime        @default(now())
  updated_at      DateTime        @updatedAt

  bank Bank? @relation(...)

  @@map("bank_accounts")
}

model CostCenter {
  id          String   @id @default(uuid())
  code        String   @unique
  name        String
  description String?

  is_active   Boolean  @default(true)
  created_at  DateTime @default(now())
  updated_at  DateTime @updatedAt

  terceros    Tercero[]

  @@map("cost_centers")
}

model AccountingConfig { ... }
model CompanyProfile { ... }
model DianInvoicingConfig { ... }
model AuditLog { ... }
```

---

## Pendiente por Mejorar

### Invoice - Campos faltantes para Facturación Electrónica DIAN:
- [ ] `document_type` (INVOICE, CREDIT_NOTE, DEBIT_NOTE)
- [ ] `resolution_id` (FK a Resolution)
- [ ] `payment_method_id`
- [ ] `bank_account_id`
- [ ] `cude` (para notas crédito/débito)
- [ ] `referenced_invoice_id` (para notas)
- [ ] `e_document_status`
- [ ] `api_response`
- [ ] `notes`
- [ ] `total_withholdings`
- [ ] `cost_center_id`
- [ ] `is_pos`

### Modelos nuevos necesarios:
- [ ] `Resolution` - Resoluciones DIAN
- [ ] `InvoiceSequence` - Control de consecutivos
- [ ] `InvoiceItemTax` - Impuestos por item
- [ ] `InvoiceWithholding` - Retenciones
- [ ] `InvoiceRecurrent` - Facturas recurrentes
- [ ] `Storage` - Bodegas para inventario

---

## Seeds Disponibles

```
prisma/seeds/
├── 01-system-actions.seed.ts   // Acciones del sistema
├── 02-roles.seed.ts            // Roles base
└── 03-plans.seed.ts            // Planes de suscripción
```

---

## Arquitectura de Microservicios

### Separación de Responsabilidades (Decisión 2025-01-27)

| Service | Puerto | Responsabilidad |
|---------|--------|-----------------|
| **auth-service** | 3001 | Autenticación pura: Login, Logout, Sessions, Passwords, Verify email, Switch company, Refresh tokens |
| **company-service** | 3003 | Provisioning empresas: Crear empresa + tenant DB, Replicar paramétricas, Gestionar usuarios de empresa |
| **admin-service** | 3002 | CRUDs globales (Super Admin): Roles, Plans, SystemActions, Paramétricas |
| **accounting-service** | 3004 | Contabilidad: PUC, Asientos, Reportes contables |
| **invoice-service** | 3005 | Facturación: Facturas, Notas, Resoluciones DIAN |
| **inventory-service** | 3006 | Inventario: Productos, Bodegas, Movimientos |
| **hr-service** | 3007 | Nómina: Empleados, Liquidaciones, Novedades |
| **treasury-service** | 3008 | Tesorería: Cuentas bancarias, Conciliaciones |
| **reports-service** | 3009 | Reportes: Generación PDF/Excel |
| **notification-service** | 3010 | Notificaciones: Email, SMS, Push |

### Flujo de Registro de Empresa

```
[Frontend] --> [company-service] POST /companies/register
                    |
                    v
              1. Validar NIT único
              2. Validar email admin único
              3. Validar NIT con DIAN (producción)
              4. Crear tenant database
              5. Ejecutar migraciones schema-tenant
              6. Replicar paramétricas Master -> Tenant
              7. Crear empresa en master DB
              8. Crear usuario admin
              9. Crear suscripción trial
              10. Emitir evento RabbitMQ: company.created
                    |
                    v
              [auth-service] escucha company.created
                    |
                    v
              - Genera token verificación email
              - Emite evento: email.verification.send
```

### Endpoints por Service

#### auth-service (Puerto 3001)
```
POST /auth/login           - Login con NIT + email + password
POST /auth/logout          - Cerrar sesión actual
POST /auth/logout-all      - Cerrar todas las sesiones
POST /auth/refresh         - Refrescar access_token
POST /auth/verify-email    - Verificar email con token
POST /auth/switch-company  - Cambiar contexto de empresa
POST /auth/forgot-password - Solicitar reset de password
POST /auth/reset-password  - Resetear password con token
```

#### company-service (Puerto 3003)
```
POST   /companies/register      - Registrar nueva empresa + admin + tenant
GET    /companies/:id           - Obtener info de empresa
PATCH  /companies/:id           - Actualizar empresa
DELETE /companies/:id           - Soft delete empresa

POST   /companies/:id/users     - Agregar usuario a empresa
GET    /companies/:id/users     - Listar usuarios de empresa
PATCH  /companies/:id/users/:userId - Actualizar membresía
DELETE /companies/:id/users/:userId - Remover usuario

POST   /companies/:id/invite    - Invitar usuario por email
```

#### admin-service (Puerto 3002) - Solo Super Admin - IMPLEMENTADO
```
# Roles
GET    /admin/roles             - Listar roles (ordenados por jerarquía)
GET    /admin/roles/:id         - Obtener rol por ID
GET    /admin/roles/key/:key    - Obtener rol por clave
POST   /admin/roles             - Crear rol
PATCH  /admin/roles/:id         - Actualizar rol (protege roles del sistema)
DELETE /admin/roles/:id         - Eliminar rol (no permite si tiene usuarios)

# Plans
GET    /admin/plans             - Listar planes (?includeInactive=true)
GET    /admin/plans/:id         - Obtener plan con sus acciones
POST   /admin/plans             - Crear plan
PATCH  /admin/plans/:id         - Actualizar plan
DELETE /admin/plans/:id         - Eliminar plan (no permite si tiene suscripciones)

# Plan Actions
GET    /admin/plans/:id/actions           - Listar acciones del plan
POST   /admin/plans/:id/actions           - Configurar múltiples acciones
PATCH  /admin/plans/:id/actions/:key      - Toggle acción individual
DELETE /admin/plans/:id/actions/:key      - Remover acción del plan

# System Actions
GET    /admin/system-actions              - Listar acciones (?module=invoicing)
GET    /admin/system-actions/modules      - Listar módulos disponibles
GET    /admin/system-actions/:id          - Obtener acción por ID
GET    /admin/system-actions/key/:key     - Obtener acción por clave
POST   /admin/system-actions              - Crear acción
PATCH  /admin/system-actions/:id          - Actualizar acción
DELETE /admin/system-actions/:id          - Eliminar acción

# Catálogos Paramétricos
GET    /admin/catalogs                    - Listar catálogos disponibles
GET    /admin/catalogs/:table             - Listar registros (?active=true)
GET    /admin/catalogs/:table/:id         - Obtener registro
POST   /admin/catalogs/:table             - Crear registro
PATCH  /admin/catalogs/:table/:id         - Actualizar registro
DELETE /admin/catalogs/:table/:id         - Eliminar registro

# Endpoints especiales geográficos
GET    /admin/catalogs/departments/by-country/:countryId
GET    /admin/catalogs/municipalities/by-department/:departmentId

# Catálogos disponibles:
# countries, departments, municipalities, type-document-identifications,
# type-organizations, type-regimes, type-liabilities, banks,
# payment-methods, economic-activities
```

### Cambios Realizados en auth-service (2025-01-27)

**Eliminado de auth-service:**
- [x] `registerCompany()` method - movido a company-service
- [x] `POST /auth/register-company` endpoint
- [x] `TenantDatabaseService` - eliminado (mover a company-service)
- [x] `DianValidationService` - eliminado (mover a company-service)
- [x] Carpeta `modules/tenant/` - eliminada
- [x] Carpeta `modules/dian/` - eliminada
- [x] `RegisterCompanyDto` - eliminado

**Mantiene auth-service:**
- `register()` - registrar usuarios (podría moverse a company-service en el futuro)
- `login()` - autenticación con NIT + email + password
- `logout()` / `logoutAll()` - cerrar sesiones
- `refresh()` - renovar tokens
- `verifyEmail()` - verificación de email
- `switchCompany()` - cambiar contexto de empresa

### Implementación admin-service (2025-01-27)

**Módulos creados:**
- [x] `PrismaModule` - Conexión a Master DB
- [x] `RolesModule` - CRUD de roles con protección de roles del sistema
- [x] `SystemActionsModule` - CRUD de acciones del sistema por módulo
- [x] `PlansModule` - CRUD de planes + gestión de PlanActions
- [x] `CatalogsModule` - CRUD genérico para tablas paramétricas

**Estructura de archivos:**
```
admin-service/src/
├── app.module.ts
├── main.ts (Swagger configurado)
└── modules/
    ├── prisma/
    │   ├── prisma.module.ts
    │   └── prisma.service.ts
    ├── roles/
    │   ├── dto/
    │   ├── roles.controller.ts
    │   ├── roles.service.ts
    │   └── roles.module.ts
    ├── system-actions/
    │   ├── dto/
    │   ├── system-actions.controller.ts
    │   ├── system-actions.service.ts
    │   └── system-actions.module.ts
    ├── plans/
    │   ├── dto/
    │   ├── plans.controller.ts
    │   ├── plans.service.ts
    │   └── plans.module.ts
    └── catalogs/
        ├── catalogs.controller.ts
        ├── catalogs.service.ts
        └── catalogs.module.ts
```

### Comunicación entre Servicios

```
[company-service] ---> RabbitMQ ---> [auth-service]
                                ---> [notification-service]

Eventos:
- company.created       -> Generar tokens, enviar email bienvenida
- company.user.added    -> Enviar invitación por email
- company.user.removed  -> Invalidar sesiones del usuario
```

---

## Arquitectura de Usuarios y Permisos (Decisión 2025-01-27)

### Flujo Simple

```
┌─────────────────────────────────────────────────────────────────┐
│  MASTER DB                                                       │
│                                                                  │
│  User (dueños del sistema)                                       │
│    - Hace login                                                  │
│    - Crea empresa → se crea Tenant DB + Subscription (Plan)     │
│    - Tiene TODOS los permisos de su Plan                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  TENANT DB (empresa del dueño)                                   │
│                                                                  │
│  Plan contratado tiene módulos: [facturación, inventario, ...]  │
│                                                                  │
│  Dueño crea empleados (TenantUser) con permisos específicos:    │
│    - "María: solo puede crear facturas, no anularlas"           │
│    - "Juan: solo puede ver inventario"                          │
│                                                                  │
│  Empleado hace login → solo ve lo que tiene permiso             │
└─────────────────────────────────────────────────────────────────┘
```

### Modelos en Tenant DB (NUEVO)

```prisma
model TenantUser {
  id                   String    @id @default(uuid())
  email                String    @unique
  password_hash        String
  full_name            String
  phone                String?

  tercero_id           String?   @unique  // Vinculado a Tercero si es empleado

  is_active            Boolean   @default(true)
  must_change_password Boolean   @default(true)
  last_login_at        DateTime?

  created_at           DateTime  @default(now())
  updated_at           DateTime  @updatedAt

  tercero              Tercero?  @relation(fields: [tercero_id], references: [id])
  permissions          TenantUserPermission[]

  @@map("tenant_users")
}

model TenantUserPermission {
  id              String   @id @default(uuid())
  tenant_user_id  String
  module_key      String   // "invoicing", "inventory", "payroll"
  action_key      String?  // "invoices.create", null = módulo completo
  granted         Boolean  @default(true)

  tenant_user     TenantUser @relation(fields: [tenant_user_id], references: [id], onDelete: Cascade)

  @@unique([tenant_user_id, module_key, action_key])
  @@map("tenant_user_permissions")
}
```

### Cálculo de Permisos

```
Permisos del empleado = Plan.módulos ∩ TenantUserPermission.granted

Ejemplo - María:
  Plan tiene: [facturación, inventario, nómina]
  María tiene: [facturación.crear: ✅, facturación.anular: ❌]

  María puede:
    ✅ Crear facturas
    ❌ Anular facturas
    ❌ Inventario (no tiene permisos)
    ❌ Nómina (no tiene permisos)
```

---

## Notas de Implementación

1. **Paramétricas replicadas**: Al crear tenant se copian desde Master
2. **Tercero unificado**: Un mismo registro puede ser Cliente + Proveedor + Empleado
3. **Self-relations en Tercero**: EPS, ARL, etc. son otros Terceros con role específico
4. **Jerarquía de empleados**: `director_id` apunta a otro Tercero
5. **Cuentas contables por tercero**: CXC y CXP configurables
6. **company-service crea empresas**: auth-service NO debe crear empresas ni tenant DBs
7. **Comunicación async**: Los servicios se comunican via RabbitMQ para eventos
8. **TenantUser**: Empleados con acceso al sistema, creados por el dueño
9. **Permisos granulares**: El dueño decide qué puede hacer cada empleado
