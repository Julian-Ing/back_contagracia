import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PdfParserService } from './services/pdf-parser.service';
import { DianDownloaderService } from './services/dian-downloader.service';
import { PdfParseResult } from './types/parser.types';

@Injectable()
export class TaxCalendarService {
  private readonly logger = new Logger(TaxCalendarService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfParser: PdfParserService,
    private readonly dianDownloader: DianDownloaderService,
  ) {
    this.logger.log('TaxCalendarService initialized');
  }

  /**
   * Parsea un PDF sin guardar en base de datos (solo para vista previa)
   */
  async parsePdf(buffer: Buffer, year: number, sourceUrl?: string): Promise<PdfParseResult> {
    this.logger.log(`Parseando PDF para año ${year} (sin guardar)`);
    return await this.pdfParser.parsePdf(buffer, year, sourceUrl);
  }

  /**
   * Parsea un PDF y guarda las fechas en base de datos
   */
  async syncFromPdf(buffer: Buffer, year: number, sourceUrl?: string): Promise<PdfParseResult> {
    this.logger.log(`Sincronizando calendario ${year} desde PDF`);

    // 1. Parsear PDF
    const parseResult = await this.pdfParser.parsePdf(buffer, year, sourceUrl);

    if (!this.pdfParser.validateParseResult(parseResult)) {
      throw new Error(`Parseo de PDF falló: ${parseResult.parseErrors.join(', ')}`);
    }

    // 2. Guardar en base de datos
    await this.saveParsedDates(parseResult);

    // 3. Crear log de sincronización (deshabilitado temporalmente - tabla no sincronizada con schema)
    // TODO: Ejecutar migración para sincronizar tabla tax_calendar_sync_logs
    // await this.createSyncLog({
    //   year,
    //   sourceType: sourceUrl ? 'url' : 'upload',
    //   sourceUrl,
    //   totalDatesImported: parseResult.totalDates,
    //   taxTypesDetected: parseResult.taxTypesDetected,
    //   parseErrors: parseResult.parseErrors,
    //   parseWarnings: parseResult.parseWarnings,
    //   success: true,
    // });

    this.logger.log(`✅ Sincronización exitosa: ${parseResult.totalDates} fechas guardadas`);
    return parseResult;
  }

  /**
   * Descarga PDF desde DIAN y sincroniza
   */
  async syncFromDian(year: number): Promise<PdfParseResult> {
    this.logger.log(`Sincronizando calendario ${year} desde DIAN`);

    const sourceUrl = this.dianDownloader.getPdfUrl(year);

    try {
      // 1. Descargar PDF
      const buffer = await this.dianDownloader.downloadPdf(year);

      // 2. Sincronizar
      return await this.syncFromPdf(buffer, year, sourceUrl);
    } catch (error) {
      // Crear log de error (deshabilitado temporalmente - tabla no sincronizada con schema)
      // TODO: Ejecutar migración para sincronizar tabla tax_calendar_sync_logs
      // await this.createSyncLog({
      //   year,
      //   sourceType: 'dian',
      //   sourceUrl,
      //   totalDatesImported: 0,
      //   taxTypesDetected: [],
      //   parseErrors: [error.message],
      //   parseWarnings: [],
      //   success: false,
      // });

      throw error;
    }
  }

  /**
   * Verifica si un año está cargado en la base de datos
   */
  async getStatus(year: number): Promise<{ loaded: boolean; dateCount: number; lastSync?: Date }> {
    const count = await this.prisma.taxCalendarDate.count({
      where: { year },
    });

    // Query de sync log deshabilitada temporalmente - tabla no sincronizada con schema
    // TODO: Ejecutar migración para sincronizar tabla tax_calendar_sync_logs
    // const lastSync = await this.prisma.taxCalendarSyncLog.findFirst({
    //   where: { year, success: true },
    //   orderBy: { created_at: 'desc' },
    // });

    return {
      loaded: count > 0,
      dateCount: count,
      // lastSync: lastSync?.created_at,
    };
  }

  /**
   * Lista todos los tipos de obligaciones tributarias
   */
  async getObligationTypes() {
    return await this.prisma.taxObligationType.findMany({
      where: { is_active: true },
      orderBy: [{ display_order: 'asc' }, { name: 'asc' }],
    });
  }

