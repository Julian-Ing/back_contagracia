import { Module, forwardRef } from '@nestjs/common';
import { AutomationsController } from './automations.controller';
import { AutomationsService } from './automations.service';
import { AutomationEngineService } from './services/automation-engine.service';
import { TemplateVariablesService } from './services/template-variables.service';
import { EmailSenderService } from './services/email-sender.service';
import { ScheduledEventsService } from './services/scheduled-events.service';
import { ReminderSchedulerService } from './services/reminder-scheduler.service';
import { TenantModule } from '../tenant/tenant.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    forwardRef(() => TenantModule),
    PrismaModule,
  ],
  controllers: [AutomationsController],
  providers: [
    AutomationsService,
    AutomationEngineService,
    TemplateVariablesService,
    EmailSenderService,
    ScheduledEventsService,
    ReminderSchedulerService,
  ],
  exports: [
    AutomationsService,
    AutomationEngineService,
    TemplateVariablesService,
    EmailSenderService,
    ScheduledEventsService,
    ReminderSchedulerService,
  ],
})
export class AutomationsModule {}
