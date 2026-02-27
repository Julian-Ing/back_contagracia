# Contagracia Backend - Microservicios

Sistema de microservicios para Contagracia construido con NestJS, PostgreSQL y Prisma.

## Inicio Rapido

### Requisitos Previos

- **Node.js** v18 o superior
- **pnpm** v8 o superior (`npm install -g pnpm`)
- **PostgreSQL** v14 o superior corriendo en localhost:5432
  - Usuario: `postgres`
  - Password: `root`

### Paso 1: Instalar Dependencias y Compilar Shared Modules

> **IMPORTANTE:** El orden de estos pasos es critico. Los clientes Prisma deben generarse antes de instalar las dependencias del monorepo, ya que los servicios referencian `@prisma/client-master` y `@prisma/client-tenant` como dependencias locales (`file:..`).

```bash
cd back_contagracia

# 1. Instalar dependencias de shared-modules primero
cd contagracia-shared-modules
pnpm install

# 2. Generar clientes Prisma (master y tenant)
pnpm prisma:generate

# 3. Compilar los modulos compartidos (shared-audit, shared-auth, shared-realtime, shared-validators)
# Esto es necesario porque index.js importa desde los dist/ de cada modulo
cd shared-audit && pnpm run build && cd ..
cd shared-auth && pnpm run build && cd ..
cd shared-realtime && npx tsc && cd ..
cd shared-validators && npx tsc && cd ..

# 4. Volver a la raiz e instalar todas las dependencias del monorepo
cd ..
pnpm install
```

### Paso 2: Configurar Base de Datos

1. Crear la base de datos master en PostgreSQL:

```sql
CREATE DATABASE contagracia_master;
```

2. Sincronizar el schema master con la base de datos (push):

```bash
cd contagracia-shared-modules
pnpm prisma:push:master
```

3. Ejecutar las seeds (datos iniciales):

```bash
pnpm prisma:seed
```

Esto ejecuta todas las seeds en orden: modulos, acciones, PUC, planes, impuestos, bancos, geografia, catalogos, admin, integraciones, CMS, contabilidad, asientos y AR/AP.

4. (Opcional) Si ya existen tenants y se modifico el schema tenant, sincronizar todos los tenants:

```bash
npx ts-node --transpile-only prisma/scripts/migrate-all-tenants.ts --force
```

5. (Opcional) Replicar datos parametricos (catalogos) a todos los tenants existentes:

```bash
npx ts-node --transpile-only prisma/scripts/seed-all-tenants.ts --force
```

```bash
cd ..
```

> **Nota:** Las bases de datos tenant se crean automaticamente al registrar una empresa. No es necesario crearlas manualmente ni ejecutar `prisma:push:tenant`.

### Paso 3: Configurar Variables de Entorno

Cada servicio tiene su archivo `.env`. Verifica que existan:

- `auth-service/.env`
- `admin-service/.env`
- `company-service/.env`
- `users-service/.env`
- `hr-service/.env`
- `media-service/.env`
- `notification-service/.env`

### Paso 4: Ejecutar los Servicios

```bash
# Ejecutar todos los servicios activos
pnpm dev:all

# O ejecutar servicios core
pnpm dev:core      # auth + admin + company

# O ejecutar individualmente:
pnpm dev:auth          # Puerto 3001
pnpm dev:admin         # Puerto 3002
pnpm dev:company       # Puerto 3003
pnpm dev:users         # Puerto 3004
pnpm dev:hr            # Puerto 3012
pnpm dev:media         # Puerto 3018
pnpm dev:notification  # Puerto 3015
```

### Paso 5 (una sola vez): Migrar archivos existentes al media-service

Si ya existian archivos subidos en `uploads/` (logos, imagenes CMS, blog, etc.), ejecutar el script de migracion:

```bash
cd media-service
npx ts-node --transpile-only scripts/migrate-existing-uploads.ts --dry-run   # Ver que haria
npx ts-node --transpile-only scripts/migrate-existing-uploads.ts --cleanup   # Ejecutar + limpiar carpetas viejas
```

Este script:
- Copia los archivos al nuevo formato `uploads/media/{categoria}/{company_id|global}/{uuid}.{ext}`
- Crea registros en la tabla `media` de master DB
- Actualiza las referencias en las tablas origen (`Company.logo_url`, `SiteSection.content`, etc.) a `/api/media/{id}`
- Con `--cleanup` elimina las carpetas viejas (`cms/`, `blog/`, `logos/`, `signatures/`, `site/`)

### Paso 6: Verificar que Funcionan

```bash
# Auth Service
curl http://localhost:3001/api

# Admin Service
curl http://localhost:3002/api

# Company Service
curl http://localhost:3003/api
```

---

## Arquitectura

- **Multi-tenancy:** Database-per-tenant (cada empresa tiene su propia BD)
- **Microservicios:** Arquitectura independiente y escalable
- **Shared Modules:** Modulos compartidos entre servicios (Prisma, Auth, Cache, etc.)

## Microservicios

| Servicio                     | Puerto | Estado        | Descripcion                             |
| ---------------------------- | ------ | ------------- | --------------------------------------- |
| auth-service                 | 3001   | Listo         | Autenticacion, registro, sesiones       |
| admin-service                | 3002   | Listo         | Planes, acciones del sistema, catalogos |
| company-service              | 3003   | Listo         | Gestion de empresas, terceros y tenants |
| users-service                | 3004   | Listo         | Gestion de usuarios de empresa          |
| invoicing-service            | 3005   | Pendiente     | Facturacion electronica                 |
| integrations-service         | 3006   | Listo         | Integraciones externas (DIAN, email)    |
| inventory-service            | 3007   | Pendiente     | Inventario                              |
| purchase-service             | 3009   | Pendiente     | Compras y CxP                           |
| accounting-service           | 3010   | Listo         | Contabilidad, PUC, asientos             |
| tax-service                  | 3011   | Pendiente     | Impuestos                               |
| hr-service                   | 3012   | En desarrollo | Recursos Humanos y Nomina               |
| media-service                | 3018   | Listo         | Archivos centralizados con JWT          |
| crm-service                  | 3013   | Pendiente     | CRM                                     |
| reports-service              | 3014   | Pendiente     | Reportes                                |
| notification-service         | 3015   | Listo         | Notificaciones                          |
| quote-service                | 3016   | Pendiente     | Cotizaciones                            |
| electronic-documents-service | 3017   | Pendiente     | Documentos electronicos DIAN            |

## Comandos de Desarrollo

### Instalar dependencias

```bash
pnpm install
```

### Ejecutar servicios

```bash
# Ejecutar TODOS los servicios activos en paralelo
pnpm dev:all

# Ejecutar servicios core (auth + admin + company)
pnpm dev:core

# Ejecutar un servicio especifico
pnpm dev:auth          # auth-service en puerto 3001
pnpm dev:admin         # admin-service en puerto 3002
pnpm dev:company       # company-service en puerto 3003
pnpm dev:users         # users-service en puerto 3004
pnpm dev:hr            # hr-service en puerto 3012
pnpm dev:media         # media-service en puerto 3018
pnpm dev:notification  # notification-service en puerto 3015
```

### Compilar

```bash
# Compilar todos los servicios
pnpm build

# Compilar un servicio especifico
pnpm build:auth
pnpm build:admin
pnpm build:company
pnpm build:users
pnpm build:hr
pnpm build:media
pnpm build:notification
```

### Produccion

```bash
# Iniciar todos los servicios
pnpm start

# Iniciar servicio especifico
pnpm start:auth
pnpm start:admin
pnpm start:company
pnpm start:users
pnpm start:hr
pnpm start:media
pnpm start:notification
```

### Otros comandos

