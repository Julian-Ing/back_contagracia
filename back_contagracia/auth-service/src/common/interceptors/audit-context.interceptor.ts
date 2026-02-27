import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';

/**
 * Interceptor que captura y agrega información de auditoría al request
 * - IP address del cliente
 * - User agent (browser/device)
 * - Session ID (si está disponible en el JWT)
 *
 * Los datos quedan disponibles en request.auditContext para ser usados
 * por el servicio de auditoría
 */
@Injectable()
export class AuditContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    // Capturar IP address (considerar proxies)
    const ipAddress =
      request.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      request.headers['x-real-ip'] ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      request.ip ||
      'unknown';

    // Capturar User Agent
    const userAgent = request.headers['user-agent'] || 'unknown';

    // Extraer session ID del JWT si está disponible
    const sessionId = request.user?.session_id || null;

    // Extraer user ID si está disponible
    const userId = request.user?.sub || null;

    // Agregar al request para que esté disponible en servicios
    request.auditContext = {
      ipAddress,
      userAgent,
      sessionId,
      userId,
      timestamp: new Date(),
    };

    return next.handle();
  }
}
