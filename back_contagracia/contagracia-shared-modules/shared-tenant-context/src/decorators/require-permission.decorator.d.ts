export declare const TENANT_PERMISSION_KEY = "tenant_required_permission";
export declare const TENANT_PERMISSIONS_KEY = "tenant_required_permissions";
export declare const TENANT_PERMISSIONS_MODE_KEY = "tenant_permissions_mode";
/**
 * Decorador para requerir UN permiso específico (verificación en tiempo real)
 * @param actionKey - El permiso requerido (ej: 'users.create')
 */
export declare const TenantPermission: (actionKey: string) => import("@nestjs/common").CustomDecorator<string>;
/**
 * Decorador para requerir CUALQUIERA de los permisos (OR) - verificación en tiempo real
 * @param actionKeys - Array de permisos (se necesita al menos uno)
 */
export declare const TenantAnyPermission: (...actionKeys: string[]) => <TFunction extends Function, Y>(target: TFunction | object, propertyKey?: string | symbol, descriptor?: TypedPropertyDescriptor<Y>) => void;
/**
 * Decorador para requerir TODOS los permisos (AND) - verificación en tiempo real
 * @param actionKeys - Array de permisos (se necesitan todos)
 */
export declare const TenantAllPermissions: (...actionKeys: string[]) => <TFunction extends Function, Y>(target: TFunction | object, propertyKey?: string | symbol, descriptor?: TypedPropertyDescriptor<Y>) => void;
