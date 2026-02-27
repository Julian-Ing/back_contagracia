import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { TenantContextService, DianApiService } from '@contagracia/shared-modules';

@Injectable()
export class SoftwareService {
  private readonly logger = new Logger(SoftwareService.name);

  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly dianApiService: DianApiService,
  ) {}

  /**
   * Obtener configuración de software de facturación
   */
  async getInvoiceSoftware(companyId: string) {
    const tenantDb = await this.tenantContext.getTenantClient(companyId);
    if (!tenantDb) {
      return { software_id: '', software_pin: '', test_set_id: '', environment: 2 };
    }

    const settings = await tenantDb.companySetting.findMany({
      where: {
        category: 'dian',
        key: { in: ['invoice_software_id', 'invoice_software_pin', 'invoice_test_set_id', 'invoice_dian_environment'] },
      },
    });

    const softwareId = settings.find((s) => s.key === 'invoice_software_id')?.value || '';
    const softwarePin = settings.find((s) => s.key === 'invoice_software_pin')?.value || '';
    const testSetId = settings.find((s) => s.key === 'invoice_test_set_id')?.value || '';
    const environment = settings.find((s) => s.key === 'invoice_dian_environment')?.value || '2';

    return {
      software_id: softwareId,
      software_pin: softwarePin,
      test_set_id: testSetId,
      environment: Number(environment),
    };
  }

  /**
   * Obtener configuración de software de nómina
   */
  async getPayrollSoftware(companyId: string) {
    const tenantDb = await this.tenantContext.getTenantClient(companyId);
    if (!tenantDb) {
      return { software_id: '', software_pin: '', test_set_id: '', environment: 2 };
    }

    const settings = await tenantDb.companySetting.findMany({
      where: {
        category: 'dian',
        key: { in: ['payroll_software_id', 'payroll_software_pin', 'payroll_test_set_id', 'payroll_dian_environment'] },
      },
    });

    const payrollId = settings.find((s) => s.key === 'payroll_software_id')?.value || '';
    const payrollPin = settings.find((s) => s.key === 'payroll_software_pin')?.value || '';
    const testSetId = settings.find((s) => s.key === 'payroll_test_set_id')?.value || '';
    const environment = settings.find((s) => s.key === 'payroll_dian_environment')?.value || '2';

    return {
      software_id: payrollId,
      software_pin: payrollPin,
      test_set_id: testSetId,
      environment: Number(environment),
    };
  }

  /**
   * Configurar software de facturación
   * - Envía a API DIAN
   * - Guarda en CompanySetting
   */
  async configInvoiceSoftware(
    companyId: string,
    softwareId: string,
    softwarePin: number,
  ): Promise<{ success: boolean; message: string }> {
    const tenantDb = await this.tenantContext.getTenantClient(companyId);
    if (!tenantDb) {
      throw new BadRequestException('No se pudo acceder a la base de datos del tenant');
    }

    // Validar que el pin sea de 5 dígitos
    if (softwarePin < 10000 || softwarePin > 99999) {
      throw new BadRequestException('El PIN debe ser un número de 5 dígitos');
    }

    // Obtener token DIAN
    const token = await this.dianApiService.getDianToken(companyId, this.tenantContext);
    if (!token) {
      throw new BadRequestException('No hay token DIAN configurado. Sincroniza la empresa primero.');
    }

    // Enviar a API DIAN
    const dianResponse = await this.dianApiService.configSoftwareInvoice(
      companyId,
      token,
      softwareId,
      softwarePin,
    );

    if (!dianResponse.success) {
      this.logger.error(`Error configurando software de facturación con DIAN: ${dianResponse.message}`);
      throw new BadRequestException(dianResponse.message || 'Error al configurar software en DIAN');
    }

    // Guardar en CompanySetting
    await tenantDb.companySetting.update({
      where: { category_key: { category: 'dian', key: 'invoice_software_id' } },
      data: { value: softwareId },
    });

    await tenantDb.companySetting.update({
      where: { category_key: { category: 'dian', key: 'invoice_software_pin' } },
      data: { value: String(softwarePin) },
    });

    this.logger.log(`Software de facturación configurado para empresa ${companyId}`);

    return {
      success: true,
      message: dianResponse.message || 'Software de facturación configurado exitosamente',
    };
  }

  /**
   * Configurar software de nómina
   * - Envía a API DIAN
   * - Guarda en CompanySetting
   */
  async configPayrollSoftware(
    companyId: string,
    payrollId: string,
    payrollPin: number,
  ): Promise<{ success: boolean; message: string }> {
    const tenantDb = await this.tenantContext.getTenantClient(companyId);
    if (!tenantDb) {
      throw new BadRequestException('No se pudo acceder a la base de datos del tenant');
    }

    // Validar que el pin sea de 5 dígitos
    if (payrollPin < 10000 || payrollPin > 99999) {
      throw new BadRequestException('El PIN debe ser un número de 5 dígitos');
    }

    // Obtener token DIAN
    const token = await this.dianApiService.getDianToken(companyId, this.tenantContext);
    if (!token) {
      throw new BadRequestException('No hay token DIAN configurado. Sincroniza la empresa primero.');
    }

    // Enviar a API DIAN
    const dianResponse = await this.dianApiService.configSoftwarePayroll(
      companyId,
      token,
      payrollId,
      payrollPin,
    );

    if (!dianResponse.success) {
      this.logger.error(`Error configurando software de nómina con DIAN: ${dianResponse.message}`);
      throw new BadRequestException(dianResponse.message || 'Error al configurar software de nómina en DIAN');
    }

    // Guardar en CompanySetting
    await tenantDb.companySetting.update({
      where: { category_key: { category: 'dian', key: 'payroll_software_id' } },
      data: { value: payrollId },
    });

    await tenantDb.companySetting.update({
      where: { category_key: { category: 'dian', key: 'payroll_software_pin' } },
      data: { value: String(payrollPin) },
    });

    this.logger.log(`Software de nómina configurado para empresa ${companyId}`);

    return {
      success: true,
      message: dianResponse.message || 'Software de nómina configurado exitosamente',
    };
  }

  /**
   * Guardar Test Set ID de facturación
   */
  async saveInvoiceTestSet(
    companyId: string,
    testSetId: string,
  ): Promise<{ success: boolean; message: string }> {
    const tenantDb = await this.tenantContext.getTenantClient(companyId);
    if (!tenantDb) {
      throw new BadRequestException('No se pudo acceder a la base de datos del tenant');
    }

    await tenantDb.companySetting.update({
      where: { category_key: { category: 'dian', key: 'invoice_test_set_id' } },
      data: { value: testSetId },
    });

    this.logger.log(`Test Set ID de facturación guardado para empresa ${companyId}`);

    return {
      success: true,
      message: 'Test Set ID guardado exitosamente',
    };
  }

  /**
   * Guardar Test Set ID de nómina
   */
  async savePayrollTestSet(
    companyId: string,
    testSetId: string,
  ): Promise<{ success: boolean; message: string }> {
    const tenantDb = await this.tenantContext.getTenantClient(companyId);
    if (!tenantDb) {
      throw new BadRequestException('No se pudo acceder a la base de datos del tenant');
    }

    await tenantDb.companySetting.update({
      where: { category_key: { category: 'dian', key: 'payroll_test_set_id' } },
      data: { value: testSetId },
    });

    this.logger.log(`Test Set ID de nómina guardado para empresa ${companyId}`);

    return {
      success: true,
      message: 'Test Set ID guardado exitosamente',
    };
  }
}
