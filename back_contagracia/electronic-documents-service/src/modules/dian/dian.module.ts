import { Module } from '@nestjs/common';
import { DianApiService } from '@contagracia/shared-modules';

@Module({
  providers: [DianApiService],
  exports: [DianApiService],
})
export class DianModule {}
