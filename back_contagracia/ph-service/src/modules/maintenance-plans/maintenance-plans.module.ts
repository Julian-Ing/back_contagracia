import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { MaintenancePlansController } from './maintenance-plans.controller';
import { MaintenancePlansService } from './maintenance-plans.service';
import { MaintenanceReminderService } from './jobs/maintenance-reminder.service';
import { MaintenanceReminderJob } from './jobs/maintenance-reminder.job';

@Module({
  imports: [HttpModule, ScheduleModule.forRoot()],
  controllers: [MaintenancePlansController],
  providers: [
    MaintenancePlansService,
    MaintenanceReminderService,
    MaintenanceReminderJob,
  ],
  exports: [MaintenancePlansService],
})
export class MaintenancePlansModule {}
