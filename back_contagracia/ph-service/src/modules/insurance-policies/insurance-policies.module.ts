import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { InsurancePoliciesController } from './insurance-policies.controller';
import { InsurancePoliciesService } from './insurance-policies.service';
import { PolicyReminderService } from './jobs/policy-reminder.service';
import { PolicyReminderJob } from './jobs/policy-reminder.job';

@Module({
  imports: [HttpModule, ScheduleModule.forRoot()],
  controllers: [InsurancePoliciesController],
  providers: [
    InsurancePoliciesService,
    PolicyReminderService,
    PolicyReminderJob,
  ],
  exports: [InsurancePoliciesService],
})
export class InsurancePoliciesModule {}
