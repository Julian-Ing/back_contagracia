import { Module, Global } from '@nestjs/common';
import { DianApiService } from './dian-api.service';

@Global()
@Module({
  providers: [DianApiService],
  exports: [DianApiService],
})
export class DianApiModule {}
