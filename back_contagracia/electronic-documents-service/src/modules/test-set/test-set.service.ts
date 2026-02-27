import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { TenantContextService, DianApiService } from '@contagracia/shared-modules';
import { buildInvoiceTestTemplate } from '../../templates/invoice-test.template';
import { buildPayrollTestTemplate } from '../../templates/payroll-test.template';
import { buildPayrollAdjustNoteTemplate } from '../../templates/payroll-adjust-note.template';

@Injectable()
export class TestSetService {
  private readonly logger = new Logger(TestSetService.name);

  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly dianApiService: DianApiService,
  ) {}

  /**
   * Paso 1: Registrar resolución SETP en API DIAN (no guarda en DB)
   */
  async registerInvoiceResolution(companyId: string) {
    const token = await this.dianApiService.getDianToken(companyId, this.tenantContext);
    if (!token) {
      throw new BadRequestException('No hay token DIAN configurado. Sincroniza la empresa primero.');
    }

    const resolutionData = {
      type_document_id: 1,
      prefix: 'SETP',
      resolution: '18760000001',
      resolution_date: '2019-01-19',
      technical_key: 'fc8eac422eba16e22ffd8c6f94b3f40a6e38162c',
      from: 990000000,
      to: 995000000,
      date_from: '2019-01-19',
      date_to: '2030-01-19',
    };

    this.logger.log(`Registrando resolución SETP para empresa ${companyId}`);

    const result = await this.dianApiService.syncResolution(token, resolutionData);

    if (!result.success) {
      throw new BadRequestException(result.message || 'Error registrando resolución SETP en DIAN');
    }

    return {
      success: true,
      message: 'Resolución SETP registrada en DIAN',
    };
  }

  /**
   * Paso 2: Enviar factura de prueba
   */
  async sendTestInvoice(companyId: string, consecutive: number) {
    // Validar rango
    if (consecutive < 990000000 || consecutive > 995000000) {
      throw new BadRequestException('El consecutivo debe estar entre 990,000,000 y 995,000,000');
    }

    const token = await this.dianApiService.getDianToken(companyId, this.tenantContext);
    if (!token) {
      throw new BadRequestException('No hay token DIAN configurado');
    }

    // Obtener test_set_id
    const tenantDb = await this.tenantContext.getTenantClient(companyId);
    if (!tenantDb) {
      throw new BadRequestException('No se pudo acceder a la base de datos del tenant');
    }

    const testSetSetting = await tenantDb.companySetting.findFirst({
      where: { category: 'dian', key: 'invoice_test_set_id' },
    });

    const testSetId = testSetSetting?.value;
    if (!testSetId) {
      throw new BadRequestException('No hay Test Set ID configurado');
    }

    // Obtener datos de la compañía (Master DB)
    const companyData = await this.tenantContext.getCompanyEstablishmentData(companyId);
    if (!companyData) {
      throw new BadRequestException('No se encontraron datos de la empresa');
    }

    // Generar fecha/hora Colombia
    const now = new Date();
    const colombiaDate = now.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
    const colombiaTime = now.toLocaleTimeString('en-GB', { timeZone: 'America/Bogota' });

    // Construir template
    const invoiceData = buildInvoiceTestTemplate({
      establishment_name: companyData.company_name,
      establishment_address: companyData.address,
      establishment_phone: companyData.phone,
      establishment_municipality: companyData.municipality_id,
      establishment_email: companyData.email,
      prefix: 'SETP',
      resolutionNumber: '18760000001',
      nextConsecutive: consecutive,
      currentDate: colombiaDate,
      currentTime: colombiaTime,
    });

    this.logger.log(`Enviando factura de prueba SETP${consecutive} para empresa ${companyId}`);

    const result = await this.dianApiService.sendInvoice(token, testSetId, invoiceData);

    await this.dianApiService.saveApiLog(
      tenantDb, 'INVOICE_HABILITATION', invoiceData, result.data || null, result.success,
    );

    if (!result.success) {
      throw new BadRequestException(result.message || 'Error enviando factura de prueba');
    }

    return {
      success: true,
      message: 'Factura de prueba enviada',
      zipKey: result.zipKey,
      data: result.data,
    };
  }

  /**
   * Paso 3: Consultar estado del ZipKey
   */
  async checkInvoiceStatus(companyId: string, zipKey: string) {
    const token = await this.dianApiService.getDianToken(companyId, this.tenantContext);
    if (!token) {
      throw new BadRequestException('No hay token DIAN configurado');
    }

    this.logger.log(`Consultando estado ZipKey ${zipKey} para empresa ${companyId}`);

    const result = await this.dianApiService.checkZipStatus(token, zipKey);

    if (!result.success) {
      throw new BadRequestException(result.message || 'Error consultando estado');
    }

    return {
      success: true,
      statusCode: result.statusCode,
      statusDescription: result.statusDescription,
      data: result.data,
    };
  }

  // =============================================
  // NÓMINA - Paso a Producción
  // =============================================

  /**
   * Paso 1 Nómina: Registrar resoluciones TNI y TNA en API DIAN (no guarda en DB)
   */
  async registerPayrollResolutions(companyId: string, payrollPrefix: string, notePrefix: string) {
    const token = await this.dianApiService.getDianToken(companyId, this.tenantContext);
    if (!token) {
      throw new BadRequestException('No hay token DIAN configurado. Sincroniza la empresa primero.');
    }

    const resolutions = [
      {
        type_document_id: 9,
        prefix: payrollPrefix,
        resolution: '18760000001',
        resolution_date: '2025-01-01',
        technical_key: '',
        from: 1,
        to: 99999999,
        date_from: '2025-01-01',
        date_to: '2100-12-31',
      },
      {
        type_document_id: 10,
        prefix: notePrefix,
        resolution: '18760000001',
        resolution_date: '2025-01-01',
        technical_key: '',
        from: 1,
        to: 99999999,
        date_from: '2025-01-01',
        date_to: '2100-12-31',
      },
    ];

    for (const res of resolutions) {
      const result = await this.dianApiService.syncResolution(token, res);

      if (!result.success) {
        throw new BadRequestException(
          result.message || `Error registrando resolución ${res.prefix} en DIAN`,
        );
      }
    }

    return {
      success: true,
      message: `Resoluciones ${payrollPrefix} y ${notePrefix} registradas en DIAN`,
    };
  }

  /**
   * Paso 2 Nómina: Enviar una nómina de prueba
   * Se llama 10 veces (consecutive 1-10)
   */
  async sendTestPayroll(companyId: string, consecutive: number, prefix: string) {
    const token = await this.dianApiService.getDianToken(companyId, this.tenantContext);
    if (!token) {
      throw new BadRequestException('No hay token DIAN configurado');
    }

    // Obtener test_set_id de nómina
    const tenantDb = await this.tenantContext.getTenantClient(companyId);
    if (!tenantDb) {
      throw new BadRequestException('No se pudo acceder a la base de datos del tenant');
    }

    const testSetSetting = await tenantDb.companySetting.findFirst({
      where: { category: 'dian', key: 'payroll_test_set_id' },
    });

    const testSetId = testSetSetting?.value;
    if (!testSetId) {
      throw new BadRequestException('No hay Test Set ID de nómina configurado');
    }

    // Generar fecha Colombia
    const now = new Date();
    const colombiaDate = now.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });

    // Construir template (sin establishment fields)
    const payrollData = buildPayrollTestTemplate({
      consecutive,
      prefix,
      currentDate: colombiaDate,
    });

    const result = await this.dianApiService.sendPayroll(token, testSetId, payrollData);

    await this.dianApiService.saveApiLog(
      tenantDb, 'PAYROLL_HABILITATION', payrollData, result.data || null, result.success,
    );

    if (!result.success) {
      throw new BadRequestException(result.message || `Error enviando nómina #${consecutive}`);
    }

    return {
      success: true,
      message: result.message,
      cune: result.cune,
      consecutive,
      issueDate: colombiaDate,
    };
  }

  /**
   * Paso 3 Nómina: Enviar una nota de ajuste
   * Se llama 8 veces (consecutive 1-8), cada una referencia una nómina previa
   */
  async sendTestAdjustNote(
    companyId: string,
    consecutive: number,
    prefix: string,
    predecessorNumber: number,
    predecessorCune: string,
    predecessorIssueDate: string,
  ) {
    const token = await this.dianApiService.getDianToken(companyId, this.tenantContext);
    if (!token) {
      throw new BadRequestException('No hay token DIAN configurado');
    }

    // Obtener test_set_id de nómina
    const tenantDb = await this.tenantContext.getTenantClient(companyId);
    if (!tenantDb) {
      throw new BadRequestException('No se pudo acceder a la base de datos del tenant');
    }

    const testSetSetting = await tenantDb.companySetting.findFirst({
      where: { category: 'dian', key: 'payroll_test_set_id' },
    });

    const testSetId = testSetSetting?.value;
    if (!testSetId) {
      throw new BadRequestException('No hay Test Set ID de nómina configurado');
    }

    // Obtener datos de la compañía (Master DB) - adjust notes SÍ llevan establishment
    const companyData = await this.tenantContext.getCompanyEstablishmentData(companyId);
    if (!companyData) {
      throw new BadRequestException('No se encontraron datos de la empresa');
    }

    // Generar fecha Colombia
    const now = new Date();
    const colombiaDate = now.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });

    // Construir template
    const noteData = buildPayrollAdjustNoteTemplate({
      establishment_name: companyData.company_name,
      establishment_address: companyData.address,
      establishment_phone: companyData.phone,
      establishment_municipality: companyData.municipality_id,
      establishment_email: companyData.email,
      consecutive,
      prefix,
      currentDate: colombiaDate,
      predecessor_number: String(predecessorNumber),
      predecessor_cune: predecessorCune,
      predecessor_issue_date: predecessorIssueDate,
    });

    const result = await this.dianApiService.sendPayrollAdjustNote(token, testSetId, noteData);

    await this.dianApiService.saveApiLog(
      tenantDb, 'PAYROLL_ADJUST_NOTE_HABILITATION', noteData, result.data || null, result.success,
    );

    if (!result.success) {
      throw new BadRequestException(result.message || `Error enviando nota de ajuste #${consecutive}`);
    }

    return {
      success: true,
      message: result.message,
      cune: result.cune,
    };
  }

  /**
   * Importar resoluciones de producción desde DIAN (numbering-range)
   * Consulta rangos de numeración, filtra factura (con TechnicalKey) y doc soporte (sin TechnicalKey),
   * registra en API DIAN y guarda en DB del tenant. Skipea si ya existen.
   */
  async importInvoiceResolutions(companyId: string) {
    const token = await this.dianApiService.getDianToken(companyId, this.tenantContext);
    if (!token) {
      throw new BadRequestException('No hay token DIAN configurado');
    }

    const tenantDb = await this.tenantContext.getTenantClient(companyId);
    if (!tenantDb) {
      throw new BadRequestException('No se pudo acceder a la base de datos del tenant');
    }

    // Obtener software_id
    const softwareSetting = await tenantDb.companySetting.findFirst({
      where: { category: 'dian', key: 'invoice_software_id' },
    });
    const softwareId = softwareSetting?.value;
    if (!softwareId) {
      throw new BadRequestException('No hay Software ID configurado');
    }

    // Consultar numbering-range en DIAN
    const rangeResult = await this.dianApiService.getNumberingRange(token, softwareId);

    if (!rangeResult.success || !rangeResult.resolutions?.length) {
      return {
        success: true,
        message: rangeResult.message || 'No se encontraron resoluciones en DIAN',
        results: [],
      };
    }

    const results: { prefix: string; type: string; action: string }[] = [];

    for (const item of rangeResult.resolutions) {
      const prefix = String(item.Prefix || '').trim();
      const resolution = String(item.ResolutionNumber || '').trim();
      const resolutionDate = String(item.ResolutionDate || '').trim();
      const from = Number(item.FromNumber || 0);
      const to = Number(item.ToNumber || 0);
      const dateFrom = String(item.ValidDateFrom || '').trim();
      const dateTo = String(item.ValidDateTo || '').trim();
      const rawTk = item.TechnicalKey;
      const technicalKey = (typeof rawTk === 'string' && rawTk.trim()) ? rawTk.trim() : '';

      // Con TechnicalKey = factura (type_document_id 1), sin = doc soporte (type_document_id 11)
      const typeDocumentId = technicalKey ? '1' : '11';
      const typeName = technicalKey ? 'Factura' : 'Doc. Soporte';

      // Verificar si ya existe en DB
      const existing = await tenantDb.resolution.findFirst({
        where: {
          type_document_id: typeDocumentId,
          prefix,
          resolution_number: resolution,
        },
      });

      if (existing) {
        results.push({ prefix, type: typeName, action: 'ya existía' });
        continue;
      }

      // Registrar en API DIAN
      const apiResult = await this.dianApiService.syncResolution(token, {
        type_document_id: Number(typeDocumentId),
        prefix,
        resolution,
        resolution_date: resolutionDate,
        technical_key: technicalKey,
        from,
        to,
        date_from: dateFrom,
        date_to: dateTo,
      });

      if (!apiResult.success) {
        this.logger.warn(`Error registrando resolución ${prefix} en DIAN: ${apiResult.message}`);
        results.push({ prefix, type: typeName, action: `error: ${apiResult.message}` });
        continue;
      }

      // Guardar en DB (@db.Date necesita ISO-8601 completo)
      await tenantDb.resolution.create({
        data: {
          type_document_id: typeDocumentId,
          prefix,
          resolution_number: resolution,
          resolution_date: new Date(`${resolutionDate}T12:00:00Z`),
          technical_key: technicalKey || null,
          range_from: from,
          range_to: to,
          date_from: dateFrom ? new Date(`${dateFrom}T12:00:00Z`) : null,
          date_to: dateTo ? new Date(`${dateTo}T12:00:00Z`) : null,
          last_external_consecutive: from > 0 ? from - 1 : 0,
          is_active: true,
        },
      });

      results.push({ prefix, type: typeName, action: 'importada' });
    }

    return {
      success: true,
      message: results.map((r) => `${r.prefix} (${r.type}): ${r.action}`).join(', '),
      results,
    };
  }

  /**
   * Paso 4 Nómina: Crear resoluciones NI y NA de producción + cambiar ambiente
   */
  async createPayrollProductionResolutions(companyId: string) {
    const token = await this.dianApiService.getDianToken(companyId, this.tenantContext);
    if (!token) {
      throw new BadRequestException('No hay token DIAN configurado');
    }

    const tenantDb = await this.tenantContext.getTenantClient(companyId);
    if (!tenantDb) {
      throw new BadRequestException('No se pudo acceder a la base de datos del tenant');
    }

    const productionResolutions = [
      { type_document_id: '9', prefix: 'NI', label: 'Nómina Individual' },
      { type_document_id: '10', prefix: 'NA', label: 'Nota de Ajuste' },
    ];

    const results: { prefix: string; action: string }[] = [];

    for (const pr of productionResolutions) {
      // Verificar si ya existe en DB
      const existing = await tenantDb.resolution.findFirst({
        where: {
          type_document_id: pr.type_document_id,
          prefix: pr.prefix,
          resolution_number: '18760000001',
        },
      });

      if (existing) {
        results.push({ prefix: pr.prefix, action: 'ya existía' });
        continue;
      }

      // Enviar a API DIAN
      const apiResult = await this.dianApiService.syncResolution(token, {
        type_document_id: Number(pr.type_document_id),
        prefix: pr.prefix,
        resolution: '18760000001',
        resolution_date: '2000-01-01',
        technical_key: '',
        from: 1,
        to: 99999999,
        date_from: '2000-01-01',
        date_to: '2100-12-31',
      });

      if (!apiResult.success) {
        throw new BadRequestException(
          apiResult.message || `Error registrando resolución ${pr.prefix} en DIAN`,
        );
      }

      // Guardar en DB del tenant
      await tenantDb.resolution.create({
        data: {
          type_document_id: pr.type_document_id,
          prefix: pr.prefix,
          resolution_number: '18760000001',
          resolution_date: new Date('2000-01-01T12:00:00Z'),
          technical_key: '',
          range_from: 1,
          range_to: 99999999,
          date_from: new Date('2000-01-01T12:00:00Z'),
          date_to: new Date('2100-12-31T12:00:00Z'),
          last_external_consecutive: 0,
          is_active: true,
        },
      });

      results.push({ prefix: pr.prefix, action: 'creada' });
    }

    return {
      success: true,
      message: results.map((r) => `${r.prefix}: ${r.action}`).join(', '),
      results,
    };
  }
}
