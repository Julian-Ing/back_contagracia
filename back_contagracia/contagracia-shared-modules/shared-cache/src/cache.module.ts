import { Module, Global } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-store';
import { RedisService } from './redis.service';

/**
 * Parsea REDIS_URL para extraer host, port, username y password
 */
function parseRedisUrl(url: string) {
    try {
        const parsed = new URL(url);
        return {
            host: parsed.hostname,
            port: parseInt(parsed.port) || 6379,
            username: parsed.username || undefined,
            password: parsed.password || undefined,
        };
    } catch {
        return { host: 'localhost', port: 6379 };
    }
}

/**
 * Módulo global de cache con Redis
 */
@Global()
@Module({
    imports: [
        NestCacheModule.registerAsync({
            useFactory: async () => {
                const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
                const config = parseRedisUrl(redisUrl);
                return {
                    store: redisStore as any,
                    host: config.host,
                    port: config.port,
                    username: config.username,
                    password: config.password,
                    ttl: 3600, // Default TTL: 1 hora
                };
            },
        }),
    ],
    providers: [RedisService],
    exports: [RedisService, NestCacheModule],
})
export class CacheModule { }
