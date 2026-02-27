import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client-master';

/**
 * Servicio de Prisma para la base de datos MAESTRA
 * Gestiona: users, companies, plans, subscriptions
 */
@Injectable()
export class PrismaMasterService
    extends PrismaClient
    implements OnModuleInit, OnModuleDestroy {
    constructor() {
        super({
            datasources: {
                db: {
                    url: process.env.DATABASE_MASTER_URL,
                },
            },
            log: ['query', 'info', 'warn', 'error'],
        });
    }

    async onModuleInit() {
        await this.$connect();
        console.log('✅ Connected to MASTER database');
    }

    async onModuleDestroy() {
        await this.$disconnect();
        console.log('❌ Disconnected from MASTER database');
    }
}
