import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RedisService } from '../../modules/redis/redis.service';
import { RATE_LIMIT_KEY, RateLimitConfig } from '../decorators/rate-limit.decorator';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private redisService: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const rateLimitConfig = this.reflector.getAllAndOverride<RateLimitConfig>(
      RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Si no hay configuración de rate limit, permitir
    if (!rateLimitConfig) {
      return true;
    }

    // Si Redis no está disponible, permitir (modo degradado)
    if (!this.redisService.isRedisConnected()) {
      console.warn('⚠️ Rate limiting disabled: Redis not connected');
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const key = this.generateRateLimitKey(request, rateLimitConfig);

    const allowed = await this.redisService.checkRateLimit(
      key,
      rateLimitConfig.limit,
      rateLimitConfig.window,
    );

    if (!allowed) {
      const currentCount = await this.redisService.getRateLimitCount(key);

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `Demasiados intentos. Límite: ${rateLimitConfig.limit} requests por ${rateLimitConfig.window} segundos`,
          error: 'Too Many Requests',
          retryAfter: rateLimitConfig.window,
          currentCount,
          limit: rateLimitConfig.limit,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  /**
   * Generar key de Redis para rate limiting basado en IP o user
   */
  private generateRateLimitKey(
    request: any,
    config: RateLimitConfig,
  ): string {
    const prefix = config.keyPrefix || 'ratelimit';
    const ip = this.getClientIp(request);
    const route = request.route?.path || request.url;

    // Si hay usuario autenticado, usar user_id, sino usar IP
    const identifier = request.user?.sub || ip;

    return `${prefix}:${route}:${identifier}`;
  }

  /**
   * Obtener IP del cliente (considerando proxies)
   */
  private getClientIp(request: any): string {
    return (
      request.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      request.headers['x-real-ip'] ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      'unknown'
    );
  }
}
