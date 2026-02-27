import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
  AuthModule,
  AuditModule,
  TenantContextModule,
  TenantContextService,
  TENANT_CONTEXT_SERVICE,
} from '@contagracia/shared-modules';
import { PrismaModule } from './modules/prisma/prisma.module';
import { MediaModule } from './modules/media/media.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TenantContextModule.forRoot({
      masterDatabaseUrl: process.env.DATABASE_MASTER_URL!,
    }),
    AuthModule.forRoot(),
    PrismaModule,
    MediaModule,
    AuditModule.forRoot({
      serviceName: 'media-service',
      tenantPrismaService: TenantContextService,
    }),
  ],
  providers: [
    {
      provide: TENANT_CONTEXT_SERVICE,
      useExisting: TenantContextService,
    },
  ],
})
export class AppModule {}
