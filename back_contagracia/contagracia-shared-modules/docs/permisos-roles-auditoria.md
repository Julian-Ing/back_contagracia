# Sistema de Permisos, Roles y Auditoria

## Arquitectura General

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐  │
│  │ authStore   │  │usePermissions│  │ Layout Guards          │  │
│  │ (Zustand)   │  │   (Hook)     │  │ (isAuthenticated)      │  │
│  └─────────────┘  └──────────────┘  └────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ JWT (permissions.actions[])
┌─────────────────────────────────────────────────────────────────┐
│                         BACKEND                                  │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐  │
│  │ @Roles()    │  │@RequirePerms │  │ @Audit()               │  │
│  │ RolesGuard  │  │PermsGuard    │  │ AuditLoggingInterceptor│  │
│  └─────────────┘  └──────────────┘  └────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       BASE DE DATOS                              │
│  modules → system_actions → roles → role_permissions            │
│                                  → tenant_users                  │
│                                  → user_permission_overrides     │
│                                  → audit_log                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 1. BACKEND - Decoradores de Permisos

### @Roles() - Verificar rol del usuario

```typescript
// shared-auth/src/decorators/roles.decorator.ts
import { Roles } from '@contagracia/shared-auth';

@Controller('users')
export class UsersController {

  @Roles('admin', 'manager')
  @Get()
  findAll() {
    // Solo admin o manager pueden acceder
  }
}
```

### @RequirePermissions() - Verificar TODAS las acciones (AND)

```typescript
// shared-auth/src/decorators/permissions.decorator.ts
import { RequirePermissions } from '@contagracia/shared-auth';

@Controller('invoices')
export class InvoicesController {

  @RequirePermissions('invoices.create', 'invoices.send')
  @Post()
  create() {
    // Usuario debe tener AMBOS permisos
  }
}
```

### @RequireAnyPermission() - Verificar AL MENOS UNA accion (OR)

```typescript
import { RequireAnyPermission } from '@contagracia/shared-auth';

@Controller('invoices')
export class InvoicesController {

  @RequireAnyPermission('invoices.view', 'invoices.admin')
  @Get()
  findAll() {
    // Usuario debe tener AL MENOS UNO de los permisos
  }
}
```

---

## 2. BACKEND - Guards

### PermissionsGuard

```typescript
// shared-auth/src/guards/permissions.guard.ts
// Se activa automaticamente cuando usas @RequirePermissions o @RequireAnyPermission

// Flujo:
// 1. Lee metadata del decorador
// 2. Extrae user.permissions.actions del JWT
// 3. Verifica si tiene los permisos requeridos
// 4. Lanza ForbiddenException si no tiene acceso

// Caso especial: usuario tipo "owner" (sin company_id)
// - NO tiene acceso a rutas que requieren permisos de empresa
// - Debe seleccionar una empresa primero
```

### RolesGuard

```typescript
// shared-auth/src/guards/roles.guard.ts
// Se activa cuando usas @Roles()

// Flujo:
// 1. Lee roles requeridos del decorador
// 2. Verifica user.roles del JWT
// 3. Lanza ForbiddenException si no tiene el rol
```

### Uso en un modulo

```typescript
// app.module.ts
import { AuthModule, PermissionsGuard, RolesGuard } from '@contagracia/shared-auth';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [AuthModule],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
```

---

## 3. BACKEND - Auditoria

### @Audit() - Registrar accion especifica

```typescript
// shared-audit/src/decorators/audit.decorator.ts
import { Audit } from '@contagracia/shared-audit';

@Controller('invoices')
export class InvoicesController {

  @Audit('invoice.created', 'invoice')
  @Post()
  create() {
    // Se registra en audit_log con:
    // - action_key: 'invoice.created'
    // - entity_type: 'invoice'
  }

  @Audit('invoice.sent', 'invoice')
  @Post(':id/send')
  send() {
    // Registra el envio de factura
  }
}
```

### @NoAudit() - Excluir de auditoria

```typescript
import { NoAudit } from '@contagracia/shared-audit';

@Controller('health')
export class HealthController {

  @NoAudit()
  @Get()
  check() {
    // Esta ruta NO se registra en audit_log
  }
}
```

### AuditLoggingInterceptor

El interceptor registra automaticamente:

```typescript
// Datos capturados en audit_log:
{
  user_id: string,          // Del JWT
  email: string,            // Del JWT
  session_id: string,       // Del JWT
  company_id: string,       // Del JWT
  action_key: string,       // Del @Audit() o "METHOD /path"
  entity_type: string,      // Del @Audit()
  service_name: string,     // Configurado en AuditModule.forRoot()
  method: string,           // GET, POST, PUT, DELETE
  url: string,              // /api/invoices/123
  request_body: object,     // Body sanitizado (sin passwords)
  response_body: object,    // Respuesta (truncada si > 10KB)
  status_code: number,      // 200, 201, 400, 500...
  duration_ms: number,      // Tiempo de ejecucion
  ip_address: string,       // IP del cliente
  user_agent: string,       // Browser/App
  error_message: string,    // Solo si hay error
}
```

### Configuracion del modulo de auditoria

```typescript
// app.module.ts
import { AuditModule } from '@contagracia/shared-audit';

@Module({
  imports: [
    AuditModule.forRoot({ serviceName: 'invoicing-service' }),
  ],
})
export class AppModule {}
```

---

## 4. FRONTEND - AuthStore (Zustand)

