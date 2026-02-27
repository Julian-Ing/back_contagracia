import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_KEY = 'rate_limit';

export interface RateLimitConfig {
  limit: number; // Número máximo de requests
  window: number; // Ventana de tiempo en segundos
  keyPrefix?: string; // Prefijo personalizado para la key de Redis
}

/**
 * Decorator para aplicar rate limiting a un endpoint
 *
 * @example
 * @RateLimit({ limit: 5, window: 900 }) // 5 intentos por 15 minutos
 * @Post('login')
 * async login(@Body() loginDto: LoginDto) { ... }
 */
export const RateLimit = (config: RateLimitConfig) =>
  SetMetadata(RATE_LIMIT_KEY, config);
