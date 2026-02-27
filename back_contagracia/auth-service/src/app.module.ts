import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
// import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
// import { APP_GUARD } from '@nestjs/core';
import { AuthModule as SharedAuthModule, AuditModule, TenantContextModule, TenantContextService, TENANT_CONTEXT_SERVICE, RealtimeModule } from '@contagracia/shared-modules';
import { PrismaModule } from './modules/prisma/prisma.module';
import { PrismaService } from './modules/prisma/prisma.service';
import { RedisModule } from './modules/redis/redis.module';
import { RabbitMQModule } from './modules/rabbitmq/rabbitmq.module';
import { AuthModule } from './modules/auth/auth.module';
import { SessionsModule } from './modules/sessions/sessions.module';
import { PasswordsModule } from './modules/passwords/passwords.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { PermissionsWsModule } from './modules/permissions-ws/permissions-ws.module';
import { EmailModule } from './modules/email/email.module';
// UsersModule movido a company-service (gestión de usuarios de empresa)

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // ThrottlerModule.forRoot([
    //   {
    //     ttl: 60000, // 60 segundos
    //     limit: 10, // 10 requests por ventana (global default)
    //   },
    // ]),
    // TenantContextModule must be imported BEFORE AuthModule so that TENANT_CONTEXT_SERVICE provider is available
    TenantContextModule.forRoot({
      masterDatabaseUrl: process.env.DATABASE_MASTER_URL!,
    }),
    SharedAuthModule.forRoot(), // JWT + Guards globales
    AuditModule.forRoot({
      serviceName: 'auth-service',
      tenantPrismaService: TenantContextService,
      masterPrismaService: PrismaService,
    }),
    RealtimeModule,
    PrismaModule,
    RedisModule,
    RabbitMQModule,
    AuthModule,
    SessionsModule,
    PasswordsModule,
    CompaniesModule,
    PermissionsModule,
    PermissionsWsModule,
    EmailModule,
  ],
  controllers: [],
  providers: [
    // {
    //   provide: APP_GUARD,
    //   useClass: ThrottlerGuard,
    // },
    {
      provide: TENANT_CONTEXT_SERVICE,
      useExisting: TenantContextService,
    },
  ],
})
export class AppModule {}
