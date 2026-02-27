"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantPermissionsGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const tenant_context_service_1 = require("../tenant-context.service");
const require_permission_decorator_1 = require("../decorators/require-permission.decorator");
let TenantPermissionsGuard = class TenantPermissionsGuard {
    constructor(reflector, tenantContextService) {
        this.reflector = reflector;
        this.tenantContextService = tenantContextService;
    }
    async canActivate(context) {
        // Obtener permiso requerido del decorador
        const requiredPermission = this.reflector.getAllAndOverride(require_permission_decorator_1.TENANT_PERMISSION_KEY, [context.getHandler(), context.getClass()]);
        const requiredPermissions = this.reflector.getAllAndOverride(require_permission_decorator_1.TENANT_PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);
        const permissionsMode = this.reflector.getAllAndOverride(require_permission_decorator_1.TENANT_PERMISSIONS_MODE_KEY, [context.getHandler(), context.getClass()]);
        // Si no hay decorador de permisos, permitir acceso
        if (!requiredPermission && !requiredPermissions) {
            return true;
        }
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        if (!user) {
            throw new common_1.UnauthorizedException('No autenticado');
        }
        // System admins no pasan por verificación de permisos de tenant
        if (user.user_type === 'system_admin') {
            return true;
        }
        // Verificar que tengamos la info necesaria del JWT
        if (!user.company_id || !user.sub || !user.role) {
            throw new common_1.UnauthorizedException('Token inválido: falta información de contexto');
        }
        // Verificar permiso único
        if (requiredPermission) {
            const hasPermission = await this.tenantContextService.hasPermission(user.company_id, user.sub, user.role, requiredPermission);
            if (!hasPermission) {
                throw new common_1.ForbiddenException(`No tienes permiso para esta acción: ${requiredPermission}`);
            }
            return true;
        }
        // Verificar múltiples permisos
        if (requiredPermissions && requiredPermissions.length > 0) {
            let hasPermission;
            if (permissionsMode === 'all') {
                hasPermission = await this.tenantContextService.hasAllPermissions(user.company_id, user.sub, user.role, requiredPermissions);
            }
            else {
                // Default: 'any'
                hasPermission = await this.tenantContextService.hasAnyPermission(user.company_id, user.sub, user.role, requiredPermissions);
            }
            if (!hasPermission) {
                throw new common_1.ForbiddenException(`No tienes permisos suficientes para esta acción`);
            }
            return true;
        }
        return true;
    }
};
exports.TenantPermissionsGuard = TenantPermissionsGuard;
exports.TenantPermissionsGuard = TenantPermissionsGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector,
        tenant_context_service_1.TenantContextService])
], TenantPermissionsGuard);
