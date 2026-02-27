import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

/**
 * Servicio de Redis para cache distribuido
 */
@Injectable()
export class RedisService {
    constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) { }

    /**
     * Obtener valor del cache
     */
    async get<T>(key: string): Promise<T | undefined> {
        return await this.cacheManager.get<T>(key);
    }

    /**
     * Guardar valor en cache
     * @param key - Clave
     * @param value - Valor
     * @param ttl - Tiempo de vida en segundos (default: 3600)
     */
    async set(key: string, value: any, ttl: number = 3600): Promise<void> {
        await this.cacheManager.set(key, value, ttl);
    }

    /**
     * Eliminar valor del cache
     */
    async del(key: string): Promise<void> {
        await this.cacheManager.del(key);
    }

    /**
     * Limpiar todo el cache
     */
    async reset(): Promise<void> {
        await this.cacheManager.reset();
    }

    /**
     * Cache de terceros por empresa
     */
    async getTercero(companyId: string, terceroId: string) {
        return this.get(`tercero:${companyId}:${terceroId}`);
    }

    async setTercero(companyId: string, terceroId: string, data: any) {
        return this.set(`tercero:${companyId}:${terceroId}`, data, 7200); // 2 horas
    }

    /**
     * Cache de productos por empresa
     */
    async getProduct(companyId: string, productId: string) {
        return this.get(`product:${companyId}:${productId}`);
    }

    async setProduct(companyId: string, productId: string, data: any) {
        return this.set(`product:${companyId}:${productId}`, data, 3600); // 1 hora
    }

    /**
     * Cache de configuraciones de empresa
     */
    async getCompanyConfig(companyId: string) {
        return this.get(`company:config:${companyId}`);
    }

    async setCompanyConfig(companyId: string, data: any) {
        return this.set(`company:config:${companyId}`, data, 1800); // 30 minutos
    }
}
