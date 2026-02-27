import { Injectable, OnModuleDestroy, Scope } from '@nestjs/common';
import { PrismaClient } from '@prisma/client-tenant';

/**
 * Servicio de Prisma para bases de datos TENANT (por empresa)
 * Gestiona: invoices, products, purchases, employees, etc.
 * 
 * Este servicio es REQUEST-SCOPED para permitir conexiones dinámicas
 * según la empresa del usuario autenticado
 */
@Injectable({ scope: Scope.REQUEST })
export class PrismaTenantService
    extends PrismaClient
    implements OnModuleDestroy {
    private static clientCache = new Map<string, PrismaClient>();

    constructor() {
        super();
    }

    /**
     * Obtiene o crea un Prisma Client para una empresa específica
     * @param databaseUrl - Connection string de la base de datos de la empresa
     */
    static getClient(databaseUrl: string): PrismaClient {
        if (!this.clientCache.has(databaseUrl)) {
            const client = new PrismaClient({
                datasources: {
                    db: {
                        url: databaseUrl,
                    },
                },
                log: ['query', 'info', 'warn', 'error'],
            });

            this.clientCache.set(databaseUrl, client);
            console.log(`✅ Created new Prisma Client for tenant: ${databaseUrl.split('@')[1]?.split('/')[0]}`);
        }

        return this.clientCache.get(databaseUrl)!;
    }

    /**
     * Limpia el cache de clientes (útil para testing)
     */
    static clearCache() {
        this.clientCache.forEach((client) => client.$disconnect());
        this.clientCache.clear();
    }

    async onModuleDestroy() {
        await this.$disconnect();
    }
}
