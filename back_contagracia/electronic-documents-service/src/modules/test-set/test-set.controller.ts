import { Controller, Post, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { CompanyId, Audit } from '@contagracia/shared-modules';
import { TestSetService } from './test-set.service';

@Controller('test-set')
export class TestSetController {
  constructor(private readonly testSetService: TestSetService) {}

  /**
   * Paso 1: Registrar resolución SETP en API DIAN
   */
  @Post('invoice/register-resolution')
  @HttpCode(HttpStatus.OK)
  @Audit('test_set.invoice_resolution_registered', 'test_set')
  async registerInvoiceResolution(@CompanyId() companyId: string) {
    return this.testSetService.registerInvoiceResolution(companyId);
  }

  /**
   * Paso 2: Enviar factura de prueba
   */
  @Post('invoice/send')
  @HttpCode(HttpStatus.OK)
  @Audit('test_set.invoice_sent', 'test_set')
  async sendTestInvoice(
    @CompanyId() companyId: string,
    @Body() body: { consecutive: number },
  ) {
    return this.testSetService.sendTestInvoice(companyId, body.consecutive);
  }

  /**
   * Paso 3: Consultar estado del ZipKey
   */
  @Post('invoice/status/:zipKey')
  @HttpCode(HttpStatus.OK)
  @Audit('test_set.invoice_status_checked', 'test_set')
  async checkInvoiceStatus(
    @CompanyId() companyId: string,
    @Param('zipKey') zipKey: string,
  ) {
    return this.testSetService.checkInvoiceStatus(companyId, zipKey);
  }

  /**
   * Importar resoluciones de producción desde DIAN (numbering-range)
   */
  @Post('invoice/import-resolutions')
  @HttpCode(HttpStatus.OK)
  @Audit('test_set.invoice_resolutions_imported', 'test_set')
  async importInvoiceResolutions(@CompanyId() companyId: string) {
    return this.testSetService.importInvoiceResolutions(companyId);
  }

  // =============================================
  // NÓMINA
  // =============================================

  /**
   * Paso 1 Nómina: Registrar resoluciones TNI y TNA
   */
  @Post('payroll/register-resolutions')
  @HttpCode(HttpStatus.OK)
  @Audit('test_set.payroll_resolutions_registered', 'test_set')
  async registerPayrollResolutions(
    @CompanyId() companyId: string,
    @Body() body: { payroll_prefix?: string; note_prefix?: string },
  ) {
    return this.testSetService.registerPayrollResolutions(
      companyId,
      body.payroll_prefix || 'TNI',
      body.note_prefix || 'TNA',
    );
  }

  /**
   * Paso 2 Nómina: Enviar una nómina de prueba
   */
  @Post('payroll/send')
  @HttpCode(HttpStatus.OK)
  @Audit('test_set.payroll_sent', 'test_set')
  async sendTestPayroll(
    @CompanyId() companyId: string,
    @Body() body: { consecutive: number; prefix?: string },
  ) {
    return this.testSetService.sendTestPayroll(companyId, body.consecutive, body.prefix || 'TNI');
  }

  /**
   * Paso 3 Nómina: Enviar una nota de ajuste
   */
  @Post('payroll/send-adjust-note')
  @HttpCode(HttpStatus.OK)
  @Audit('test_set.payroll_adjust_note_sent', 'test_set')
  async sendTestAdjustNote(
    @CompanyId() companyId: string,
    @Body()
    body: {
      consecutive: number;
      prefix?: string;
      predecessor_number: number;
      predecessor_cune: string;
      predecessor_issue_date: string;
    },
  ) {
    return this.testSetService.sendTestAdjustNote(
      companyId,
      body.consecutive,
      body.prefix || 'TNA',
      body.predecessor_number,
      body.predecessor_cune,
      body.predecessor_issue_date,
    );
  }

  /**
   * Paso 4 Nómina: Crear resoluciones NI y NA de producción
   */
  @Post('payroll/create-production-resolutions')
  @HttpCode(HttpStatus.OK)
  @Audit('test_set.payroll_production_resolutions_created', 'test_set')
  async createPayrollProductionResolutions(@CompanyId() companyId: string) {
    return this.testSetService.createPayrollProductionResolutions(companyId);
  }
}
