import { Module } from '@nestjs/common';
import { CompanyPaymentMethodsController } from './company-payment-methods.controller';
import { CompanyPaymentMethodsService } from './company-payment-methods.service';

@Module({
  controllers: [CompanyPaymentMethodsController],
  providers: [CompanyPaymentMethodsService],
  exports: [CompanyPaymentMethodsService],
})
export class CompanyPaymentMethodsModule {}
