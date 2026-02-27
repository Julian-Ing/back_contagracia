# Sistema de Permisos - Sin Hierarchy

**Fecha:** 2026-02-03

## Cambio Importante

**El campo `hierarchy` ha sido eliminado del sistema.** La documentación anterior que hacía referencia a hierarchy (como `2026-01-31-tenant-users-admin-access.md`) está obsoleta.

## Nuevo Sistema de Permisos

Los permisos ahora se basan exclusivamente en:

1. **Rol del usuario** (`role_key`): `owner`, `admin`, `employee`, etc.
2. **Permisos del plan** de la empresa (módulos y acciones habilitadas)
3. **Permisos asignados al rol** (`RolePermission`)
4. **Permisos individuales del usuario** (`TenantUserPermission`)

## Lógica de Acceso

### Owner y Admin
- Los usuarios con `role_key` = `owner` o `admin` tienen acceso a **todas las acciones** de los módulos incluidos en el plan de la empresa.

### Otros Roles (employee, etc.)
- Obtienen acceso solo a las acciones explícitamente asignadas en:
  - `RolePermission` (permisos del rol)
  - `TenantUserPermission` (permisos individuales)
- Los permisos se filtran contra las acciones disponibles en el plan.

## Flujo de Autorización

```
┌─────────────────────────────────────────────────────────────┐
│              Request con JWT                                 │
│              user_type: company_user                         │
│              role_key: owner/admin/employee                  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
                ┌───────────────────────┐
                │  ¿Es owner o admin?   │
                └───────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              │                           │
           Sí (owner/admin)         No (otros roles)
              │                           │
              ▼                           ▼
┌─────────────────────────┐   ┌─────────────────────────┐
│ Obtener TODAS las       │   │ Obtener permisos del    │
│ acciones del plan       │   │ rol + permisos usuario  │
└─────────────────────────┘   └─────────────────────────┘
              │                           │
              └─────────────┬─────────────┘
                            │
                            ▼
                ┌───────────────────────┐
                │  Validar contra plan  │
                │  (filtrar acciones    │
                │   no disponibles)     │
                └───────────────────────┘
                            │
                            ▼
                    Acceso concedido
```

## Gestión de Usuarios

La capacidad de gestionar usuarios depende de:

1. El plan de la empresa incluye el módulo `user_management`
2. El usuario tiene permisos de las acciones del módulo `user_management`:
   - `user_management.view`
   - `user_management.create`
   - `user_management.update`
   - `user_management.delete`

Los `owner` y `admin` obtienen estos permisos automáticamente si el módulo está en el plan.

## Notas

- El campo `hierarchy` fue removido del modelo `Role` en Prisma
- No usar lógica basada en números de jerarquía
- Los permisos se determinan por `role_key` y permisos explícitos
