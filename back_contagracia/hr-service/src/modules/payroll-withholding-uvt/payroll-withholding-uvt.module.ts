import { Module } from '@nestjs/common';
import { PayrollWithholdingUvtController } from './payroll-withholding-uvt.controller';
import { PayrollWithholdingUvtService } from './payroll-withholding-uvt.service';

@Module({
  controllers: [PayrollWithholdingUvtController],
  providers: [PayrollWithholdingUvtService],
  exports: [PayrollWithholdingUvtService],
})
export class PayrollWithholdingUvtModule {}
