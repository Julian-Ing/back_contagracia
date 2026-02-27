import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
  AuthModule,
  AuditModule,
  TenantContextModule,
  TenantContextService,
  TENANT_CONTEXT_SERVICE,
} from '@contagracia/shared-modules';
import { AppController } from './app.controller';
import { AppService } from './app.service';

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
      serviceName: 'reports-service',
      tenantPrismaService: TenantContextService,
    }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: TENANT_CONTEXT_SERVICE,
      useExisting: TenantContextService,
    },
  ],
})
export class AppModule {}
