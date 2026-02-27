import { DynamicModule } from '@nestjs/common';
export interface TenantContextModuleOptions {
    /** URL de la base de datos maestra */
    masterDatabaseUrl: string;
    /** TTL en ms para cache de conexiones (default: 5 min) */
    connectionCacheTtl?: number;
}
export declare class TenantContextModule {
    static forRoot(options: TenantContextModuleOptions): DynamicModule;
}
