import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { CommonAreasController } from './common-areas.controller';
import { CommonAreasService } from './common-areas.service';
import { ReservationReminderService } from './jobs/reservation-reminder.service';
import { ReservationReminderJob } from './jobs/reservation-reminder.job';

@Module({
  imports: [HttpModule, ScheduleModule.forRoot()],
  controllers: [CommonAreasController],
  providers: [
    CommonAreasService,
    ReservationReminderService,
    ReservationReminderJob,
  ],
  exports: [CommonAreasService],
})
export class CommonAreasModule {}
