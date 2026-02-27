import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TenantContextService } from '../tenant-context.service';
import {
  TENANT_PERMISSION_KEY,
  TENANT_PERMISSIONS_KEY,
  TENANT_PERMISSIONS_MODE_KEY,
} from '../decorators/require-permission.decorator';

@Injectable()
export class TenantPermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private tenantContextService: TenantContextService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Obtener permiso requerido del decorador
    const requiredPermission = this.reflector.getAllAndOverride<string>(
      TENANT_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      TENANT_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    const permissionsMode = this.reflector.getAllAndOverride<'any' | 'all'>(
      TENANT_PERMISSIONS_MODE_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Si no hay decorador de permisos, permitir acceso
    if (!requiredPermission && !requiredPermissions) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('No autenticado');
    }

    // System admins no pasan por verificación de permisos de tenant
    if (user.user_type === 'system_admin') {
      return true;
    }

    // Verificar que tengamos la info necesaria del JWT
    if (!user.company_id || !user.sub || !user.role) {
      throw new UnauthorizedException('Token inválido: falta información de contexto');
    }

    // Verificar permiso único
    if (requiredPermission) {
      const hasPermission = await this.tenantContextService.hasPermission(
        user.company_id,
        user.sub,
        user.role,
        requiredPermission,
      );

      if (!hasPermission) {
        throw new ForbiddenException(
          `No tienes permiso para esta acción: ${requiredPermission}`,
        );
      }
      return true;
    }

    // Verificar múltiples permisos
    if (requiredPermissions && requiredPermissions.length > 0) {
      let hasPermission: boolean;

      if (permissionsMode === 'all') {
        hasPermission = await this.tenantContextService.hasAllPermissions(
          user.company_id,
          user.sub,
          user.role,
          requiredPermissions,
        );
      } else {
        // Default: 'any'
        hasPermission = await this.tenantContextService.hasAnyPermission(
          user.company_id,
          user.sub,
          user.role,
          requiredPermissions,
        );
      }

      if (!hasPermission) {
        throw new ForbiddenException(
          `No tienes permisos suficientes para esta acción`,
        );
      }
      return true;
    }

    return true;
  }
}