```bash
# Ejecutar linters
pnpm lint

# Ejecutar tests
pnpm test
```

## Base de Datos

### Bases de datos

- **Master DB:** `contagracia_master` - Datos de auth, empresas, planes, roles, permisos
- **Tenant DBs:** `contagracia_tenant_{nit}` - Una por cada empresa registrada

### Prisma - Comandos paso a paso

Todos los comandos se ejecutan desde `contagracia-shared-modules/`:

```bash
cd contagracia-shared-modules
```

#### 1. Generar clientes de Prisma

```bash
pnpm prisma:generate
```

Genera `@prisma/client-master` (desde `schema-master.prisma`) y `@prisma/client-tenant` (desde `schema-tenant.prisma`). **Ejecutar siempre que se modifique un schema.**

#### 2. Sincronizar schema master con la BD (db push)

```bash
pnpm prisma:push:master
```

Aplica los cambios del schema master directamente a la base de datos sin crear archivos de migracion. Ideal para desarrollo.

#### 3. Migraciones (alternativa a db push para produccion)

```bash
# Crear y aplicar migracion en master
pnpm prisma:migrate:dev
```

#### 4. Ejecutar seeds

```bash
pnpm prisma:seed
```

Las seeds estan organizadas en archivos independientes, orquestadas desde `prisma/seeds/seed.ts`:

| Orden | Archivo                       | Contenido                                                                                              |
| ----- | ----------------------------- | ------------------------------------------------------------------------------------------------------ |
| 1     | `seed-modules.ts`             | 32 modulos + 560 acciones del sistema                                                                  |
| 2     | `seed-plans.ts`               | 4 planes (Trial, Basico, Profesional, Empresarial)                                                     |
| 3     | `seed-taxes.ts`               | 21 tipos de impuesto DIAN                                                                              |
| 4     | `seed-banks.ts`               | 32 bancos de Colombia                                                                                  |
| 5     | `seed-geography.ts`           | 249 paises, 33 departamentos, 1122 municipios                                                          |
| 6     | `seed-puc.ts`                 | 216 cuentas PUC (Plan Unico de Cuentas)                                                                |
| 7     | `seed-catalogs.ts`            | Documentos, organizaciones, regimenes, responsabilidades, unidades, metodos de pago, ajustes bancarios |
| 8     | `seed-admin.ts`               | Super admin (admin@contagracia.com)                                                                    |
| 9     | `seed-integrations.ts`        | Integraciones (SMTP, etc.)                                                                             |
| 10    | `seed-cms.ts`                 | Landing page y secciones                                                                               |
| 11    | `seed-accounting-config.ts`   | Configuraciones de contabilidad                                                                        |
| 12    | `seed-journal-entry-types.ts` | Tipos de asientos contables                                                                            |
| 13    | `seed-ar-ap-sources.ts`       | Fuentes de AR/AP                                                                                       |
| 14    | `companyPaymentMethods.ts`    | Metodos de pago por defecto                                                                            |

#### 5. Migrar tenants existentes (cuando se modifica schema-tenant.prisma)

```bash
npx ts-node --transpile-only prisma/scripts/migrate-all-tenants.ts --force
```

Aplica `prisma db push` a todas las BDs tenant activas registradas en master.

Para replicar datos parametricos a todos los tenants:

```bash
npx ts-node --transpile-only prisma/scripts/seed-all-tenants.ts --force
```

> **Nota:** Las BDs tenant se crean automaticamente al registrar una empresa desde el company-service. No es necesario crearlas manualmente.

#### Resumen rapido (copiar y pegar)

```bash
cd contagracia-shared-modules

# Setup inicial completo
pnpm install
pnpm prisma:generate
cd shared-audit && pnpm run build && cd ..
cd shared-auth && pnpm run build && cd ..
cd shared-realtime && npx tsc && cd ..
cd shared-validators && npx tsc && cd ..
cd .. && pnpm install && cd contagracia-shared-modules
pnpm prisma:push:master
pnpm prisma:seed

# Solo si hay tenants existentes y se modifico schema-tenant:
npx ts-node --transpile-only prisma/scripts/migrate-all-tenants.ts --force
npx ts-node --transpile-only prisma/scripts/seed-all-tenants.ts --force
```

## Variables de Entorno

### auth-service/.env

```env
DATABASE_MASTER_URL="postgresql://postgres:root@localhost:5432/contagracia_master?schema=public"
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=root
JWT_SECRET="dev-secret-key-change-in-production-256-bits-minimum"
JWT_EXPIRATION="1h"
REFRESH_TOKEN_EXPIRATION="7d"
PORT=3001
NODE_ENV="development"
```

### admin-service/.env

```env
DATABASE_MASTER_URL="postgresql://postgres:root@localhost:5432/contagracia_master?schema=public"
JWT_SECRET="dev-secret-key-change-in-production-256-bits-minimum"
PORT=3002
NODE_ENV="development"
```

### company-service/.env

```env
DATABASE_MASTER_URL="postgresql://postgres:root@localhost:5432/contagracia_master?schema=public"
TENANT_DB_HOST="localhost"
TENANT_DB_PORT="5432"
TENANT_DB_USER="postgres"
TENANT_DB_PASSWORD="root"
JWT_SECRET="dev-secret-key-change-in-production-256-bits-minimum"
PORT=3003
NODE_ENV="development"
```

### media-service/.env

```env
DATABASE_MASTER_URL="postgresql://postgres:root@localhost:5432/contagracia_master?schema=public"
JWT_SECRET="dev-secret-key-change-in-production-256-bits-minimum"
PORT=3018
NODE_ENV="development"
```

**IMPORTANTE:** El `JWT_SECRET` debe ser el mismo en todos los servicios.

## Estructura del Proyecto

```
back_contagracia/
├── contagracia-shared-modules/     # Modulos compartidos
│   ├── prisma/
│   │   ├── schema-master.prisma    # Schema de master DB
│   │   ├── schema-tenant.prisma    # Schema de tenant DBs
│   │   └── seeds/                  # Seeds de datos iniciales
│   └── packages/                   # Paquetes compartidos
│
├── auth-service/                   # Servicio de autenticacion
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/              # Registro, login, JWT
│   │   │   ├── sessions/          # Gestion de sesiones
│   │   │   ├── passwords/         # Cambio/reset contrasenas
│   │   │   ├── tenant/            # Creacion de tenant DBs
│   │   │   └── dian/              # Validacion NIT con DIAN
│   │   └── main.ts
│   └── .env
│
├── admin-service/                  # Servicio de administracion
│   ├── src/
│   │   ├── modules/
│   │   │   ├── plans/             # Gestion de planes
│   │   │   ├── system-actions/    # Acciones y modulos del sistema
│   │   │   └── catalogs/          # Catalogos (paises, departamentos, etc.)
│   │   └── main.ts
│   └── .env
│
├── company-service/                # Servicio de empresas
│   ├── src/
│   │   ├── modules/
│   │   │   └── company/           # CRUD de empresas
│   │   └── main.ts
│   └── .env
│
├── media-service/                  # Servicio de archivos (JWT)
│   ├── src/
│   │   ├── modules/
│   │   │   ├── prisma/            # Conexion master DB
│   │   │   └── media/             # Upload, download, guard de acceso
│   │   │       ├── media.controller.ts
│   │   │       ├── media.service.ts
│   │   │       ├── media-access.guard.ts
│   │   │       ├── category-config.ts
│   │   │       └── dto/
│   │   └── main.ts
│   ├── scripts/
│   │   └── migrate-existing-uploads.ts  # Migracion one-time
│   └── .env
│
├── uploads/media/                  # Archivos servidos via media-service
│   ├── company_logo/{company_id}/
│   ├── cms_image/global/
│   ├── blog_image/global/
│   └── certificate/{company_id}/
│
├── package.json                   # Scripts del monorepo
└── pnpm-workspace.yaml           # Configuracion workspaces
```

