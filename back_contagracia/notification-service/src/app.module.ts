import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './modules/prisma/prisma.module.js';
import { BroadcastModule } from './modules/broadcast/broadcast.module.js';
import { CompanyNotificationsModule } from './modules/company-notifications/company-notifications.module.js';
import { AuthModule, AuditModule, TenantContextModule, TenantContextService, TENANT_CONTEXT_SERVICE, RealtimeModule } from '@contagracia/shared-modules';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(), // Cron jobs
    TenantContextModule.forRoot({
      masterDatabaseUrl: process.env.DATABASE_MASTER_URL!,
    }),
    AuthModule.forRoot(), // JWT + Guards globales
    RealtimeModule, // Redis Pub/Sub para notificaciones en tiempo real
    PrismaModule,
    BroadcastModule,
    CompanyNotificationsModule,
    AuditModule.forRoot({
      serviceName: 'notification-service',
      tenantPrismaService: TenantContextService,
    }),
  ],
  controllers: [],
  providers: [
    {
      provide: TENANT_CONTEXT_SERVICE,
      useExisting: TenantContextService,
    },
  ],
})
export class AppModule {}
