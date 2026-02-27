import { Module } from '@nestjs/common';
import { EmployeeObservationsController } from './employee-observations.controller';
import { EmployeeObservationsService } from './employee-observations.service';

@Module({
  controllers: [EmployeeObservationsController],
  providers: [EmployeeObservationsService],
  exports: [EmployeeObservationsService],
})
export class EmployeeObservationsModule {}