  /**
   * Obtiene el calendario de una empresa para un año/mes específico
   */
  async getCompanyCalendar(companyId: string, year: number, month?: number) {
    this.logger.debug(`Obteniendo calendario para company ${companyId}, año ${year}, mes ${month || 'todos'}`);

    // 1. Obtener NIT de la empresa
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { nit: true, company_name: true },
    });

    if (!company || !company.nit) {
      throw new NotFoundException(`Empresa ${companyId} no encontrada o sin NIT`);
    }

    // Calcular último dígito del NIT
    const nitLastDigit = company.nit.replace(/\D/g, '').slice(-1);

    // 2. Consultar fechas del calendario
    const whereClause: any = {
      year,
      OR: [
        { nit_last_digits: nitLastDigit }, // Fechas específicas para este NIT
        { nit_last_digits: null },         // Fechas independientes del NIT
      ],
    };

    if (month !== undefined && month >= 1 && month <= 12) {
      // Filtrar por mes específico usando el campo due_date
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59); // Último día del mes

      whereClause.due_date = {
        gte: startDate,
        lte: endDate,
      };
    }

    const dates = await this.prisma.taxCalendarDate.findMany({
      where: whereClause,
      include: {
        tax_obligation_type: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
      orderBy: { due_date: 'asc' },
    });

    return {
      company: {
        id: companyId,
        name: company.company_name,
        nit: company.nit,
        nitLastDigit,
      },
      year,
      month,
      totalObligations: dates.length,
      obligations: dates,
    };
  }

  /**
   * Obtiene las próximas obligaciones de una empresa
   */
  async getUpcomingObligations(companyId: string, daysAhead: number = 30) {
    this.logger.debug(`Obteniendo próximas obligaciones para company ${companyId}, próximos ${daysAhead} días`);

    // 1. Obtener NIT de la empresa
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { nit: true, company_name: true },
    });

    if (!company || !company.nit) {
      throw new NotFoundException(`Empresa ${companyId} no encontrada o sin NIT`);
    }

    const nitLastDigit = company.nit.replace(/\D/g, '').slice(-1);

    // 2. Calcular rango de fechas
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + daysAhead);
    futureDate.setHours(23, 59, 59, 999);

    // 3. Consultar obligaciones próximas
    const dates = await this.prisma.taxCalendarDate.findMany({
      where: {
        due_date: {
          gte: today,
          lte: futureDate,
        },
        OR: [
          { nit_last_digits: nitLastDigit },
          { nit_last_digits: null },
        ],
      },
      include: {
        tax_obligation_type: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
      orderBy: { due_date: 'asc' },
    });

    // 4. Calcular días restantes para cada obligación
    const obligations = dates.map(date => {
      const daysRemaining = Math.ceil(
        (date.due_date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        ...date,
        daysRemaining,
        urgency: daysRemaining <= 3 ? 'urgent' : daysRemaining <= 7 ? 'soon' : 'normal',
      };
    });

    return {
      company: {
        id: companyId,
        name: company.company_name,
        nit: company.nit,
        nitLastDigit,
      },
      daysAhead,
      totalObligations: obligations.length,
      obligations,
    };
  }

  /**
   * Obtiene el historial de sincronizaciones
   * Deshabilitado temporalmente - tabla no sincronizada con schema
   * TODO: Ejecutar migración para sincronizar tabla tax_calendar_sync_logs
   */
  async getSyncLogs(limit: number = 20) {
    // return await this.prisma.taxCalendarSyncLog.findMany({
    //   take: limit,
    //   orderBy: { created_at: 'desc' },
    // });
    return [];
  }

  /**
   * Guarda las fechas parseadas en la base de datos
   */
  private async saveParsedDates(parseResult: PdfParseResult): Promise<void> {
    const { year, dates } = parseResult;

    this.logger.debug(`Guardando ${dates.length} fechas para año ${year}`);

    // 1. Eliminar fechas existentes del año (reemplazar)
    const deleted = await this.prisma.taxCalendarDate.deleteMany({
      where: { year },
    });

    this.logger.debug(`Eliminadas ${deleted.count} fechas antiguas del año ${year}`);

    // 2. Obtener mapeo de códigos a IDs
    const taxTypes = await this.prisma.taxObligationType.findMany({
      select: { id: true, code: true },
    });

    const codeToId = new Map(taxTypes.map(t => [t.code, t.id]));

    // 3. Preparar datos para inserción
    const dataToInsert = dates
      .filter(date => codeToId.has(date.taxObligationTypeCode))
      .map(date => ({
        year: date.year,
        tax_obligation_type_id: codeToId.get(date.taxObligationTypeCode)!,
        period_name: date.periodName,
        period_start_month: date.periodStartMonth || null,
        period_end_month: date.periodEndMonth || null,
        installment_number: date.installmentNumber,
        installment_description: date.installmentDescription || null,
        nit_last_digits: date.nitLastDigits || null,
        due_date: date.dueDate,
        due_month_name: date.dueMonthName,
        due_day: date.dueDay,
        is_declaration: date.isDeclaration,
        is_payment: date.isPayment,
        source_url: parseResult.sourceUrl || null,
      }));

    // 4. Insertar en batch
    if (dataToInsert.length > 0) {
      await this.prisma.taxCalendarDate.createMany({
        data: dataToInsert,
        skipDuplicates: true,
      });

      this.logger.debug(`✅ Insertadas ${dataToInsert.length} fechas en la base de datos`);
    } else {
      this.logger.warn(`⚠️  No hay fechas válidas para insertar`);
    }
  }

  // TODO: Descomentar y ajustar cuando se actualice el schema de TaxCalendarSyncLog
  // private async createSyncLog(data: {
  //   year: number;
  //   sourceType: string;
  //   sourceUrl?: string;
  //   totalDatesImported: number;
  //   taxTypesDetected: string[];
  //   parseErrors: string[];
  //   parseWarnings: string[];
  //   success: boolean;
  // }): Promise<void> {
  //   await this.prisma.taxCalendarSyncLog.create({
  //     data: {
  //       year: data.year,
  //       source_type: data.sourceType,
  //       source_url: data.sourceUrl || null,
  //       total_dates_imported: data.totalDatesImported,
  //       tax_types_detected: data.taxTypesDetected,
  //       parse_errors: data.parseErrors,
  //       parse_warnings: data.parseWarnings,
  //       success: data.success,
  //     },
  //   });
  // }
}
