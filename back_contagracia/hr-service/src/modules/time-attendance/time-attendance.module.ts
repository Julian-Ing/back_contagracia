import { Module } from '@nestjs/common';
import { TimeAttendanceController } from './time-attendance.controller';
import { TimeAttendanceService } from './time-attendance.service';
import { ColombianHolidaysService } from './colombian-holidays.service';

@Module({
  controllers: [TimeAttendanceController],
  providers: [TimeAttendanceService, ColombianHolidaysService],
  exports: [TimeAttendanceService, ColombianHolidaysService],
})
export class TimeAttendanceModule {}
