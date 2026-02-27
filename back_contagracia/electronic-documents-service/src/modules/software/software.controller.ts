import { Controller, Get, Patch, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { CompanyId, Audit } from '@contagracia/shared-modules';
import { SoftwareService } from './software.service';

@Controller('software')
export class SoftwareController {
  constructor(private readonly softwareService: SoftwareService) {}

  @Get('invoice')
  async getInvoiceSoftware(@CompanyId() companyId: string) {
    return this.softwareService.getInvoiceSoftware(companyId);
  }

  @Patch('invoice')
  @HttpCode(HttpStatus.OK)
  @Audit('software.updated', 'software')
  async configInvoiceSoftware(
    @CompanyId() companyId: string,
    @Body() body: { software_id: string; software_pin: number },
  ) {
    return this.softwareService.configInvoiceSoftware(
      companyId,
      body.software_id,
      body.software_pin,
    );
  }

  @Patch('invoice/test-set')
  @HttpCode(HttpStatus.OK)
  @Audit('software.updated', 'software')
  async saveInvoiceTestSet(
    @CompanyId() companyId: string,
    @Body() body: { test_set_id: string },
  ) {
    return this.softwareService.saveInvoiceTestSet(companyId, body.test_set_id);
  }

  @Get('payroll')
  async getPayrollSoftware(@CompanyId() companyId: string) {
    return this.softwareService.getPayrollSoftware(companyId);
  }

  @Patch('payroll')
  @HttpCode(HttpStatus.OK)
  @Audit('software.updated', 'software')
  async configPayrollSoftware(
    @CompanyId() companyId: string,
    @Body() body: { payroll_id: string; payroll_pin: number },
  ) {
    return this.softwareService.configPayrollSoftware(
      companyId,
      body.payroll_id,
      body.payroll_pin,
    );
  }

  @Patch('payroll/test-set')
  @HttpCode(HttpStatus.OK)
  @Audit('software.updated', 'software')
  async savePayrollTestSet(
    @CompanyId() companyId: string,
    @Body() body: { test_set_id: string },
  ) {
    return this.softwareService.savePayrollTestSet(companyId, body.test_set_id);
  }
}
