import { Module } from '@nestjs/common';
import { PrepaymentsController } from './prepayments.controller';
import { PrepaymentsService } from './prepayments.service';

@Module({
  controllers: [PrepaymentsController],
  providers: [PrepaymentsService],
  exports: [PrepaymentsService],
})
export class PrepaymentsModule {}
