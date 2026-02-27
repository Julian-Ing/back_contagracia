import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PqrsController } from './pqrs.controller';
import { PqrsService } from './pqrs.service';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [BillingModule, HttpModule],
  controllers: [PqrsController],
  providers: [PqrsService],
  exports: [PqrsService],
})
export class PqrsModule {}
