import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PayrollSettlementsController } from './payroll-settlements.controller';
import { PayrollSettlementsService } from './payroll-settlements.service';
import { CompanySettingsModule } from '../company-settings/company-settings.module';
import { PayrollConceptsModule } from '../payroll-concepts/payroll-concepts.module';
import { PayrollWithholdingUvtModule } from '../payroll-withholding-uvt/payroll-withholding-uvt.module';

@Module({
  imports: [
    ConfigModule,
    CompanySettingsModule,
    PayrollConceptsModule,
    PayrollWithholdingUvtModule,
  ],
  controllers: [PayrollSettlementsController],
  providers: [PayrollSettlementsService],
  exports: [PayrollSettlementsService],
})
export class PayrollSettlementsModule {}
