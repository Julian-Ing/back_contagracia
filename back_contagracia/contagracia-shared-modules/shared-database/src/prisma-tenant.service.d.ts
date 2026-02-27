import { OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client-tenant';
/**
 * Servicio de Prisma para bases de datos TENANT (por empresa)
 * Gestiona: invoices, products, purchases, employees, etc.
 *
 * Este servicio es REQUEST-SCOPED para permitir conexiones dinámicas
 * según la empresa del usuario autenticado
 */
export declare class PrismaTenantService extends PrismaClient implements OnModuleDestroy {
    private static clientCache;
    constructor();
    /**
     * Obtiene o crea un Prisma Client para una empresa específica
     * @param databaseUrl - Connection string de la base de datos de la empresa
     */
    static getClient(databaseUrl: string): PrismaClient;
    /**
     * Limpia el cache de clientes (útil para testing)
     */
    static clearCache(): void;
    onModuleDestroy(): Promise<void>;
}