## API Endpoints

### Auth Service (http://localhost:3001/api)

| Metodo | Endpoint               | Descripcion                    |
| ------ | ---------------------- | ------------------------------ |
| POST   | /auth/register-company | Registrar empresa + admin      |
| POST   | /auth/login            | Login (NIT + email + password) |
| POST   | /auth/verify-email     | Verificar email                |
| POST   | /auth/refresh          | Refresh token                  |
| POST   | /auth/logout           | Logout                         |
| POST   | /auth/logout-all       | Logout de todas las sesiones   |
| GET    | /auth/sessions         | Listar sesiones activas        |
| POST   | /auth/reclaim-session  | Reclamar sesion desplazada     |
| POST   | /auth/passwords/change | Cambiar contrasena             |
| POST   | /auth/passwords/forgot | Solicitar reset                |
| POST   | /auth/passwords/reset  | Resetear contrasena            |

### Admin Service (http://localhost:3002/api)

| Metodo | Endpoint                               | Descripcion                        |
| ------ | -------------------------------------- | ---------------------------------- |
| GET    | /plans                                 | Listar planes                      |
| GET    | /plans/:id                             | Obtener plan por ID                |
| POST   | /plans                                 | Crear plan                         |
| PUT    | /plans/:id                             | Actualizar plan                    |
| DELETE | /plans/:id                             | Eliminar plan                      |
| GET    | /plans/:id/actions                     | Obtener acciones de un plan        |
| POST   | /plans/:id/actions                     | Asignar acciones a un plan         |
| GET    | /system-actions                        | Listar acciones del sistema        |
| GET    | /system-actions/modules                | Listar modulos del sistema         |
| GET    | /catalogs/:type                        | Obtener items de un catalogo       |
| GET    | /catalogs/countries                    | Listar paises                      |
| GET    | /catalogs/departments/:countryId       | Listar departamentos por pais      |
| GET    | /catalogs/municipalities/:departmentId | Listar municipios por departamento |

### Company Service (http://localhost:3003/api)

| Metodo | Endpoint       | Descripcion            |
| ------ | -------------- | ---------------------- |
| POST   | /companies     | Registrar empresa      |
| GET    | /companies/:id | Obtener empresa por ID |
| PUT    | /companies/:id | Actualizar empresa     |
| DELETE | /companies/:id | Eliminar empresa       |

## Sistema de Autenticación Centralizado

Todos los microservicios usan un sistema de autenticación centralizado via `AuthModule` de `@contagracia/shared-modules`.

### Como funciona

El `AuthModule.forRoot()` configura automáticamente:

- **JwtModule** con `registerAsync` (usando `ConfigService`)
- **PassportModule** con estrategia JWT por defecto
- **JwtStrategy** centralizada que valida tokens
- **JwtAuthGuard** como `APP_GUARD` global
- **PermissionsGuard** como `APP_GUARD` global

### Configurar autenticación en un servicio nuevo

```typescript
import { AuthModule } from "@contagracia/shared-modules";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule.forRoot(), // <- Esto es todo lo que necesitas
    // ... otros imports
  ],
})
export class AppModule {}
```

### Decoradores disponibles

| Decorador                           | Uso                                             |
| ----------------------------------- | ----------------------------------------------- |
| `@Public()`                         | Marca una ruta como pública (sin autenticación) |
| `@RequirePermissions('action.key')` | Requiere permiso específico (lógica AND)        |
| `@RequireAnyPermission('a', 'b')`   | Requiere al menos un permiso (lógica OR)        |
| `@CurrentUser()`                    | Inyecta el payload del JWT en el handler        |
| `@CompanyId()`                      | Inyecta solo el `company_id` del JWT            |
| `@Roles('admin', 'user')`           | Requiere uno de los roles especificados         |

### Ejemplo de uso

```typescript
import {
  Public,
  RequirePermissions,
  CurrentUser,
  JwtPayload,
} from "@contagracia/shared-modules";

@Controller("items")
export class ItemsController {
  @Public() // Sin autenticación
  @Get("public")
  getPublicItems() {}

  @Get() // Requiere autenticación (guard global)
  getItems(@CurrentUser() user: JwtPayload) {}

  @RequirePermissions("items.create")
  @Post()
  createItem() {}
}
```

### Opciones del AuthModule

```typescript
AuthModule.forRoot({
  global: true, // Default: true - Registra guards como APP_GUARD
});

// Si necesitas control manual de guards:
AuthModule.forRoot({ global: false });
```

---

## Sistema de Permisos Granular (IMPORTANTE)

El sistema de permisos valida acciones granulares consultando la base de datos del tenant en tiempo real. **NO se guardan permisos en el JWT** para evitar tokens gigantes.

### Como funciona

```
Request con JWT valido
        ↓
┌───────────────────────────────────────┐
│       PermissionsGuard (global)       │
├───────────────────────────────────────┤
│ 1. Lee metadata @RequirePermissions   │
│    o @RequireAnyPermission            │
│                                       │
│ 2. Si NO hay decorator de permisos:   │
│    → SKIP: permite acceso             │
│                                       │
│ 3. Si HAY decorator de permisos:      │
│    → Obtiene company_id del JWT       │
│    → Conecta al tenant via            │
│      TenantContextService             │
│    → Consulta BD: ¿usuario tiene      │
│      el permiso asignado?             │
│    → Cache de 60 segundos             │
│    → Si NO tiene: 403 Forbidden       │
│    → Si SI tiene: continua            │
└───────────────────────────────────────┘
        ↓
     Controller
```

### Usar permisos en endpoints

```typescript
import {
  RequirePermissions,
  RequireAnyPermission,
} from "@contagracia/shared-modules";

@Controller("employees")
export class EmployeesController {
  // Solo JWT valido (sin permisos especificos)
  @Get()
  findAll() {}

  // Requiere permiso especifico
  @RequirePermissions("employees.read")
  @Get(":id")
  findOne(@Param("id") id: string) {}

  // Requiere TODOS los permisos (logica AND)
  @RequirePermissions("employees.create", "employees.salary.update")
  @Post()
  create(@Body() dto: CreateEmployeeDto) {}

  // Requiere AL MENOS UNO de los permisos (logica OR)
  @RequireAnyPermission("employees.update", "employees.admin")
  @Patch(":id")
  update(@Param("id") id: string) {}

  // Permiso para eliminar
  @RequirePermissions("employees.delete")
  @Delete(":id")
  remove(@Param("id") id: string) {}
}
```

### Claves de permiso (action_key)

Los permisos se definen en la tabla `system_action` (master) y se asignan a roles en cada tenant. Convencion de nombres:

```
modulo.accion
modulo.submodulo.accion
```

Ejemplos:

- `employees.read`, `employees.create`, `employees.update`, `employees.delete`
- `employees.salary.update`, `employees.status.update`
- `payroll.settlements.create`, `payroll.settlements.approve`
- `invoices.create`, `invoices.void`

### Configuracion REQUERIDA en cada servicio

Para que el sistema de permisos funcione, el servicio DEBE:

**1. Importar TenantContextModule en app.module.ts:**

```typescript
import {
  AuthModule,
  TenantContextModule,
  AuditModule,
} from "@contagracia/shared-modules";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    // 1. TenantContextModule PRIMERO (requerido para permisos)
    TenantContextModule.forRoot({
      masterDatabaseUrl: process.env.DATABASE_MASTER_URL!,
      connectionCacheTtl: 60000, // Cache de conexiones: 1 minuto
    }),

    // 2. AuthModule (guards de autenticacion + permisos)
    AuthModule.forRoot(),

    // 3. AuditModule (auditoria)
    AuditModule.forRoot({
      serviceName: "mi-service",
    }),

    // ... otros imports
  ],
})
export class AppModule {}
```

