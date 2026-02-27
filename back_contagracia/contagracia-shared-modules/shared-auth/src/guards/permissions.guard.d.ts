import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
/**
 * Guard que valida permisos granulares basados en acciones
 * Lee los metadatos de @RequirePermissions y @RequireAnyPermission
 * y verifica contra el JWT del usuario
 */
export declare class PermissionsGuard implements CanActivate {
    private reflector;
    constructor(reflector: Reflector);
    canActivate(context: ExecutionContext): boolean;
}
