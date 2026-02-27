import { applyDecorators, SetMetadata } from '@nestjs/common';

export const TENANT_PERMISSION_KEY = 'tenant_required_permission';
export const TENANT_PERMISSIONS_KEY = 'tenant_required_permissions';
export const TENANT_PERMISSIONS_MODE_KEY = 'tenant_permissions_mode';

/**
 * Decorador para requerir UN permiso específico (verificación en tiempo real)
 * @param actionKey - El permiso requerido (ej: 'users.create')
 */
export const TenantPermission = (actionKey: string) =>
  SetMetadata(TENANT_PERMISSION_KEY, actionKey);

/**
 * Decorador para requerir CUALQUIERA de los permisos (OR) - verificación en tiempo real
 * @param actionKeys - Array de permisos (se necesita al menos uno)
 */
export const TenantAnyPermission = (...actionKeys: string[]) => {
  return applyDecorators(
    SetMetadata(TENANT_PERMISSIONS_KEY, actionKeys),
    SetMetadata(TENANT_PERMISSIONS_MODE_KEY, 'any'),
  );
};

/**
 * Decorador para requerir TODOS los permisos (AND) - verificación en tiempo real
 * @param actionKeys - Array de permisos (se necesitan todos)
 */
export const TenantAllPermissions = (...actionKeys: string[]) => {
  return applyDecorators(
    SetMetadata(TENANT_PERMISSIONS_KEY, actionKeys),
    SetMetadata(TENANT_PERMISSIONS_MODE_KEY, 'all'),
  );
};
