"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantAllPermissions = exports.TenantAnyPermission = exports.TenantPermission = exports.TENANT_PERMISSIONS_MODE_KEY = exports.TENANT_PERMISSIONS_KEY = exports.TENANT_PERMISSION_KEY = void 0;
const common_1 = require("@nestjs/common");
exports.TENANT_PERMISSION_KEY = 'tenant_required_permission';
exports.TENANT_PERMISSIONS_KEY = 'tenant_required_permissions';
exports.TENANT_PERMISSIONS_MODE_KEY = 'tenant_permissions_mode';
/**
 * Decorador para requerir UN permiso específico (verificación en tiempo real)
 * @param actionKey - El permiso requerido (ej: 'users.create')
 */
const TenantPermission = (actionKey) => (0, common_1.SetMetadata)(exports.TENANT_PERMISSION_KEY, actionKey);
exports.TenantPermission = TenantPermission;
/**
 * Decorador para requerir CUALQUIERA de los permisos (OR) - verificación en tiempo real
 * @param actionKeys - Array de permisos (se necesita al menos uno)
 */
const TenantAnyPermission = (...actionKeys) => {
    return (0, common_1.applyDecorators)((0, common_1.SetMetadata)(exports.TENANT_PERMISSIONS_KEY, actionKeys), (0, common_1.SetMetadata)(exports.TENANT_PERMISSIONS_MODE_KEY, 'any'));
};
exports.TenantAnyPermission = TenantAnyPermission;
/**
 * Decorador para requerir TODOS los permisos (AND) - verificación en tiempo real
 * @param actionKeys - Array de permisos (se necesitan todos)
 */
const TenantAllPermissions = (...actionKeys) => {
    return (0, common_1.applyDecorators)((0, common_1.SetMetadata)(exports.TENANT_PERMISSIONS_KEY, actionKeys), (0, common_1.SetMetadata)(exports.TENANT_PERMISSIONS_MODE_KEY, 'all'));
};
exports.TenantAllPermissions = TenantAllPermissions;
