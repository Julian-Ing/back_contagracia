# Eliminación de Roles - Frontend

**Fecha:** 2026-02-04

## Descripción

Implementación del botón y modal de confirmación para eliminar roles personalizados.

## Archivos modificados

### `src/modules/company/services/users.service.ts`

Nuevo método:
```typescript
async deleteRole(id: string): Promise<{ message: string }> {
  const response = await usersClient.delete<{ message: string }>(`/roles/${id}`);
  return response.data;
}
```

### `src/modules/company/hooks/useUsers.ts`

Nuevo método en `useRoles()`:
```typescript
const deleteRole = async (id: string) => {
  const result = await usersService.deleteRole(id);
  await fetchRoles();
  return result;
};
```

### `src/app/dashboard/company-users/page.tsx`

- Import de `react-hot-toast`
- Estados para modal de confirmación: `deleteRoleId`, `deleteRoleName`
- Handler `handleDeleteRole()` con toast de éxito/error
- Handler `openDeleteRole()` para abrir modal
- Modal de confirmación con botones Cancelar/Eliminar

## Validaciones UI

El botón eliminar solo aparece si:
- Usuario tiene permiso `roles.delete`
- Rol no es `owner`
- Rol no es de sistema (`is_system: false`)

## Comportamiento

1. Usuario hace clic en "Eliminar" del menú dropdown
2. Se abre modal de confirmación
3. Al confirmar:
   - Se llama `DELETE /roles/:id`
   - Si éxito: toast verde + cierra modal + refresca lista
   - Si error: toast rojo con mensaje del backend (ej: "tiene X usuarios asignados")
