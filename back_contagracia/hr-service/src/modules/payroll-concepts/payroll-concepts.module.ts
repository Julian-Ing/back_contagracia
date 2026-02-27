import { Module } from '@nestjs/common';
import { PayrollConceptsController } from './payroll-concepts.controller';
import { PayrollConceptsService } from './payroll-concepts.service';

@Module({
  controllers: [PayrollConceptsController],
  providers: [PayrollConceptsService],
  exports: [PayrollConceptsService],
})
export class PayrollConceptsModule {}
