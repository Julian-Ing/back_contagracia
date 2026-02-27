import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { join } from 'path';
import { AuthModule, AuditModule, TenantContextModule, TenantContextService, TENANT_CONTEXT_SERVICE } from '@contagracia/shared-modules';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './modules/prisma/prisma.module';
import { TenantModule } from './modules/tenant/tenant.module';
import { TenantPrismaService } from './modules/tenant/tenant-prisma.service';
import { StagesModule } from './modules/stages/stages.module';
import { TagsModule } from './modules/tags/tags.module';
import { ContactsModule } from './modules/contacts/contacts.module';
import { CampaignsModule } from './modules/campaigns/campaigns.module';
import { LeadsModule } from './modules/leads/leads.module';
import { OpportunitiesModule } from './modules/opportunities/opportunities.module';
import { ActivitiesModule } from './modules/activities/activities.module';
import { FormsModule } from './modules/forms/forms.module';
import { AutomationsModule } from './modules/automations/automations.module';
import { EmailModule } from './modules/email/email.module';
import { WhatsappModule } from './modules/whatsapp/whatsapp.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { TeamModule } from './modules/team/team.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: join(__dirname, '..', '.env'),
    }),
    EventEmitterModule.forRoot(), // Motor de eventos para automatizaciones
    ScheduleModule.forRoot(),     // Scheduler para cron jobs
    AuthModule.forRoot(), // JWT + Guards globales
    TenantContextModule.forRoot({
      masterDatabaseUrl: process.env.DATABASE_MASTER_URL!,
    }),
    AuditModule.forRoot({
      serviceName: 'crm-service',
      tenantPrismaService: TenantContextService,
    }),
    PrismaModule,
    TenantModule,
    StagesModule,
    TagsModule,
    ContactsModule,
    CampaignsModule,
    LeadsModule,
    OpportunitiesModule,
    ActivitiesModule,
    FormsModule,
    AutomationsModule,
    EmailModule,
    WhatsappModule,
    DashboardModule,
    TeamModule,
    IntegrationsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
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
