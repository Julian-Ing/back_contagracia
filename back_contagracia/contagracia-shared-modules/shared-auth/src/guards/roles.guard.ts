import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

// Obtener Reflector del host service dinámicamente
function getHostReflector(): any {
  try {
    const core = require(require.resolve('@nestjs/core', { paths: [process.cwd()] }));
    return new core.Reflector();
  } catch {
    return null;
  }
}

/**
 * Guard de roles
 * Valida que el usuario tenga los roles necesarios
 * Obtiene Reflector dinámicamente para evitar dual-package issues
 */
@Injectable()
export class RolesGuard implements CanActivate {
  private _reflector: any;

  constructor(reflector?: any) {
    this._reflector = reflector;
  }

  private getReflector(): any {
    if (!this._reflector) {
      this._reflector = getHostReflector();
    }
    return this._reflector;
  }

  canActivate(context: ExecutionContext): boolean {
    const reflector = this.getReflector();

    if (!reflector) {
      return true; // Sin reflector, permitir acceso
    }

    const requiredRoles = reflector.get('roles', context.getHandler());

    if (!requiredRoles) {
      return true; // No se requieren roles específicos
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.roles) {
      throw new ForbiddenException('User roles not found');
    }

    const hasRole = requiredRoles.some((role: string) => user.roles.includes(role));

    if (!hasRole) {
      throw new ForbiddenException(`Required roles: ${requiredRoles.join(', ')}`);
    }

    return true;
  }
}