**2. Configurar ValidationPipe en main.ts:**

```typescript
import { ValidationPipe } from "@nestjs/common";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true, // IMPORTANTE: transforma query params a tipos correctos
      whitelist: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // ... resto de la configuracion
}
```

**3. Variables de entorno requeridas:**

```env
DATABASE_MASTER_URL="postgresql://postgres:root@localhost:5432/contagracia_master?schema=public"
JWT_SECRET="dev-secret-key-change-in-production-256-bits-minimum"
```

### Verificar que funciona

Al iniciar el servicio, debe aparecer en consola:

```
[TenantContextService] TenantContextService initialized (global instance registered)
```

Si NO aparece, el PermissionsGuard no podra validar permisos y dara error 403.

### Cache de permisos

- Los permisos se cachean **60 segundos** por usuario
- Primera consulta: ~5ms (query a BD tenant)
- Consultas siguientes: ~0ms (desde cache)
- El cache se invalida automaticamente al expirar
- Para invalidar manualmente: `TenantContextService.invalidateUserPermissions(companyId, userId)`

### Errores comunes

| Error                                    | Causa                            | Solucion                                                 |
| ---------------------------------------- | -------------------------------- | -------------------------------------------------------- |
| `403 Sistema de permisos no configurado` | TenantContextModule no importado | Agregar `TenantContextModule.forRoot()` en app.module.ts |
| `403 Token invalido: falta company_id`   | Usuario sin empresa asignada     | El JWT debe tener `company_id`                           |
| `403 No tienes permiso para...`          | Usuario no tiene el permiso      | Asignar permiso al rol del usuario en BD tenant          |
| `is_active: "true"` (Prisma error)       | ValidationPipe sin transform     | Agregar `transform: true` en ValidationPipe              |

---

## Endpoints Publicos vs Protegidos

### Flujo de autenticacion

```
Request HTTP entrante
        ↓
┌───────────────────────────────────────┐
│         JwtAuthGuard (global)         │
├───────────────────────────────────────┤
│ 1. Lee metadata IS_PUBLIC_KEY         │
│    (seteada por @Public())            │
│                                       │
│ 2. Si @Public() existe:               │
│    → SKIP: permite acceso sin JWT     │
│                                       │
│ 3. Si NO tiene @Public():             │
│    → Valida JWT en header             │
│    → Authorization: Bearer <token>    │
│    → Si invalido: 401 Unauthorized    │
│    → Si valido: inyecta user en req   │
└───────────────────────────────────────┘
        ↓
┌───────────────────────────────────────┐
│    RolesGuard / PermissionsGuard      │
│    (si aplica @Roles o @Require...)   │
└───────────────────────────────────────┘
        ↓
     Controller
```

### Contenido del JWT

Cuando un usuario se autentica, el token JWT contiene:

```typescript
interface JwtPayload {
  sub: string; // ID del usuario
  email: string; // Email del usuario
  user_type: "system_admin" | "company_user";
  company_id?: string; // Solo para company_user
  role?: string; // Rol del usuario
  session_id: string; // ID de la sesion
  permissions?: string[]; // Permisos del usuario
}
```

### Tipos de usuario

| Tipo           | Descripcion                           | company_id         | Acceso                 |
| -------------- | ------------------------------------- | ------------------ | ---------------------- |
| `system_admin` | Administrador de Contagracia (master) | `null`             | Panel admin `/admin`   |
| `company_user` | Usuario de una empresa (tenant)       | UUID de la empresa | Dashboard `/dashboard` |

### Cuando usar @Public()

Usar `@Public()` para endpoints que deben ser accesibles **sin autenticacion**:

| Caso de uso                 | Ejemplo                                    |
| --------------------------- | ------------------------------------------ |
| Landing page                | `GET /cms/pages/home`                      |
| Blog publico                | `GET /blog/posts`, `GET /blog/posts/:slug` |
| Catalogos de referencia     | `GET /admin/catalogs/countries`            |
| Planes para mostrar precios | `GET /admin/plans`                         |
| Navegacion del sitio        | `GET /cms/navigation`                      |

**NO usar @Public() para:**

- Crear, actualizar o eliminar recursos (`POST`, `PATCH`, `DELETE`)
- Datos sensibles de usuarios o empresas
- Operaciones administrativas

### Ejemplo completo de un controller mixto

```typescript
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
} from "@nestjs/common";
import {
  Public,
  Audit,
  RequirePermissions,
  CurrentUser,
  JwtPayload,
} from "@contagracia/shared-modules";

@Controller("admin/cms/pages")
export class PagesController {
  // PUBLICO: Cualquier visitante puede listar paginas
  @Public()
  @Get()
  findAll() {
    return this.pagesService.findAll();
  }

  // PUBLICO: Cualquier visitante puede ver una pagina
  @Public()
  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.pagesService.findOne(id);
  }

  // PROTEGIDO: Solo usuarios autenticados pueden crear
  // + Auditoria del cambio
  @Audit("page.created", "page")
  @Post()
  create(@Body() dto: CreatePageDto, @CurrentUser() user: JwtPayload) {
    return this.pagesService.create(dto);
  }

  // PROTEGIDO + PERMISO ESPECIFICO: Solo con permiso 'cms.pages.update'
  @Audit("page.updated", "page")
  @RequirePermissions("cms.pages.update")
  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdatePageDto) {
    return this.pagesService.update(id, dto);
  }

  // PROTEGIDO: Solo usuarios autenticados pueden eliminar
  @Audit("page.deleted", "page")
  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.pagesService.remove(id);
  }
}
```

### Resumen de decoradores de seguridad

| Decorador                        | Efecto                     | Nivel       |
| -------------------------------- | -------------------------- | ----------- |
| (ninguno)                        | Requiere JWT valido        | Basico      |
| `@Public()`                      | Sin autenticacion          | Abierto     |
| `@Roles('admin')`                | Requiere rol especifico    | Restrictivo |
| `@RequirePermissions('x')`       | Requiere permiso(s) - AND  | Restrictivo |
| `@RequireAnyPermission('x','y')` | Requiere al menos uno - OR | Restrictivo |

### Guards disponibles en shared-modules

| Guard              | Uso                                                        |
| ------------------ | ---------------------------------------------------------- |
| `JwtAuthGuard`     | Validacion JWT estandar (registrado globalmente)           |
| `JwtOptionalGuard` | JWT opcional - no falla si el token esta expirado/invalido |
| `RolesGuard`       | Validacion de roles                                        |
| `PermissionsGuard` | Validacion de permisos (registrado globalmente)            |

**IMPORTANTE: NO crear guards JWT locales en los servicios**

Todos los guards deben importarse de `@contagracia/shared-modules`. **Nunca** crear archivos como `common/guards/jwt-auth.guard.ts` en un servicio:

```typescript
// INCORRECTO - NO hacer esto:
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";

// CORRECTO - Siempre importar del shared:
import { JwtAuthGuard, JwtOptionalGuard } from "@contagracia/shared-modules";
```

### Usar JwtOptionalGuard (para endpoints como logout)

El `JwtOptionalGuard` intenta autenticar pero **no falla** si el token es invalido o expirado. Util para endpoints que deben funcionar aunque el token haya expirado.

**IMPORTANTE: Siempre usar `@Public()` junto con `JwtOptionalGuard`**

```typescript
@Public()                        // 1. Evita que JwtAuthGuard global bloquee el request
@UseGuards(JwtOptionalGuard)     // 2. Intenta leer el token, pero no falla si es invalido
```

