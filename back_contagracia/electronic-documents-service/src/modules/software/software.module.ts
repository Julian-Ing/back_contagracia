import { Module } from '@nestjs/common';
import { DianApiService } from '@contagracia/shared-modules';
import { SoftwareController } from './software.controller';
import { SoftwareService } from './software.service';

@Module({
  controllers: [SoftwareController],
  providers: [SoftwareService, DianApiService],
  exports: [SoftwareService],
})
export class SoftwareModule {}
