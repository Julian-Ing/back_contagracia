import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule, AuditModule, TenantContextModule, TenantContextService, TENANT_CONTEXT_SERVICE, RealtimeModule } from '@contagracia/shared-modules';
import { PrismaModule } from './modules/prisma/prisma.module';
import { TenantModule } from './modules/tenant/tenant.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { TenantUsersModule } from './modules/tenant-users/tenant-users.module';
import { TenantPrismaService } from './modules/tenant-users/tenant-prisma.service';
import { InternalModule } from './modules/internal/internal.module';
import { ThirdPartiesModule } from './modules/third-parties/third-parties.module';
import { ConsecutiveModule } from './modules/consecutives/consecutive.module';
import { CatalogsModule } from './modules/catalogs/catalogs.module';

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
      serviceName: 'company-service',
      tenantPrismaService: TenantContextService,
    }),
    RealtimeModule,
    PrismaModule,
    TenantModule,
    CompaniesModule,
    TenantUsersModule,
    InternalModule,
    ThirdPartiesModule,
    ConsecutiveModule,
    CatalogsModule,
  ],
  controllers: [],
  providers: [
    TenantPrismaService,
    {
      provide: 'TENANT_PRISMA_SERVICE',
      useExisting: TenantPrismaService,
    },
    {
      provide: TENANT_CONTEXT_SERVICE,
      useExisting: TenantContextService,
    },
  ],
})
export class AppModule {}
