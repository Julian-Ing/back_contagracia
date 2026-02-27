import { Module, Global } from '@nestjs/common';
import { PrismaMasterService } from './prisma-master.service';
import { PrismaTenantService } from './prisma-tenant.service';

/**
 * Módulo global de base de datos
 * Proporciona servicios de Prisma para DB maestra y tenant
 */
@Global()
@Module({
    providers: [PrismaMasterService, PrismaTenantService],
    exports: [PrismaMasterService, PrismaTenantService],
})
export class DatabaseModule { }
