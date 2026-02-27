import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
  AuthModule,
  AuditModule,
  TenantContextModule,
  TenantContextService,
  TENANT_CONTEXT_SERVICE,
  DianApiModule,
} from '@contagracia/shared-modules';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CertificateModule } from './modules/certificate/certificate.module';
import { SoftwareModule } from './modules/software/software.module';
import { EnvironmentModule } from './modules/environment/environment.module';
import { RutModule } from './modules/rut/rut.module';
import { ResolutionsModule } from './modules/resolutions/resolutions.module';
import { TypeDocumentsModule } from './modules/type-documents/type-documents.module';
import { TestSetModule } from './modules/test-set/test-set.module';

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
    DianApiModule, // Global module for DIAN API integration
    AuthModule.forRoot(), // JWT + Guards globales
    AuditModule.forRoot({
      serviceName: 'electronic-documents-service',
      tenantPrismaService: TenantContextService,
    }),
    CertificateModule,
    SoftwareModule,
    EnvironmentModule,
    RutModule,
    ResolutionsModule,
    TypeDocumentsModule,
    TestSetModule,
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
