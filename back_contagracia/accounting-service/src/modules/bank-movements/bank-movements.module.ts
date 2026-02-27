import { Module } from '@nestjs/common';
import { BankMovementsController } from './bank-movements.controller';
import { BankMovementsService } from './bank-movements.service';

@Module({
  controllers: [BankMovementsController],
  providers: [BankMovementsService],
  exports: [BankMovementsService],
})
export class BankMovementsModule {}
