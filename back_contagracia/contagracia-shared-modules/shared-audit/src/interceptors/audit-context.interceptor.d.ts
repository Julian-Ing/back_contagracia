import { NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
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
export declare class AuditContextInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<any>;
}
