import { Module, Global, DynamicModule } from '@nestjs/common';
import { TenantContextService } from './tenant-context.service';
import { TenantPermissionsGuard } from './guards/tenant-permissions.guard';

/** Token para inyectar TenantContextService en guards externos (ej: PermissionsGuard) */
const TENANT_CONTEXT_SERVICE = 'TENANT_CONTEXT_SERVICE';

export interface TenantContextModuleOptions {
  /** URL de la base de datos maestra */
  masterDatabaseUrl: string;
  /** TTL en ms para cache de conexiones (default: 5 min) */
  connectionCacheTtl?: number;
}

@Global()
@Module({})
export class TenantContextModule {
  static forRoot(options: TenantContextModuleOptions): DynamicModule {
    return {
      module: TenantContextModule,
      providers: [
        {
          provide: 'TENANT_CONTEXT_OPTIONS',
          useValue: {
            masterDatabaseUrl: options.masterDatabaseUrl,
            connectionCacheTtl: options.connectionCacheTtl ?? 5 * 60 * 1000, // 5 min default
          },
        },
        TenantContextService,
        // Proveer token para PermissionsGuard
        {
          provide: TENANT_CONTEXT_SERVICE,
          useExisting: TenantContextService,
        },
      ],
      exports: [TenantContextService, TENANT_CONTEXT_SERVICE],
    };
  }
}