```typescript
// modules/auth/stores/authStore.ts

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  userType: 'owner' | 'company_user' | null;
  role: string | null;
  company: Company | null;
  permissions: Permission | null;  // { role, modules[], actions[] }
  isAuthenticated: boolean;
}

// Uso:
const { isAuthenticated, permissions, userType } = useAuthStore();
```

---

## 5. FRONTEND - Hook usePermissions

```typescript
// shared/hooks/usePermissions.ts

const { can, canAccessModule, canAny, canAll } = usePermissions();

// Verificar accion especifica
if (can('invoices.create')) {
  // Mostrar boton de crear factura
}

// Verificar acceso a modulo
if (canAccessModule('invoicing')) {
  // Mostrar menu de facturacion
}

// Verificar cualquiera de varias acciones (OR)
if (canAny(['invoices.view', 'invoices.admin'])) {
  // Mostrar lista de facturas
}

// Verificar todas las acciones (AND)
if (canAll(['invoices.create', 'invoices.send'])) {
  // Mostrar boton de crear y enviar
}
```

### Ejemplo en componente

```tsx
import { usePermissions } from '@/shared/hooks';

export function InvoicesPage() {
  const { can, canAccessModule } = usePermissions();

  if (!canAccessModule('invoicing')) {
    return <AccessDenied />;
  }

  return (
    <div>
      <h1>Facturas</h1>

      {can('invoices.create') && (
        <Button onClick={handleCreate}>Nueva Factura</Button>
      )}

      {can('invoices.export') && (
        <Button onClick={handleExport}>Exportar</Button>
      )}

      <InvoicesTable />
    </div>
  );
}
```

---

## 6. FRONTEND - Layout Guards

### Dashboard Layout (usuarios autenticados)

```tsx
// app/dashboard/layout.tsx

export default function DashboardLayout({ children }) {
  const { isAuthenticated } = useAuth();
  const hydrated = useAuthHydrated();
  const router = useRouter();

  useEffect(() => {
    if (hydrated && !isAuthenticated) {
      router.push('/');  // Redirigir al login
    }
  }, [hydrated, isAuthenticated, router]);

  if (!hydrated || !isAuthenticated) {
    return <Loading />;
  }

  return (
    <div>
      <Header />
      <Sidebar />
      {children}
    </div>
  );
}
```

### Admin Layout (solo owners)

```tsx
// app/admin/layout.tsx

export default function AdminLayout({ children }) {
  const { isAuthenticated } = useAuth();
  const userType = useAuthStore((s) => s.userType);
  const router = useRouter();

  useEffect(() => {
    if (!hydrated) return;
    if (!isAuthenticated) {
      router.push('/');
    } else if (userType !== 'owner') {
      router.push('/dashboard');  // No es owner, redirigir
    }
  }, [hydrated, isAuthenticated, userType, router]);

  return <>{children}</>;
}
```

---

## 7. BASE DE DATOS - Tablas

### Esquema Master (compartido)

```
modules
├── id
├── module_key        (ej: "invoicing")
├── module_name       (ej: "Facturacion")
└── actions[]

system_actions
├── id
├── module_id         → modules.id
├── action_key        (ej: "invoices.create")
├── action_name       (ej: "Crear Factura")
└── risk_level        (LOW, MEDIUM, HIGH, CRITICAL)
```

### Esquema Tenant (por empresa)

```
roles
├── id
├── role_key          (ej: "admin", "cajero")
├── role_name         (ej: "Administrador")
├── is_system         (true = no se puede eliminar)
└── permissions[]

role_permissions
├── id
├── role_id           → roles.id
├── action_key        (ej: "invoices.create")
└── granted           (true/false)

tenant_users
├── id
├── master_user_id    → users.id (master)
├── role_id           → roles.id
└── overrides[]

user_permission_overrides
├── id
├── tenant_user_id    → tenant_users.id
├── action_key
├── granted           (override del rol)
└── granted_by

audit_log
├── id
├── user_id
├── action_key
├── entity_type
├── service_name
├── method, url
├── request_body, response_body
├── status_code, duration_ms
├── ip_address, user_agent
└── created_at
```

---

## 8. Flujo Completo de Autenticacion

```
1. Usuario hace login
   └── POST /auth/login { nit, email, password }

2. Backend valida credenciales y genera JWT con:
   {
     sub: user_id,
     email: user@example.com,
     company_id: uuid,
     session_id: uuid,
     user_type: 'company_user',
     permissions: {
       role: 'admin',
       modules: ['invoicing', 'inventory'],
       actions: ['invoices.create', 'invoices.view', ...]
     }
   }

3. Frontend guarda en authStore:
   - user, token, refreshToken
   - company, permissions
   - isAuthenticated: true

4. En cada request, el JWT va en header:
   Authorization: Bearer <token>

5. Guards del backend verifican:
   - JwtAuthGuard: Token valido?
   - PermissionsGuard: Tiene las acciones requeridas?
   - RolesGuard: Tiene el rol requerido?

6. AuditLoggingInterceptor registra la accion

7. Frontend usa usePermissions() para mostrar/ocultar UI
```

---

## Ejemplos de action_keys comunes

```
# Facturacion
invoices.view, invoices.create, invoices.edit, invoices.delete
invoices.send, invoices.void, invoices.export

# Inventario
inventory.view, inventory.adjust, inventory.transfer
products.create, products.edit, products.delete

# Contabilidad
accounting.view, accounting.create_entry
journal.view, journal.create, journal.void

# Usuarios
users.view, users.create, users.edit, users.delete
users.change_role, users.reset_password

# Configuracion
settings.view, settings.edit
company.edit, company.billing
```
