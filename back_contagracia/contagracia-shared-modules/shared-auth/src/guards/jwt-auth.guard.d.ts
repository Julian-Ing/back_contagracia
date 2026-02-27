import { CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
/**
 * Guard de autenticación JWT con validaciones de seguridad
 *
 * Valida:
 * 1. Token JWT válido y no expirado
 * 2. Sesión no revocada (kill-switch individual)
 * 3. Sesión no afectada por kill-switch global del usuario
 * 4. Actualiza last_activity cada 5 minutos (throttled)
 */
export declare class JwtAuthGuard implements CanActivate {
    private jwtService;
    private redisService?;
    private prismaService?;
    constructor(jwtService: JwtService, redisService?: any, prismaService?: any);
    canActivate(context: ExecutionContext): Promise<boolean>;
    private extractTokenFromHeader;
    /**
     * Determinar si se debe actualizar last_activity (throttle: cada 5 min)
     */
    private shouldUpdateActivity;
    /**
     * Actualizar last_activity de la sesión (async, no bloquea el request)
     */
    private updateLastActivity;
}
