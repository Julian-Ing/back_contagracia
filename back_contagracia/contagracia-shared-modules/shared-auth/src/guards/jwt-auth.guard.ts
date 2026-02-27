import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

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
 * Guard de autenticación JWT usando Passport
 *
 * Características:
 * - Valida token JWT automáticamente via JwtStrategy
 * - Soporta rutas públicas con @Public() decorator
 * - Manejo de errores consistente
 * - Obtiene Reflector dinámicamente para evitar dual-package issues
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private _reflector: any;

  constructor(reflector?: any) {
    super();
    this._reflector = reflector;
  }

  private getReflector(): any {
    if (!this._reflector) {
      this._reflector = getHostReflector();
    }
    return this._reflector;
  }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const reflector = this.getReflector();

    // Si no hay reflector, continuar con validación JWT normal
    if (!reflector) {
      return super.canActivate(context);
    }

    // Verificar si la ruta es pública
    const isPublic = reflector.getAllAndOverride(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      if (info?.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Token expirado');
      }
      if (info?.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Token inválido');
      }
      throw err || new UnauthorizedException('No autorizado');
    }
    return user;
  }
}
