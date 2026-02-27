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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PermissionsGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
/**
 * Guard que valida permisos granulares basados en acciones
 * Lee los metadatos de @RequirePermissions y @RequireAnyPermission
 * y verifica contra el JWT del usuario
 */
let PermissionsGuard = class PermissionsGuard {
    constructor(reflector) {
        this.reflector = reflector;
    }
    canActivate(context) {
        // Leer metadata de permisos requeridos (AND logic)
        const requiredPermissions = this.reflector.getAllAndOverride('required_permissions', [context.getHandler(), context.getClass()]);
        // Leer metadata de permisos requeridos (OR logic)
        const requiredAnyPermission = this.reflector.getAllAndOverride('required_any_permission', [context.getHandler(), context.getClass()]);
        // Si no hay permisos requeridos, permitir acceso
        if (!requiredPermissions && !requiredAnyPermission) {
            return true;
        }
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        if (!user) {
            throw new common_1.ForbiddenException('Usuario no autenticado');
        }
        // Usuario tipo "owner" (sin company_id) tiene acceso a todo en CMS
        // pero NO tiene acceso a rutas de empresa que requieren permisos
        if (user.user_type === 'owner') {
            // Si la ruta requiere permisos de empresa, denegar
            if (requiredPermissions || requiredAnyPermission) {
                throw new common_1.ForbiddenException('Debes seleccionar una empresa para realizar esta acción');
            }
            return true;
        }
        // Usuario tipo "company_user" - verificar permisos en JWT
        const userActions = user.permissions?.actions || [];
        // Lógica AND: Usuario debe tener TODAS las acciones requeridas
        if (requiredPermissions && requiredPermissions.length > 0) {
            const hasAllPermissions = requiredPermissions.every((action) => userActions.includes(action));
            if (!hasAllPermissions) {
                const missingPermissions = requiredPermissions.filter((action) => !userActions.includes(action));
                throw new common_1.ForbiddenException(`No tienes permiso para realizar esta acción. Permisos faltantes: ${missingPermissions.join(', ')}`);
            }
        }
        // Lógica OR: Usuario debe tener AL MENOS UNA de las acciones
        if (requiredAnyPermission && requiredAnyPermission.length > 0) {
            const hasAnyPermission = requiredAnyPermission.some((action) => userActions.includes(action));
            if (!hasAnyPermission) {
                throw new common_1.ForbiddenException(`No tienes permiso para realizar esta acción. Se requiere al menos uno de: ${requiredAnyPermission.join(', ')}`);
            }
        }
        return true;
    }
};
exports.PermissionsGuard = PermissionsGuard;
exports.PermissionsGuard = PermissionsGuard = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(core_1.Reflector)),
    __metadata("design:paramtypes", [core_1.Reflector])
], PermissionsGuard);
