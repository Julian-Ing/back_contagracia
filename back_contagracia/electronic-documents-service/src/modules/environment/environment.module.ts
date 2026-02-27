import { Module } from '@nestjs/common';
import { DianApiService } from '@contagracia/shared-modules';
import { EnvironmentController } from './environment.controller';
import { EnvironmentService } from './environment.service';

@Module({
  controllers: [EnvironmentController],
  providers: [EnvironmentService, DianApiService],
  exports: [EnvironmentService],
})
export class EnvironmentModule {}
