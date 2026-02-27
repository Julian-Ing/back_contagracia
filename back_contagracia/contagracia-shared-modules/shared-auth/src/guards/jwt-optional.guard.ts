import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard JWT opcional - intenta autenticar pero no falla si el token es inválido/expirado
 * Útil para endpoints como logout donde queremos funcionar aunque el token haya expirado
 */
@Injectable()
export class JwtOptionalGuard extends AuthGuard('jwt') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      // Intenta activar el guard padre, pero captura cualquier error
      await super.canActivate(context);
    } catch {
      // Si falla (token expirado/inválido), simplemente continúa sin usuario
      // El request.user quedará undefined
    }
    return true; // Siempre permite pasar
  }

  handleRequest(err: any, user: any) {
    // Si hay error o no hay usuario, simplemente retorna null en lugar de lanzar excepción
    if (err || !user) {
      return null;
    }
    return user;
  }
}
