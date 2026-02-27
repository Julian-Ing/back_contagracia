import { Module } from '@nestjs/common';
import { HrExpensesController } from './hr-expenses.controller';
import { HrExpensesService } from './hr-expenses.service';

@Module({
  controllers: [HrExpensesController],
  providers: [HrExpensesService],
  exports: [HrExpensesService],
})
export class HrExpensesModule {}
