import { Module, Global, DynamicModule, Type, Provider } from '@nestjs/common';
import { AuditLoggingInterceptor } from './interceptors/audit-logging.interceptor';

export interface AuditModuleConfig {
  serviceName: string;
  /**
   * Clase del servicio que implementa getClientForCompany(companyId): Promise<PrismaClient>
   * Si se proporciona, se usará para persistir los logs de auditoría en la BD del tenant
   */
  tenantPrismaService?: Type<any>;
  /**
   * Clase del PrismaService de master para buscar company_id por NIT
   * Útil para auth-service donde el login tiene NIT pero no JWT aún
   */
  masterPrismaService?: Type<any>;
}

// Resolve APP_INTERCEPTOR and Reflector from the host service's @nestjs/core
// to avoid pnpm dual-package issues between workspaces
function getCoreTokens() {
  // Walk up from the calling service's node_modules to find @nestjs/core
  // This ensures we get the same instance NestJS uses internally
  const core = require(require.resolve('@nestjs/core', {
    paths: [process.cwd()],
  }));
  return {
    APP_INTERCEPTOR: core.APP_INTERCEPTOR,
    Reflector: core.Reflector,
  };
}

@Global()
@Module({})
export class AuditModule {
  static forRoot(config: AuditModuleConfig): DynamicModule {
    const { APP_INTERCEPTOR, Reflector } = getCoreTokens();

    const providers: Provider[] = [
      {
        provide: 'AUDIT_REFLECTOR',
        useFactory: () => new Reflector(),
      },
      {
        provide: 'AUDIT_CONFIG',
        useValue: { serviceName: config.serviceName },
      },
      AuditLoggingInterceptor,
      {
        provide: APP_INTERCEPTOR,
        useExisting: AuditLoggingInterceptor,
      },
    ];

    // Si se proporciona un servicio de tenant, registrarlo como TENANT_PRISMA_SERVICE
    if (config.tenantPrismaService) {
      providers.push({
        provide: 'TENANT_PRISMA_SERVICE',
        useExisting: config.tenantPrismaService,
      });
    }

    // Si se proporciona un servicio de master, registrarlo para lookup de company por NIT
    if (config.masterPrismaService) {
      providers.push({
        provide: 'MASTER_PRISMA_SERVICE',
        useExisting: config.masterPrismaService,
      });
    }

    return {
      module: AuditModule,
      providers,
      exports: [AuditLoggingInterceptor],
    };
  }
}
