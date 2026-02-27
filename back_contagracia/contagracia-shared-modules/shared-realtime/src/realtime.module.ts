import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RealtimePublisherService } from './realtime-publisher.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [RealtimePublisherService],
  exports: [RealtimePublisherService],
})
export class RealtimeModule {}
