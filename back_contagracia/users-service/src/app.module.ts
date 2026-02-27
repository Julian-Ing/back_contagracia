import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule, AuditModule, TenantContextModule, TenantContextService, RealtimeModule, TENANT_CONTEXT_SERVICE } from '@contagracia/shared-modules';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // TenantContextModule must be imported BEFORE AuthModule so that TENANT_CONTEXT_SERVICE provider is available
    TenantContextModule.forRoot({
      masterDatabaseUrl: process.env.DATABASE_MASTER_URL!,
    }),
    AuthModule.forRoot(), // JWT + Guards globales
    AuditModule.forRoot({
      serviceName: 'users-service',
      tenantPrismaService: TenantContextService,
    }),
    RealtimeModule,
    UsersModule,
    RolesModule,
  ],
  providers: [
    {
      provide: TENANT_CONTEXT_SERVICE,
      useExisting: TenantContextService,
    },
  ],
})
export class AppModule {}
