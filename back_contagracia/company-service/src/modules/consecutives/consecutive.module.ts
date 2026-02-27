import { Module } from '@nestjs/common';
import { ConsecutiveService } from './consecutive.service';
import { ConsecutiveController } from './consecutive.controller';

@Module({
  controllers: [ConsecutiveController],
  providers: [ConsecutiveService],
  exports: [ConsecutiveService],
})
export class ConsecutiveModule {}