**¿Por que se necesitan ambos?**

1. `@Public()` - Desactiva el `JwtAuthGuard` global (registrado por `AuthModule.forRoot()`). Sin esto, el guard global rechazaria el request con 401 antes de llegar al controller.

2. `@UseGuards(JwtOptionalGuard)` - Intenta extraer y validar el token JWT. Si es valido, llena `req.user`. Si es invalido/expirado, simplemente deja `req.user = null` sin lanzar excepcion.

**Ejemplo completo:**

```typescript
import { Public, JwtOptionalGuard } from "@contagracia/shared-modules";

@Controller("auth")
export class AuthController {
  @Public() // Desactiva guard global
  @UseGuards(JwtOptionalGuard) // Intenta leer token sin fallar
  @Post("logout")
  async logout(@Req() req: any) {
    // req.user sera null si el token esta expirado/invalido
    if (!req.user) {
      return { message: "Logout exitoso" };
    }
    // Si hay usuario valido, cerrar sesion en BD
    return this.authService.logout(req.user.session_id);
  }
}
```

**Casos de uso:**

- `/auth/logout` - Debe funcionar aunque el token expire mientras el usuario esta en la app
- Endpoints que opcionalmente enriquecen la respuesta si hay usuario autenticado

---

## Sistema de Auditoria

Todos los microservicios tienen un sistema de auditoria automatico que registra cada request en la tabla `audit_log` de cada tenant.

### Como funciona

El `AuditLoggingInterceptor` se registra globalmente via `AuditModule.forRoot()` en cada servicio. Intercepta **todos** los requests y guarda:

| Campo                            | Descripcion                            |
| -------------------------------- | -------------------------------------- |
| `user_id`, `email`, `session_id` | Quien lo hizo                          |
| `action_key`                     | Que hizo (ej: `company.updated`)       |
| `method`, `url`                  | Donde (ej: `PATCH /api/companies/123`) |
| `ip_address`, `user_agent`       | Desde donde                            |
| `performed_at`, `duration_ms`    | Cuando y cuanto tardo                  |
| `request_body`                   | Datos enviados (passwords sanitizados) |
| `response_body`                  | Respuesta (truncada a 10KB)            |
| `status_code`, `error_message`   | Resultado o error                      |
| `service_name`                   | Microservicio que proceso el request   |

### OBLIGATORIO al crear un nuevo endpoint

Cada vez que se crea un endpoint POST, PUT, PATCH o DELETE, se **DEBE** agregar el decorador `@Audit()`:

```typescript
import { Audit } from '@contagracia/shared-modules';

@Audit('entity.action', 'entity_type')
@Post()
async createSomething(@Body() dto: CreateDto) {
  // ...
}
```

**Convencion de nombres para `action_key`:**

```
entity.action
```

Ejemplos:

- `company.created`, `company.updated`, `company.deleted`
- `tenant_user.permissions_updated`
- `invoice.approved`, `invoice.cancelled`
- `blog_post.published`

### Excluir endpoints del audit

Para health checks, metrics u otros endpoints ruidosos, usar `@NoAudit()`:

```typescript
import { NoAudit } from '@contagracia/shared-modules';

@NoAudit()
@Get('health')
async healthCheck() {
  return { status: 'ok' };
}
```

### Registrar AuditModule en un servicio nuevo

En el `app.module.ts` del servicio:

```typescript
import {
  AuthModule,
  AuditModule,
  TenantContextModule,
  TenantContextService,
} from "@contagracia/shared-modules";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule.forRoot(), // Autenticación centralizada
    TenantContextModule.forRoot({
      masterDatabaseUrl: process.env.DATABASE_MASTER_URL!,
    }),
    AuditModule.forRoot({
      serviceName: "mi-service",
      tenantPrismaService: TenantContextService, // Habilita persistencia en BD tenant
    }),
    // ... otros imports
  ],
})
export class AppModule {}
```

**Opciones de AuditModule:**

- `serviceName`: Nombre del servicio (requerido)
- `tenantPrismaService`: Clase que provee conexión al tenant (opcional). Si no se provee, los logs no se persisten en BD.

> **Nota:** Sin `company_id` en el JWT, los logs no se persisten (skip silencioso). Solo se guardan cuando hay contexto de tenant.

---

## Media Service (Archivos centralizados con JWT)

Servicio centralizado para subir, almacenar y servir archivos. Todos los archivos se sirven a traves del controller con `StreamableFile` y requieren JWT (excepto archivos publicos). **No se usa `ServeStaticModule`** — las URLs de archivos no son adivinables (UUID).

### Dual Database: Tenant + Master

El media-service usa **dos bases de datos** para almacenar registros de archivos:

| Tipo de usuario | Base de datos | Categorias | Ejemplo |
|-----------------|---------------|-----------|---------|
| `company_user` (con `company_id` en JWT) | **Tenant DB** | company_logo, company_signature, employee_document, certificate, general | Logo de empresa, firma, documentos de empleados |
| `system_admin` (sin `company_id`) | **Master DB** | cms_image, blog_image, site_asset | Imagenes de landing page, blog publico |

**Routing automatico:**
- Al **subir**: si el JWT tiene `company_id` → se guarda en la DB del tenant. Si no → master DB.
- Al **consultar** (`GET /api/media/:id`): busca primero en tenant DB (si hay JWT con `company_id`), luego en master DB.
- Al **listar**: muestra archivos de la DB correspondiente al tipo de usuario.

**Ventajas:**
- Aislamiento real por tenant: los archivos de cada empresa estan en su propia BD
- Los archivos globales (CMS, blog) quedan centralizados en master
- No se necesita campo `company_id` en la tabla `media` del tenant (es implicito)

### Modelo Prisma en Tenant (`schema-tenant.prisma`)

```prisma
model Media {
  id            String   @id @default(uuid())
  original_name String
  file_name     String
  mime_type     String
  size          Int
  category      String
  visibility    String   @default("company")
  uploaded_by   String    // TenantUser ID
  storage_path  String
  is_active     Boolean  @default(true)
  created_at    DateTime @default(now())
  updated_at    DateTime @updatedAt

  @@index([category])
  @@index([uploaded_by])
  @@map("media")
}
```

> **Nota:** El modelo en master DB (`schema-master.prisma`) es igual pero **sin** `company_id` — master solo almacena archivos globales (CMS, blog, site).

### Arquitectura

```
Frontend sube archivo
  → POST /api/media/upload (JWT + categoria)
    → media-service valida permisos, guarda archivo en disco
    → Si JWT tiene company_id → registra en TENANT DB
    → Si no tiene company_id → registra en MASTER DB
    → retorna { id, url: "/api/media/{id}" }

Frontend muestra archivo
  → GET /api/media/{id} (JWT o publico segun visibilidad)
    → MediaAccessGuard busca en TENANT DB primero, luego MASTER DB
    → retorna StreamableFile
```

### Almacenamiento en disco

```
uploads/media/{categoria}/{company_id|global}/{uuid}.{ext}
```

Ejemplos:
- `uploads/media/company_logo/3085cfb3-.../a1b2c3d4.png`
- `uploads/media/cms_image/global/efb27315-....jpg`
- `uploads/media/certificate/3085cfb3-.../d4e5f6a7.p12`

### Endpoints

| Metodo | Ruta | Auth | Descripcion |
|--------|------|------|-------------|
| `POST` | `/api/media/upload` | JWT + permiso por categoria | Subir archivo (multipart/form-data) |
| `GET` | `/api/media/:id` | JWT o publico (segun visibilidad) | Descargar/ver archivo (stream) |
| `GET` | `/api/media/:id/info` | JWT o publico (segun visibilidad) | Metadata del archivo |
| `GET` | `/api/media` | JWT | Listar archivos (filtro por category, visibility, paginado) |
| `DELETE` | `/api/media/:id` | JWT + owner | Soft delete (is_active=false) |

