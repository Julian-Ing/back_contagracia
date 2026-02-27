import { Module } from '@nestjs/common';
import { SystemActionsController } from './system-actions.controller';
import { SystemActionsService } from './system-actions.service';

@Module({
  controllers: [SystemActionsController],
  providers: [SystemActionsService],
  exports: [SystemActionsService],
})
export class SystemActionsModule {}
