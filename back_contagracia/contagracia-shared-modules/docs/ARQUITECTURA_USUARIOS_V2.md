# Arquitectura de Usuarios V2

## Cambio de Arquitectura

### Antes (V1)
```
Master DB:
- users (todos los usuarios)
- user_companies (relación usuario-empresa)
- user_action_permissions
- user_module_permissions

Tenant DB:
- tenant_users (copia/sync de datos)
```

### Ahora (V2)
```
Master DB:
- users (SOLO admins del sistema - inserts manuales)
- sessions (user_id opcional, metadata para tenant_user_id)
- password_resets (user_id opcional, email + metadata)

Tenant DB:
- tenant_users (usuarios de empresa con password_hash)
- roles
- role_permissions
- tenant_user_permissions
```

## Tablas Eliminadas del Schema Master

1. **UserCompany** - Ya no existe. Cada tenant tiene sus propios usuarios.
2. **UserActionPermission** - Redundante. Permisos están en tenant (RolePermission, TenantUserPermission).
3. **UserModulePermission** - Redundante. Módulos habilitados vienen del Plan.

## Tablas Modificadas

### Session
```prisma
model Session {
  user_id   String?  // Null para usuarios de empresa
  metadata  Json?    // { tenant_user_id, company_id }
  // ... otros campos
}
```

### PasswordReset
```prisma
model PasswordReset {
  user_id   String?  // Null para usuarios de empresa
  email     String   // Email para lookup
  metadata  Json?    // { tenant_user_id, company_id }
  // ... otros campos
}
```

## Flujos de Autenticación

### Login SIN NIT (Admin del Sistema)
1. Usuario envía: { email, password }
2. auth-service busca User en master por email
3. Valida password contra User.password_hash
4. Crea Session con user_id
5. Genera JWT con user_type: 'system_admin'

### Login CON NIT (Usuario de Empresa)
1. Usuario envía: { nit, email, password }
2. auth-service busca Company en master por NIT
3. Conecta a la DB del tenant
4. Busca TenantUser en tenant por email
5. Valida password contra TenantUser.password_hash
6. Crea Session con metadata: { tenant_user_id, company_id }
7. Genera JWT con user_type: 'company_user', role, modules

## JWT Payload

### Admin del Sistema
```json
{
  "sub": "user-id-master",
  "email": "admin@sistema.com",
  "user_type": "system_admin",
  "session_id": "uuid"
}
```

### Usuario de Empresa
```json
{
  "sub": "tenant-user-id",
  "email": "usuario@empresa.com",
  "user_type": "company_user",
  "company_id": "uuid",
  "tenant_id": "empresa_xyz",
  "role": "owner|admin|accountant|...",
  "database_url": "postgresql://...",
  "modules": ["invoicing", "inventory", "..."],
  "session_id": "uuid"
}
```

## Registro de Empresa (company-service)

`POST /companies/register`

1. Valida NIT único
2. Crea Company + Subscription en master
3. Crea DB del tenant (tenant.service)
4. Ejecuta migraciones en tenant
5. Replica paramétricos
6. Crea TenantUser con rol 'owner' en tenant

**NO crea User ni UserCompany en master.**

## Migración Requerida

Después de estos cambios, ejecutar:
```bash
cd contagracia-shared-modules
npx prisma migrate dev --schema=prisma/schema-master.prisma --name remove_user_company_tables
```

## Archivos Modificados

### Schema
- `prisma/schema-master.prisma` - Session, PasswordReset opcionales, eliminados UserCompany, etc.

### auth-service
- `auth.service.ts` - Login reescrito, refresh actualizado, switchCompany eliminado
- `auth.controller.ts` - switchCompany endpoint eliminado
- `auth-response.interface.ts` - SwitchCompanyResponse eliminado
- `passwords.service.ts` - changePassword, forgotPassword, resetPassword actualizados
- `passwords.controller.ts` - changePassword actualizado

### company-service
- `companies.service.ts` - registerCompany ya no crea User/UserCompany
- `companies.controller.ts` - getCompany, updateCompany sin userId

### admin-service
- `companies.service.ts` - Sin referencias a user_companies, impersonate usa TenantUser
- `companies.controller.ts` - updateRole endpoint eliminado