### Categorias y permisos

Cada archivo pertenece a una categoria que define: tamano maximo, MIME types permitidos, visibilidad por defecto, y permisos requeridos para subir/ver.

| Categoria | Max Size | Visibilidad | Permiso subir | Permiso ver |
|-----------|----------|-------------|---------------|-------------|
| `company_logo` | 2 MB | company | `companies.update` | — |
| `company_signature` | 2 MB | company | `companies.update` | `companies.view` |
| `employee_document` | 5 MB | company | `employees.update` | `employees.view` |
| `cms_image` | 5 MB | public | — | — |
| `blog_image` | 5 MB | public | — | — |
| `site_asset` | 2 MB | public | — | — |
| `certificate` | 5 MB | private | `dian.manage` | `dian.view` |
| `general` | 5 MB | company | — | — |

### Niveles de visibilidad

| Nivel | Acceso |
|-------|--------|
| `public` | Sin JWT — cualquier visitante (imagenes CMS, blog, favicon) |
| `company` | JWT requerido + archivo debe estar en tenant DB del usuario |
| `private` | JWT requerido + `user.sub === media.uploaded_by` |

### Subir un archivo

```bash
curl -X POST http://localhost:3018/api/media/upload \
  -H "Authorization: Bearer {JWT}" \
  -F "file=@logo.png" \
  -F "category=company_logo"
```

Respuesta:
```json
{
  "id": "a1b2c3d4-...",
  "original_name": "logo.png",
  "mime_type": "image/png",
  "size": 45320,
  "category": "company_logo",
  "visibility": "company",
  "url": "/api/media/a1b2c3d4-...",
  "created_at": "2026-02-19T..."
}
```

### Ver un archivo

```
GET http://localhost:3018/api/media/a1b2c3d4-...
```

- Si es `public`: retorna el archivo sin JWT
- Si es `company` o `private`: requiere JWT con los permisos correspondientes

### Usar la URL en otros servicios

Cuando otro servicio necesita guardar una referencia a un archivo, guarda la URL retornada (`/api/media/{id}`). El frontend usa esa URL para mostrar el archivo, apuntando al media-service (puerto 3018).

### Usar media-service desde otro servicio (o frontend)

Cualquier servicio o el frontend puede subir y consultar archivos via HTTP al media-service (puerto 3018). No necesita importar modulos especiales, solo hacer requests HTTP con el JWT del usuario:

```typescript
// Ejemplo: subir logo desde company-service o frontend
const formData = new FormData();
formData.append('file', fileBuffer, 'logo.png');
formData.append('category', 'company_logo');

const response = await fetch('http://localhost:3018/api/media/upload', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${jwt}` },
  body: formData,
});

const { id, url } = await response.json();
// Guardar `url` ("/api/media/{id}") en el campo correspondiente (ej: Company.logo_url)
```

Para mostrar el archivo en el frontend:
```html
<!-- El src apunta al media-service. Si es publico no necesita JWT. -->
<img src="http://localhost:3018/api/media/{id}" />

<!-- Para archivos company/private, enviar JWT en el header (via fetch/axios) -->
```

### Script de migracion (una sola vez)

Para migrar archivos existentes de las carpetas viejas (`uploads/cms/`, `uploads/logos/`, etc.) al nuevo formato:

```bash
cd media-service

# Ver que haria sin hacer cambios
npx ts-node --transpile-only scripts/migrate-existing-uploads.ts --dry-run

# Ejecutar migracion y limpiar carpetas viejas
npx ts-node --transpile-only scripts/migrate-existing-uploads.ts --cleanup
```

El script:
1. Busca en la DB todas las referencias a `/uploads/...` (Company, BlogPost, Page, SiteSection, SiteSetting)
2. Copia cada archivo al nuevo formato `uploads/media/{categoria}/{company_id|global}/{uuid}.{ext}`
3. Crea el registro en la tabla `media`
4. Actualiza la referencia en la tabla origen a `/api/media/{id}`
5. Con `--cleanup`: elimina las carpetas viejas

---

## Sistema de Tiempo Real (WebSocket + Redis Pub/Sub)

El sistema de tiempo real permite comunicacion instantanea entre microservicios y el frontend sin polling. Usa **Redis Pub/Sub** para comunicacion entre servicios y **Socket.IO** (WebSocket) para push al frontend.

### Arquitectura

```
Microservicio (ej: notification-service, users-service)
  → RealtimePublisherService.notify*()
    → Redis PUBLISH (canal: realtime:*)
      → auth-service: RealtimeSubscriberService
        → PermissionsGateway.emit*()
          → Socket.IO → Frontend (RealtimeProvider)
```

### Canales Redis disponibles

| Canal                    | Descripcion                  | Eventos                                                                       |
| ------------------------ | ---------------------------- | ----------------------------------------------------------------------------- |
| `realtime:permissions`   | Cambios en permisos de roles | `role_updated`, `user_role_changed`                                           |
| `realtime:sessions`      | Sesiones y logout forzado    | `force_logout_user`, `force_logout_company`, `session_displaced`              |
| `realtime:lists`         | CRUD en listas               | `roles_changed`, `users_changed`, `companies_changed`, `master_users_changed` |
| `realtime:notifications` | Notificaciones de empresa    | `notification_created`, `notification_read`, `notifications_all_read`         |

### Rooms de Socket.IO

Los clientes se asignan a rooms segun su JWT:

| Room     | Formato                      | Recibe                                                  |
| -------- | ---------------------------- | ------------------------------------------------------- |
| Personal | `user:{userId}`              | Eventos dirigidos al usuario                            |
| Compania | `company:{companyId}`        | Notificaciones, cambios de roles/usuarios de la empresa |
| Rol      | `role:{companyId}:{roleKey}` | Cambios de permisos del rol                             |
| Admins   | `system_admins`              | Cambios de companias y usuarios master                  |

### Publicar eventos desde un servicio

**1. Importar RealtimeModule en app.module.ts:**

```typescript
import { RealtimeModule } from "@contagracia/shared-modules";

@Module({
  imports: [
    RealtimeModule, // Redis Pub/Sub
    // ... otros imports
  ],
})
export class AppModule {}
```

**2. Inyectar y usar RealtimePublisherService:**

```typescript
import { RealtimePublisherService } from "@contagracia/shared-modules";

@Injectable()
export class MyService {
  constructor(private readonly realtimePublisher: RealtimePublisherService) {}

  async createSomething() {
    // ... logica de negocio ...

    // Notificar en tiempo real (fire-and-forget)
    this.realtimePublisher
      .notifyNotificationCreated(companyId, {
        id: notification.id,
        type: "admin_announcement",
        title: "Nuevo aviso",
        message: "Contenido del aviso",
      })
      .catch((err) => this.logger.warn(err.message));
  }
}
```

**3. Variable de entorno requerida:**

```env
REDIS_URL="redis://localhost:6379"
```

### Suscribirse a eventos en el frontend

```typescript
import { useRealtime } from "@/shared/providers/RealtimeProvider";

