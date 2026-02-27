import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { TenantContextService, DianApiService } from '@contagracia/shared-modules';

@Injectable()
export class EnvironmentService {
  private readonly logger = new Logger(EnvironmentService.name);

  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly dianApiService: DianApiService,
  ) {}

  /**
   * Obtener valores actuales de ambiente
   */
  private async getEnvironmentValues(
    companyId: string,
  ): Promise<{ invoice: number; payroll: number }> {
    const tenantDb = await this.tenantContext.getTenantClient(companyId);
    if (!tenantDb) {
      throw new BadRequestException('No se pudo acceder a la base de datos del tenant');
    }

    const invoiceSetting = await tenantDb.companySetting.findFirst({
      where: { category: 'dian', key: 'invoice_dian_environment' },
    });
    const payrollSetting = await tenantDb.companySetting.findFirst({
      where: { category: 'dian', key: 'payroll_dian_environment' },
    });

    return {
      invoice: invoiceSetting ? Number(invoiceSetting.value) : 2,
      payroll: payrollSetting ? Number(payrollSetting.value) : 2,
    };
  }

  /**
   * Cambiar facturación a HABILITACIÓN (2)
   */
  async enableInvoiceHabilitation(companyId: string): Promise<{ success: boolean; message: string }> {
    const tenantDb = await this.tenantContext.getTenantClient(companyId);
    if (!tenantDb) {
      throw new BadRequestException('No se pudo acceder a la base de datos del tenant');
    }

    const token = await this.dianApiService.getDianToken(companyId, this.tenantContext);
    if (!token) {
      throw new BadRequestException('No hay token DIAN configurado');
    }

    const current = await this.getEnvironmentValues(companyId);

    const dianResponse = await this.dianApiService.changeInvoiceEnvironment(
      companyId,
      token,
      2,
      current.payroll,
    );

    if (!dianResponse.success) {
      this.logger.error(`Error en API DIAN: ${dianResponse.message}`);
      throw new BadRequestException(dianResponse.message || 'Error al cambiar ambiente');
    }

    await tenantDb.companySetting.update({
      where: { category_key: { category: 'dian', key: 'invoice_dian_environment' } },
      data: { value: '2' },
    });

    this.logger.log(`Facturación cambiada a HABILITACIÓN para empresa ${companyId}`);

    return {
      success: true,
      message: 'Facturación en HABILITACIÓN',
    };
  }

  /**
   * Cambiar facturación a PRODUCCIÓN (1)
   */
  async enableInvoiceProduction(companyId: string): Promise<{ success: boolean; message: string }> {
    const tenantDb = await this.tenantContext.getTenantClient(companyId);
    if (!tenantDb) {
      throw new BadRequestException('No se pudo acceder a la base de datos del tenant');
    }

    const token = await this.dianApiService.getDianToken(companyId, this.tenantContext);
    if (!token) {
      throw new BadRequestException('No hay token DIAN configurado');
    }

    const current = await this.getEnvironmentValues(companyId);

    const dianResponse = await this.dianApiService.changeInvoiceEnvironment(
      companyId,
      token,
      1,
      current.payroll,
    );

    if (!dianResponse.success) {
      this.logger.error(`Error en API DIAN: ${dianResponse.message}`);
      throw new BadRequestException(dianResponse.message || 'Error al cambiar ambiente');
    }

    await tenantDb.companySetting.update({
      where: { category_key: { category: 'dian', key: 'invoice_dian_environment' } },
      data: { value: '1' },
    });

    this.logger.log(`Facturación cambiada a PRODUCCIÓN para empresa ${companyId}`);

    return {
      success: true,
      message: 'Facturación en PRODUCCIÓN',
    };
  }

  /**
   * Cambiar nómina a HABILITACIÓN (2)
   */
  async enablePayrollHabilitation(companyId: string): Promise<{ success: boolean; message: string }> {
    const tenantDb = await this.tenantContext.getTenantClient(companyId);
    if (!tenantDb) {
      throw new BadRequestException('No se pudo acceder a la base de datos del tenant');
    }

    const token = await this.dianApiService.getDianToken(companyId, this.tenantContext);
    if (!token) {
      throw new BadRequestException('No hay token DIAN configurado');
    }

    const current = await this.getEnvironmentValues(companyId);

    const dianResponse = await this.dianApiService.changePayrollEnvironment(
      companyId,
      token,
      current.invoice,
      2,
    );

    if (!dianResponse.success) {
      this.logger.error(`Error en API DIAN: ${dianResponse.message}`);
      throw new BadRequestException(dianResponse.message || 'Error al cambiar ambiente');
    }

    await tenantDb.companySetting.update({
      where: { category_key: { category: 'dian', key: 'payroll_dian_environment' } },
      data: { value: '2' },
    });

    this.logger.log(`Nómina cambiada a HABILITACIÓN para empresa ${companyId}`);

    return {
      success: true,
      message: 'Nómina en HABILITACIÓN',
    };
  }

  /**
   * Cambiar nómina a PRODUCCIÓN (1)
   */
  async enablePayrollProduction(companyId: string): Promise<{ success: boolean; message: string }> {
    const tenantDb = await this.tenantContext.getTenantClient(companyId);
    if (!tenantDb) {
      throw new BadRequestException('No se pudo acceder a la base de datos del tenant');
    }

    const token = await this.dianApiService.getDianToken(companyId, this.tenantContext);
    if (!token) {
      throw new BadRequestException('No hay token DIAN configurado');
    }

    const current = await this.getEnvironmentValues(companyId);

    const dianResponse = await this.dianApiService.changePayrollEnvironment(
      companyId,
      token,
      current.invoice,
      1,
    );

    if (!dianResponse.success) {
      this.logger.error(`Error en API DIAN: ${dianResponse.message}`);
      throw new BadRequestException(dianResponse.message || 'Error al cambiar ambiente');
    }

    await tenantDb.companySetting.update({
      where: { category_key: { category: 'dian', key: 'payroll_dian_environment' } },
      data: { value: '1' },
    });

    this.logger.log(`Nómina cambiada a PRODUCCIÓN para empresa ${companyId}`);

    return {
      success: true,
      message: 'Nómina en PRODUCCIÓN',
    };
  }
}
