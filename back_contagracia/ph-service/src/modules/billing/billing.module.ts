import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { BillingEmailService } from './email.service';

@Module({
  controllers: [BillingController],
  providers: [BillingService, BillingEmailService],
  exports: [BillingService, BillingEmailService],
})
export class BillingModule {}
