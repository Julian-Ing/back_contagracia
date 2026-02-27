import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

interface PermissionCache {
  role: {
    role_key: string;
    role_name: string;
  };
  subscription: {
    plan_id: string;
    plan_name: string;
    status: string;
  };
  modules: string[];
  actions: string[];
}

@Injectable()
export class RedisService implements OnModuleDestroy {
  private client: RedisClientType;
  private isConnected = false;
  private hasLoggedError = false;

  constructor(private configService: ConfigService) {
    this.initializeClient();
  }

  private async initializeClient() {
    const redisUrl = this.configService.get<string>('REDIS_URL') || 'redis://localhost:6379';
    const isDevelopment = this.configService.get<string>('NODE_ENV') !== 'production';

    this.client = createClient({
      url: redisUrl,
    });

    this.client.on('error', (err) => {
      // En desarrollo, solo loguear el primer error
      if (!isDevelopment || !this.hasLoggedError) {
        console.warn('⚠️ Redis not available (running in degraded mode)');
        this.hasLoggedError = true;
      }
      this.isConnected = false;
    });

    this.client.on('connect', () => {
      console.log('✅ Redis Client Connected');
      this.isConnected = true;
      this.hasLoggedError = false;
    });

    try {
      await this.client.connect();
    } catch (error) {
      // En desarrollo, solo mostrar mensaje informativo
      if (!this.hasLoggedError) {
        if (isDevelopment) {
          console.warn('⚠️ Redis not available (running in degraded mode)');
        } else {
          console.error('Failed to connect to Redis:', error);
        }
        this.hasLoggedError = true;
      }
      this.isConnected = false;
    }
  }

  async onModuleDestroy() {
    if (this.isConnected) {
      await this.client.quit();
    }
  }

  // ===== KILL-SWITCH DE SESIONES =====

  /**
   * Revocar una sesión específica (kill-switch)
   */
  async revokeSession(sessionId: string): Promise<void> {
    if (!this.isConnected) return;

    const key = `session:revoked:${sessionId}`;
    await this.client.set(key, 'true', {
      EX: 3600, // 1 hora (tiempo de vida del access token)
    });
  }

  /**
   * Revocar todas las sesiones de un usuario (kill-switch)
   */
  async revokeAllUserSessions(userId: string): Promise<void> {
    if (!this.isConnected) return;

    const key = `user:sessions:killed:${userId}`;
    const timestamp = Date.now().toString();
    await this.client.set(key, timestamp, {
      EX: 3600, // 1 hora
    });
  }

  /**
   * Verificar si una sesión está revocada
   */
  async isSessionRevoked(sessionId: string): Promise<boolean> {
    if (!this.isConnected) return false;

    const key = `session:revoked:${sessionId}`;
    const value = await this.client.get(key);
    return value === 'true';
  }

  /**
   * Verificar si todas las sesiones del usuario fueron eliminadas
   */
  async areAllUserSessionsKilled(userId: string, sessionCreatedAt: Date): Promise<boolean> {
    if (!this.isConnected) return false;

    const key = `user:sessions:killed:${userId}`;
    const killedTimestamp = await this.client.get(key);

    if (!killedTimestamp || typeof killedTimestamp !== 'string') return false;

    // Si la sesión fue creada ANTES del kill-switch, está revocada
    return sessionCreatedAt.getTime() < parseInt(killedTimestamp, 10);
  }

  // ===== CACHE DE PERMISOS =====

  /**
   * Cachear permisos de un usuario en una compañía
   */
  async cacheUserPermissions(
    userId: string,
    companyId: string,
    data: PermissionCache,
  ): Promise<void> {
    if (!this.isConnected) return;

    const key = `user:permissions:${userId}:${companyId}`;
    await this.client.set(key, JSON.stringify(data), {
      EX: 900, // 15 minutos
    });
  }

  /**
   * Obtener permisos cacheados de un usuario
   */
  async getUserPermissions(
    userId: string,
    companyId: string,
  ): Promise<PermissionCache | null> {
    if (!this.isConnected) return null;

    const key = `user:permissions:${userId}:${companyId}`;
    const data = await this.client.get(key);

    if (!data || typeof data !== 'string') return null;

    try {
      return JSON.parse(data);
    } catch (error) {
      console.error('Error parsing cached permissions:', error);
      return null;
    }
  }

  /**
   * Invalidar permisos cacheados de un usuario
   */
  async invalidateUserPermissions(userId: string, companyId: string): Promise<void> {
    if (!this.isConnected) return;

    const key = `user:permissions:${userId}:${companyId}`;
    await this.client.del(key);
  }

  /**
   * Invalidar permisos de todos los usuarios de una compañía
   */
  async invalidateCompanyPermissions(companyId: string): Promise<void> {
    if (!this.isConnected) return;

    const pattern = `user:permissions:*:${companyId}`;
    const keys = await this.client.keys(pattern);

    if (keys.length > 0) {
      await this.client.del(keys);
    }
  }

  // ===== RATE LIMITING =====

  /**
   * Verificar rate limit (ejemplo: 5 intentos por 15 minutos)
   */
  async checkRateLimit(
    key: string,
    limit: number,
    windowSeconds: number,
  ): Promise<boolean> {
    if (!this.isConnected) return true; // Si Redis no está disponible, permitir

    const currentCount = await this.client.incr(key);

    if (currentCount === 1) {
      await this.client.expire(key, windowSeconds);
    }

    return currentCount <= limit;
  }

  /**
   * Obtener contador de rate limit
   */
  async getRateLimitCount(key: string): Promise<number> {
    if (!this.isConnected) return 0;

    const count = await this.client.get(key);
    return count && typeof count === 'string' ? parseInt(count, 10) : 0;
  }

  /**
   * Resetear rate limit
   */
  async resetRateLimit(key: string): Promise<void> {
    if (!this.isConnected) return;

    await this.client.del(key);
  }

  // ===== MÉTODOS AUXILIARES =====

  /**
   * Verificar si Redis está conectado
   */
  isRedisConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Ping a Redis para verificar conectividad
   */
  async ping(): Promise<string> {
    if (!this.isConnected) return 'DISCONNECTED';

    try {
      return await this.client.ping();
    } catch (error) {
      return 'ERROR';
    }
  }
}