function MyComponent() {
  const { subscribe } = useRealtime();

  useEffect(() => {
    const unsub = subscribe("notifications:received", (data) => {
      console.log("Nueva notificacion:", data.notification);
    });
    return unsub;
  }, [subscribe]);
}
```

### Eventos disponibles en el frontend

| Evento Socket.IO         | Payload                                      | Descripcion                                  |
| ------------------------ | -------------------------------------------- | -------------------------------------------- |
| `permissions:refresh`    | `{ reason, roleKey }`                        | Permisos del usuario cambiaron               |
| `session:force_logout`   | `{ reason }`                                 | Sesion cerrada forzosamente                  |
| `session:displaced`      | `{ activeSessionId, reason, deviceInfo? }`   | Sesion desplazada por login en otro lugar     |
| `roles:changed`          | `{ action, roleId }`                         | Rol creado/editado/eliminado                 |
| `users:changed`          | `{ action, userId }`                         | Usuario creado/editado/eliminado             |
| `companies:changed`      | `{ action, companyId }`                      | Compania actualizada (admins)                |
| `master_users:changed`   | `{ action, userId }`                         | Usuario master actualizado (admins)          |
| `notifications:received` | `{ notification }`                           | Nueva notificacion                           |
| `notifications:read`     | `{ notificationId }`                         | Notificacion marcada como leida              |
| `notifications:all_read` | `{}`                                         | Todas marcadas como leidas                   |

### Requisitos

- **Redis** corriendo en `localhost:6379` (o la URL configurada en `REDIS_URL`)
- **auth-service** debe estar ejecutandose (es el hub de WebSocket)
- El servicio que publica eventos debe importar `RealtimeModule`

---

## Troubleshooting

### Error: Cannot connect to database

- Verifica que PostgreSQL esta corriendo
- Revisa las credenciales en `.env`
- Asegurate que la base de datos `contagracia_master` existe

### Error: Port already in use

```bash
# Windows - encontrar proceso usando el puerto
netstat -ano | findstr :3001

