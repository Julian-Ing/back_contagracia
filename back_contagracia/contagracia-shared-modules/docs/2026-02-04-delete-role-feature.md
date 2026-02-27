# Eliminación de Roles

**Fecha:** 2026-02-04

## Descripción

Funcionalidad para eliminar roles personalizados con validaciones de seguridad.

## Backend

### Endpoint

`DELETE /roles/:id`

### Validaciones

1. Solo usuarios `owner` o `admin` pueden eliminar
2. No se pueden eliminar roles del sistema (`is_system: true`)
3. No se puede eliminar un rol con usuarios asignados

### Respuestas

| Código | Descripción |
|--------|-------------|
| 200 | Rol eliminado exitosamente |
| 403 | Sin permisos o es rol de sistema |
| 404 | Rol no encontrado |
| 409 | Rol tiene usuarios asignados |

### Archivos modificados

- `users-service/src/modules/roles/roles.service.ts` - Método `delete()`
- `users-service/src/modules/roles/roles.controller.ts` - Endpoint `DELETE /:id`

## Frontend

### Archivos modificados

- `src/modules/company/services/users.service.ts` - Método `deleteRole()`
- `src/modules/company/hooks/useUsers.ts` - Hook `deleteRole` en `useRoles()`
- `src/app/dashboard/company-users/page.tsx` - Modal de confirmación

### Permiso requerido

`roles.delete` (ubicado en `seeds/modules/actions/user_management.ts`)

### UI

- Botón eliminar visible solo si:
  - Usuario tiene permiso `roles.delete`
  - Rol no es `owner`
  - Rol no es de sistema (`is_system: false`)
- Modal de confirmación antes de eliminar
- Toast de éxito/error con `react-hot-toast`
