# Gestión de Usuarios Tenant - Acceso Admin

**Fecha:** 2026-01-31

## Resumen

Se actualizó el servicio de gestión de usuarios tenant (`TenantUsersService`) para validar correctamente el acceso administrativo usando la tabla `TenantUser` del tenant en lugar de buscar en el master.

## Cambios Realizados

### `tenant-users/tenant-users.service.ts`

#### Método `verifyAdminAccess`

**Antes:**
- Buscaba el usuario en el master usando `UserCompany`
- Verificaba permisos contra tablas del master

**Ahora:**
- Recibe `adminTenantUserId` (ID del TenantUser desde el JWT)
- Conecta directamente al tenant usando `TenantPrismaService`
- Verifica que el `TenantUser` existe y está activo
- Valida jerarquía del rol (hierarchy >= 100 para admins)

```typescript
private async verifyAdminAccess(
  adminTenantUserId: string,
  companyId: string,
): Promise<void> {
  const tenantDb = await this.tenantPrisma.getClientForCompany(companyId);

  const tenantUser = await tenantDb.tenantUser.findUnique({
    where: { id: adminTenantUserId },
    include: { role: true },
  });

  if (!tenantUser || !tenantUser.is_active) {
    throw new ForbiddenException('No tienes acceso a esta empresa');
  }

  // Jerarquía: owner=200, admin=100, employee<100
  if (tenantUser.role.hierarchy < 100) {
    throw new ForbiddenException(
      'Solo administradores pueden gestionar empleados',
    );
  }
}
```

## Jerarquía de Roles

| Rol      | Hierarchy | Puede gestionar empleados |
|----------|-----------|---------------------------|
| owner    | 200       | ✅ Sí                     |
| admin    | 100       | ✅ Sí                     |
| employee | 10        | ❌ No                     |

## Flujo de Autorización

```
┌─────────────────────────────────────────────────────────────┐
│              Request a /tenant-users/*                      │
│              Header: Authorization: Bearer <JWT>            │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
                ┌───────────────────────┐
                │  JwtStrategy extrae:  │
                │  - sub (tenant_user_id)│
                │  - company_id         │
                │  - user_type          │
                └───────────────────────┘
                            │
                            ▼
                ┌───────────────────────┐
                │  verifyAdminAccess()  │
                │  Conecta al tenant    │
                │  Busca TenantUser     │
                │  Verifica hierarchy   │
                └───────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              │                           │
        hierarchy >= 100            hierarchy < 100
              │                           │
              ▼                           ▼
        ✅ Continúa              ❌ ForbiddenException
```

## Notas

- El `adminTenantUserId` viene del campo `sub` del JWT cuando `user_type` es `company_user`
- La conexión al tenant se obtiene dinámicamente usando los datos de la empresa en el master
- Los permisos granulares de acciones se validan contra `TenantUserPermission` en el tenant
