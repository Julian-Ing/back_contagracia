import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './modules/prisma/prisma.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { EmailConfigModule } from './modules/email-config/email-config.module';
import { EmailTemplatesModule } from './modules/email-templates/email-templates.module';
import { AIModule } from './modules/ai/ai.module';
import { TwilioModule } from './modules/twilio/twilio.module';
import { AuthModule, AuditModule, TenantContextModule, TenantContextService, TENANT_CONTEXT_SERVICE } from '@contagracia/shared-modules';

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
    PrismaModule,
    IntegrationsModule,
    EmailConfigModule,
    EmailTemplatesModule,
    AIModule,
    TwilioModule,
    AuditModule.forRoot({
      serviceName: 'integrations-service',
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
