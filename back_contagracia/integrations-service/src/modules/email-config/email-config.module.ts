import { Module } from '@nestjs/common';
import { EmailConfigController } from './email-config.controller';
import { EmailConfigService } from './email-config.service';

@Module({
  controllers: [EmailConfigController],
  providers: [EmailConfigService],
  exports: [EmailConfigService],
})
export class EmailConfigModule {}
