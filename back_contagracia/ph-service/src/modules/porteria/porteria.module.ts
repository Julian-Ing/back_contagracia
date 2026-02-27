import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { PorteriaController } from './porteria.controller';
import { PorteriaService } from './porteria.service';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [BillingModule, HttpModule, ConfigModule],
  controllers: [PorteriaController],
  providers: [PorteriaService],
  exports: [PorteriaService],
})
export class PorteriaModule {}