# Matar el proceso
taskkill /PID <PID> /F
```

### Error: Cannot find module '@prisma/client-master' (o client-tenant)

Los clientes Prisma deben generarse **antes** de ejecutar `pnpm install` en la raiz:

```bash
cd contagracia-shared-modules
pnpm install
pnpm prisma:generate
cd ..
pnpm install
```

### Error: Audit/NoAudit/AuthModule/RealtimePublisherService is not a function (runtime)

Los shared modules necesitan ser compilados. Sus `dist/` pueden estar desactualizados:

```bash
cd contagracia-shared-modules
cd shared-audit && pnpm run build && cd ..
cd shared-auth && pnpm run build && cd ..
cd shared-realtime && npx tsc && cd ..
cd shared-validators && npx tsc && cd ..
```

### Error: DynamicModule types incompatible entre shared-modules y servicios

Esto ocurre cuando las versiones de `@nestjs/*` no coinciden entre los shared modules y los servicios. Todos deben usar la misma major version (actualmente v11). Verificar los `package.json` de cada shared module (`shared-audit`, `shared-auth`, `shared-cache`, etc.).

### Error: Nest can't resolve dependencies of RolesGuard/PermissionsGuard/AuditLoggingInterceptor (Reflector)

Este error ocurre por el **dual-package problem** de pnpm con workspaces anidados. El monorepo tiene dos niveles de workspace (`back_contagracia/` y `contagracia-shared-modules/`), lo que causa que pnpm instale dos copias separadas de `@nestjs/core` con hashes diferentes. La clase `Reflector` de una copia no es `===` a la de la otra, y NestJS no puede inyectarla.

**Causa raiz:**

```
back_contagracia/
├── node_modules/@nestjs/core (v11.x - hash A)
└── contagracia-shared-modules/
    └── node_modules/@nestjs/core (v11.x - hash B)  <- Diferente instancia!
```

Cuando un guard en `shared-auth` importa `Reflector` de `@nestjs/core`, obtiene la clase del hash B. Pero el servicio host (ej: `auth-service`) tiene el hash A. NestJS no puede inyectar B donde espera A.

**Solucion implementada en AuthModule:**

`shared-auth/src/auth.module.ts` resuelve `APP_GUARD` y `Reflector` dinamicamente en runtime:

```typescript
// Resolver modulos del @nestjs/core del servicio host
function getHostCore() {
  return require(
    require.resolve("@nestjs/core", {
      paths: [process.cwd()], // <- Busca desde el directorio del servicio host
    }),
  );
}

function getAppGuardToken() {
  return getHostCore().APP_GUARD;
}

function getHostReflector() {
  return getHostCore().Reflector;
}

// En forRoot():
const HostReflector = getHostReflector();
const providers: Provider[] = [
  {
    provide: Reflector, // Token local de shared-modules
    useFactory: () => new HostReflector(), // Instancia del host
  },
  // ... otros providers
];
```

**Solucion implementada en AuditModule:**

- `audit.module.ts` resuelve `APP_INTERCEPTOR` y `Reflector` dinamicamente via `require.resolve`
- `audit-logging.interceptor.ts` inyecta `Reflector` via string token `@Inject('AUDIT_REFLECTOR')`

**Si este error vuelve a aparecer**, verificar:

1. Que los `dist/` esten actualizados:
   ```bash
   cd contagracia-shared-modules
   pnpm run build:all
   ```
2. Que `auth.module.ts` use `getHostReflector()` con `require.resolve`
3. Que `audit.module.ts` use `getCoreTokens()` con `require.resolve`
4. Que los guards no usen `@Inject(Reflector)`, solo `private reflector: Reflector`

### Error: JWT_SECRET mismatch

Asegurate que el `JWT_SECRET` es identico en todos los archivos `.env` de los servicios.

---

## Notas de Arquitectura

### Workspaces anidados y pnpm

Este monorepo tiene **dos niveles de pnpm workspaces**:

- **Raiz** (`back_contagracia/`): contiene los microservicios + `contagracia-shared-modules`
- **Shared modules** (`contagracia-shared-modules/`): contiene `shared-audit`, `shared-auth`, `shared-cache`, etc.

Esto causa que pnpm instale copias separadas de dependencias como `@nestjs/core` en cada workspace. Para mitigar:

- `.npmrc` en la raiz configura `public-hoist-pattern` para `@nestjs/*`, `rxjs` y `reflect-metadata`
- `.npmrc` en `contagracia-shared-modules/` configura `shamefully-hoist=true`
- Los shared modules que necesitan `@nestjs/core` en runtime (`shared-audit`) resuelven los tokens dinamicamente via `require.resolve` con `paths: [process.cwd()]`

### Versionado de @nestjs

Todos los shared modules y servicios deben usar la misma major version de `@nestjs/*` (actualmente **v11**). Los shared modules usan `peerDependencies` para `@nestjs/common` y `@nestjs/core` para evitar instalaciones duplicadas.

### index.js vs index.ts

- `index.ts`: usado por TypeScript en tiempo de compilacion (tipos y exports)
- `index.js`: usado por Node.js en runtime. Importa desde los `dist/` compilados de cada shared module

Cada vez que se modifique codigo fuente en `shared-audit`, `shared-auth`, `shared-realtime` o `shared-validators`, se debe recompilar:

```bash
cd contagracia-shared-modules
cd shared-audit && pnpm run build && cd ..
cd shared-auth && pnpm run build && cd ..
cd shared-realtime && npx tsc && cd ..
cd shared-validators && npx tsc && cd ..
```

---

### Workspace simplificado (desarrollo)

Durante el desarrollo, el `pnpm-workspace.yaml` puede tener servicios comentados para acelerar instalacion y compilacion. Servicios activos actualmente:

```yaml
packages:
  - "contagracia-shared-modules"
  - "auth-service"
  - "admin-service"
  - "company-service"
  - "users-service"
  - "hr-service"
  - "media-service"
  - "notification-service"
  # ... otros comentados
```

Para activar un servicio, descomentarlo en `pnpm-workspace.yaml` y ejecutar `pnpm install`.

---

---

## Session Displacement (tipo WhatsApp Web)

Cuando un usuario inicia sesion en otro navegador/pestana/dispositivo, las sesiones existentes del mismo usuario reciben una notificacion en tiempo real y muestran un overlay bloqueante con dos opciones: **"Usar aqui"** (reclamar sesion) o **"Cerrar sesion"**.

### Mecanismos de deteccion

| Escenario | Mecanismo | Latencia |
|-----------|-----------|----------|
| Misma pestana/navegador | BroadcastChannel API | Instantaneo (~0ms) |
| Otro navegador/dispositivo | WebSocket via Redis Pub/Sub | ~100ms |

### Flujo

```
Login en Tab B → backend crea Session → emite session:displaced via Redis
                                       → Tab A (WS) recibe → muestra overlay
               → frontend broadcast SESSION_LOGIN via BroadcastChannel
                                       → Tab A (mismo browser) recibe → muestra overlay
```

### Reclaim (reclamar sesion)

```
Tab A click "Usar aqui" → POST /auth/reclaim-session
  → backend emite session:displaced con activeSessionId = Tab A
    → Tab B recibe → compara activeSessionId !== mySessionId → muestra overlay
  → BroadcastChannel SESSION_RECLAIMED (mismo browser)
```

### Logica del payload

Cada evento `session:displaced` lleva `activeSessionId` (la sesion que acaba de activarse). Cada cliente compara con su propio `sessionId`:
- `activeSessionId === mySessionId` → soy el activo → ocultar overlay
- `activeSessionId !== mySessionId` → fui desplazado → mostrar overlay

### Admin vs Tenant

Admin y tenant usan **IDs de usuario distintos** y **rooms de WebSocket distintos** (`user:{adminId}` vs `user:{tenantUserId}`), por lo que **no se desplazan entre si**. Un usuario puede tener 1 sesion admin + 1 sesion tenant abiertas simultaneamente.

### Archivos involucrados

**Backend:**
- `shared-realtime/src/realtime.events.ts` — `SESSION_DISPLACED` event type + `SessionDisplacedPayload`
- `shared-realtime/src/realtime-publisher.service.ts` — `notifySessionDisplaced()`
- `auth-service/src/modules/permissions-ws/permissions.gateway.ts` — `emitSessionDisplaced()` a room `user:{userId}`
- `auth-service/src/modules/permissions-ws/realtime-subscriber.service.ts` — case `SESSION_DISPLACED`
- `auth-service/src/modules/auth/auth.service.ts` — emite displacement en login + `reclaimSession()`
- `auth-service/src/modules/auth/auth.controller.ts` — `POST /auth/reclaim-session`

**Frontend:**
- `modules/auth/stores/authStore.ts` — `sessionId`, `isDisplaced`, `setDisplaced()`
- `shared/providers/RealtimeProvider.tsx` — escucha `session:displaced`
- `shared/hooks/useSessionDisplacement.ts` — hook con BroadcastChannel + WebSocket
- `shared/components/overlays/SessionDisplacedOverlay.tsx` — overlay UI
- `modules/auth/services/authService.ts` — `reclaimSession()` + broadcast en login
- `app/dashboard/layout.tsx` y `app/admin/layout.tsx` — `<SessionDisplacedOverlay />`

**Ultima actualizacion:** 2026-02-23 (Session Displacement)

---

## Changelog reciente

### 2026-02-23 — Session Displacement (tipo WhatsApp Web)

**Al jalar estos cambios, ejecutar:**

```bash
cd contagracia-shared-modules
cd shared-realtime && npx tsc && cd ..
cd .. && pnpm install
```

**Que cambio:**

- `shared-realtime`: Nuevo evento `SESSION_DISPLACED` en `SessionEventTypes` + payload `SessionDisplacedPayload`
- `shared-realtime`: Nuevo metodo `notifySessionDisplaced()` en `RealtimePublisherService`
- `auth-service`: `RealtimeModule` importado en `auth.module.ts` para inyectar publisher
- `auth-service`: Login admin y tenant ahora emiten `session:displaced` via Redis al crear sesion
- `auth-service`: Nuevo endpoint `POST /auth/reclaim-session` para reclamar sesion desplazada
- `auth-service`: `permissions.gateway.ts` emite `session:displaced` a room `user:{userId}`
- `auth-service`: `realtime-subscriber.service.ts` maneja nuevo case `SESSION_DISPLACED`
- Frontend: `authStore` agrega `sessionId` (decodificado del JWT) e `isDisplaced` (transient)
- Frontend: `RealtimeProvider` escucha `session:displaced` via WebSocket
- Frontend: Nuevo hook `useSessionDisplacement` con BroadcastChannel + WebSocket
- Frontend: Nuevo componente `SessionDisplacedOverlay` (overlay bloqueante z-9999)
- Frontend: `authService.ts` agrega `reclaimSession()` + broadcast `SESSION_LOGIN` en login
- Frontend: Overlay integrado en `dashboard/layout.tsx` y `admin/layout.tsx`

### 2026-02-19 — Media Service (archivos centralizados con JWT + dual DB)

**Al jalar estos cambios, ejecutar:**

```bash
cd contagracia-shared-modules
pnpm prisma:generate
pnpm prisma:push:master    # Crea tabla 'media' en master DB
npx ts-node --transpile-only prisma/scripts/migrate-all-tenants.ts --force  # Crea tabla 'media' en todos los tenants
cd ..
pnpm install

# Migrar archivos existentes (una sola vez)
cd media-service
npx ts-node --transpile-only scripts/migrate-existing-uploads.ts --cleanup
```

**Que cambio:**

- `media-service` (NUEVO): Servicio centralizado de archivos en puerto 3018. Todos los uploads pasan por este servicio con validacion JWT y permisos granulares por categoria
- **Dual Database**: Archivos de empresa van a tenant DB, archivos globales (CMS, blog) van a master DB
- `schema-master.prisma`: Nuevo modelo `Media` con campos: category, visibility, storage_path (sin company_id, solo archivos globales)
- `schema-tenant.prisma`: Nuevo modelo `Media` (sin company_id, es implicito por tenant)
- `admin-service`: Eliminado `ServeStaticModule`, eliminados controllers/services de uploads (CMS, blog, site)
- `company-service`: Eliminado `useStaticAssets`, eliminados controllers/services de logo y firma
- `electronic-documents-service`: Storage path de certificados apunta a `uploads/media/certificate/`
- Los archivos ya NO son accesibles por URL directa — se sirven via `StreamableFile` con verificacion de acceso

**Variables de entorno nuevas en `media-service/.env`:**

```env
DATABASE_MASTER_URL="postgresql://postgres:root@localhost:5432/contagracia_master?schema=public"
JWT_SECRET="dev-secret-key-change-in-production-256-bits-minimum"
PORT=3018
NODE_ENV="development"
```

### 2026-02-11 — Notificaciones en tiempo real

**Al jalar estos cambios, ejecutar:**

```bash
cd contagracia-shared-modules
pnpm install
cd shared-realtime && npx tsc && cd ..
cd .. && pnpm install
```

**Que cambio:**

- `shared-realtime`: Nuevo canal `realtime:notifications` con 3 tipos de evento (created, read, all_read)
- `notification-service`: Ahora publica eventos Redis al crear notificaciones, marcar como leida y marcar todas como leidas. Requiere `REDIS_URL` en `.env`
- `auth-service`: Suscrito al nuevo canal de notificaciones, emite eventos Socket.IO a rooms de compania
- `frontend NotificationDropdown`: Reemplazado polling cada 30s por WebSocket en tiempo real con sonido de notificacion

**Variable de entorno nueva en `notification-service/.env`:**

```env
REDIS_URL="redis://localhost:6379"
```

### 2026-02-06 — HR Module

- EmployeeProfile, contratos, salarios, user linking
