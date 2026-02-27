import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client-master';
/**
 * Servicio de Prisma para la base de datos MAESTRA
 * Gestiona: users, companies, plans, subscriptions
 */
export declare class PrismaMasterService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    constructor();
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
}
