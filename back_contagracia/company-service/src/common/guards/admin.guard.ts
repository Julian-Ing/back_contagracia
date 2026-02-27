import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { JwtPayload } from '@contagracia/shared-modules';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user: JwtPayload = request.user;

    if (!user) {
      throw new ForbiddenException('Usuario no autenticado');
    }

    // owner siempre tiene acceso admin
    if (user.user_type === 'owner') {
      return true;
    }

    // El rol y permisos se verifican en el servicio, aquí solo validamos que tenga company_id
    if (!user.company_id) {
      throw new ForbiddenException('No tienes una empresa activa');
    }

    return true;
  }
}
