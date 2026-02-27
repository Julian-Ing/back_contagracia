import { Controller, Patch, HttpCode, HttpStatus } from '@nestjs/common';
import { CompanyId, Audit } from '@contagracia/shared-modules';
import { EnvironmentService } from './environment.service';

@Controller('environment')
export class EnvironmentController {
  constructor(private readonly environmentService: EnvironmentService) {}

  @Patch('invoice/habilitation')
  @HttpCode(HttpStatus.OK)
  @Audit('environment.updated', 'environment')
  async enableInvoiceHabilitation(@CompanyId() companyId: string) {
    return this.environmentService.enableInvoiceHabilitation(companyId);
  }

  @Patch('invoice/production')
  @HttpCode(HttpStatus.OK)
  @Audit('environment.updated', 'environment')
  async enableInvoiceProduction(@CompanyId() companyId: string) {
    return this.environmentService.enableInvoiceProduction(companyId);
  }

  @Patch('payroll/habilitation')
  @HttpCode(HttpStatus.OK)
  @Audit('environment.updated', 'environment')
  async enablePayrollHabilitation(@CompanyId() companyId: string) {
    return this.environmentService.enablePayrollHabilitation(companyId);
  }

  @Patch('payroll/production')
  @HttpCode(HttpStatus.OK)
  @Audit('environment.updated', 'environment')
  async enablePayrollProduction(@CompanyId() companyId: string) {
    return this.environmentService.enablePayrollProduction(companyId);
  }
}
