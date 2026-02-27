import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UploadedFile,
  UseInterceptors,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Audit } from '@contagracia/shared-modules';
import { TaxCalendarService } from './tax-calendar.service';
import { ReminderJob } from './jobs/reminder.job';
import {
  ParsePdfDto,
  SyncCalendarDto,
  SyncFromUrlDto,
  GetCalendarDto,
  GetUpcomingDto,
} from './dto';

@ApiTags('Tax Calendar')
@ApiBearerAuth('JWT-auth')
@Controller('tax-calendar')
export class TaxCalendarController {
  constructor(
    private readonly taxCalendarService: TaxCalendarService,
    private readonly reminderJob: ReminderJob,
  ) {}

  // ============================================
  // ENDPOINTS DE SINCRONIZACIÓN
  // ============================================

  /**
   * Permission: tax-calendar.parse-pdf
   * Parsea un PDF sin guardar en base de datos (solo para vista previa/testing)
   */
  @Post('parse-pdf')
  @Audit('tax_calendar.parsed_pdf', 'tax_calendar')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Parsear PDF sin guardar (preview)',
    description: 'Parsea un PDF del calendario DIAN sin guardarlo en la base de datos. Útil para testing y preview.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Archivo PDF del calendario tributario',
        },
        year: {
          type: 'number',
          example: 2026,
          description: 'Año del calendario',
        },
      },
      required: ['file', 'year'],
    },
  })
  @ApiResponse({ status: 200, description: 'PDF parseado exitosamente' })
  @ApiResponse({ status: 400, description: 'Archivo inválido o año inválido' })
  async parsePdf(
    @UploadedFile() file: Express.Multer.File,
    @Body('year', ParseIntPipe) year: number,
  ) {
    if (!file) {
      throw new BadRequestException('No se proporcionó ningún archivo PDF');
    }

    if (!file.mimetype.includes('pdf')) {
      throw new BadRequestException('El archivo debe ser un PDF');
    }

    return await this.taxCalendarService.parsePdf(file.buffer, year);
  }

  /**
   * Permission: tax-calendar.sync-from-pdf
   * Parsea un PDF subido y guarda las fechas en base de datos
   */
  @Post('sync-from-pdf')
  @Audit('tax_calendar.synced_from_pdf', 'tax_calendar')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Sincronizar desde PDF subido',
    description: 'Parsea un PDF del calendario DIAN y guarda todas las fechas en la base de datos.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Archivo PDF del calendario tributario',
        },
        year: {
          type: 'number',
          example: 2026,
          description: 'Año del calendario',
        },
      },
      required: ['file', 'year'],
    },
  })
  @ApiResponse({ status: 201, description: 'Calendario sincronizado exitosamente' })
  @ApiResponse({ status: 400, description: 'Error en el archivo o parseo fallido' })
  async syncFromPdf(
    @UploadedFile() file: Express.Multer.File,
    @Body('year', ParseIntPipe) year: number,
  ) {
    if (!file) {
      throw new BadRequestException('No se proporcionó ningún archivo PDF');
    }

    if (!file.mimetype.includes('pdf')) {
      throw new BadRequestException('El archivo debe ser un PDF');
    }

    return await this.taxCalendarService.syncFromPdf(file.buffer, year);
  }

  /**
   * Permission: tax-calendar.sync-from-url
   * Parsea un PDF desde URL y guarda las fechas en base de datos
   */
  @Post('sync-from-url')
  @Audit('tax_calendar.synced_from_url', 'tax_calendar')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Sincronizar desde URL de PDF',
    description: 'Descarga un PDF desde una URL, lo parsea y guarda las fechas en la base de datos.',
  })
  @ApiBody({ type: SyncFromUrlDto })
  @ApiResponse({ status: 201, description: 'Calendario sincronizado exitosamente' })
  @ApiResponse({ status: 400, description: 'URL inválida o parseo fallido' })
  @ApiResponse({ status: 404, description: 'PDF no encontrado en la URL' })
  async syncFromUrl(@Body() dto: SyncFromUrlDto) {
    // Descargar PDF desde URL
    const axios = require('axios');
    const response = await axios.get(dto.url, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data);

    return await this.taxCalendarService.syncFromPdf(buffer, dto.year, dto.url);
  }

  /**
   * Permission: tax-calendar.sync-from-dian
   * Descarga automáticamente el PDF desde DIAN y sincroniza
   */
  @Post('sync/:year')
  @Audit('tax_calendar.synced_from_dian', 'tax_calendar')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Sincronizar desde DIAN',
    description: 'Descarga automáticamente el calendario del año especificado desde DIAN y lo sincroniza.',
  })
  @ApiParam({
    name: 'year',
    description: 'Año del calendario a sincronizar',
    example: 2026,
  })
  @ApiResponse({ status: 201, description: 'Calendario sincronizado exitosamente desde DIAN' })
  @ApiResponse({ status: 400, description: 'Año inválido o parseo fallido' })
  @ApiResponse({ status: 404, description: 'Calendario no disponible en DIAN para ese año' })
  async syncFromDian(@Param('year', ParseIntPipe) year: number) {
    return await this.taxCalendarService.syncFromDian(year);
  }

  /**
   * Permission: tax-calendar.view-status
   * Verifica si un año está cargado en la base de datos
   */
  @Get('status/:year')
  @ApiOperation({
    summary: 'Verificar estado del calendario',
    description: 'Verifica si el calendario de un año específico está cargado en la base de datos.',
  })
  @ApiParam({
    name: 'year',
    description: 'Año del calendario',
    example: 2026,
  })
  @ApiResponse({
    status: 200,
    description: 'Estado del calendario',
    schema: {
      type: 'object',
      properties: {
        loaded: { type: 'boolean', example: true },
        dateCount: { type: 'number', example: 153 },
        lastSync: { type: 'string', format: 'date-time', nullable: true },
      },
    },
  })
  async getStatus(@Param('year', ParseIntPipe) year: number) {
    return await this.taxCalendarService.getStatus(year);
  }

  /**
   * Permission: tax-calendar.view-sync-logs
   * Obtiene el historial de sincronizaciones
   */
  @Get('sync-logs')
  @ApiOperation({
    summary: 'Historial de sincronizaciones',
    description: 'Obtiene el historial de sincronizaciones realizadas.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Cantidad de logs a devolver',
    example: 20,
  })
  @ApiResponse({ status: 200, description: 'Lista de logs de sincronización' })
  async getSyncLogs(@Query('limit') limit?: number) {
    return await this.taxCalendarService.getSyncLogs(limit || 20);
  }

  // ============================================
  // ENDPOINTS DE CONSULTA
  // ============================================

  /**
   * Permission: tax-calendar.view-types
   * Lista todos los tipos de obligaciones tributarias
   */
  @Get('tipos')
  @ApiOperation({
    summary: 'Listar tipos de obligación tributaria',
    description: 'Obtiene el catálogo de todos los tipos de obligaciones tributarias DIAN.',
  })
  @ApiResponse({ status: 200, description: 'Lista de tipos de obligación' })
  async getObligationTypes() {
    return await this.taxCalendarService.getObligationTypes();
  }

  /**
   * Permission: tax-calendar.view-company-calendar
   * Obtiene el calendario de una empresa para un año/mes específico
   */
  @Get(':companyId/obligaciones')
  @ApiOperation({
    summary: 'Calendario de empresa',
    description: 'Obtiene todas las obligaciones tributarias de una empresa para un año y mes específico (filtrado por NIT).',
  })
  @ApiParam({
    name: 'companyId',
    description: 'ID de la empresa',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiQuery({
    name: 'year',
    description: 'Año del calendario',
    example: 2026,
    required: true,
  })
  @ApiQuery({
    name: 'month',
    description: 'Mes del calendario (1-12). Opcional: si no se especifica, devuelve todo el año',
    example: 3,
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Calendario de obligaciones de la empresa',
  })
  async getCompanyCalendar(
    @Param('companyId') companyId: string,
    @Query('year', ParseIntPipe) year: number,
    @Query('month') month?: number,
  ) {
    const monthNum = month ? parseInt(String(month), 10) : undefined;
    return await this.taxCalendarService.getCompanyCalendar(companyId, year, monthNum);
  }

  /**
   * Permission: tax-calendar.view-upcoming
   * Obtiene las próximas obligaciones de una empresa
   */
  @Get(':companyId/proximas')
  @ApiOperation({
    summary: 'Próximas obligaciones',
    description: 'Obtiene las obligaciones tributarias próximas a vencer para una empresa (con clasificación de urgencia).',
  })
  @ApiParam({
    name: 'companyId',
    description: 'ID de la empresa',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiQuery({
    name: 'daysAhead',
    description: 'Días hacia adelante para buscar obligaciones (default: 30)',
    example: 30,
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de obligaciones próximas con clasificación de urgencia',
  })
  async getUpcomingObligations(
    @Param('companyId') companyId: string,
    @Query('daysAhead') daysAhead?: number,
  ) {
    const days = daysAhead ? parseInt(String(daysAhead), 10) : 30;
    return await this.taxCalendarService.getUpcomingObligations(companyId, days);
  }

  /**
   * Permission: tax-calendar.view-monthly
   * Vista mensual del calendario (para una empresa específica)
   */
  @Get(':companyId/mes/:year/:month')
  @ApiOperation({
    summary: 'Vista mensual del calendario',
    description: 'Obtiene el calendario mensual de una empresa (específico para vistas de calendario UI).',
  })
  @ApiParam({
    name: 'companyId',
    description: 'ID de la empresa',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'year',
    description: 'Año del calendario',
    example: 2026,
  })
  @ApiParam({
    name: 'month',
    description: 'Mes del calendario (1-12)',
    example: 3,
  })
  @ApiResponse({
    status: 200,
    description: 'Calendario mensual de la empresa',
  })
  async getMonthlyCalendar(
    @Param('companyId') companyId: string,
    @Param('year', ParseIntPipe) year: number,
    @Param('month', ParseIntPipe) month: number,
  ) {
    return await this.taxCalendarService.getCompanyCalendar(companyId, year, month);
  }

  // ============================================
  // ENDPOINTS DE RECORDATORIOS
  // ============================================

  /**
   * Permission: tax-calendar.execute-reminders
   * Ejecuta el job de recordatorios manualmente
   */
  @Post('recordatorios/ejecutar')
  @Audit('tax_calendar.reminders_executed', 'tax_calendar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Ejecutar recordatorios manualmente',
    description: 'Ejecuta el job de recordatorios para todas las empresas activas (útil para testing o ejecución manual).',
  })
  @ApiQuery({
    name: 'daysAhead',
    required: false,
    description: 'Días hacia adelante (default: 30)',
    example: 30,
  })
  @ApiQuery({
    name: 'includeOverdue',
    required: false,
    description: 'Incluir obligaciones vencidas (default: true)',
    example: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Recordatorios ejecutados exitosamente',
    schema: {
      type: 'object',
      properties: {
        totalCompanies: { type: 'number', example: 15 },
        totalObligations: { type: 'number', example: 45 },
        notificationsSent: { type: 'number', example: 45 },
        errors: { type: 'number', example: 0 },
        duration: { type: 'number', example: 2.5 },
      },
    },
  })
  async executeReminders(
    @Query('daysAhead') daysAhead?: number,
    @Query('includeOverdue') includeOverdue?: string,
  ) {
    const daysAheadNum = daysAhead ? parseInt(String(daysAhead), 10) : undefined;
    const includeOverdueBool = includeOverdue !== undefined ? includeOverdue === 'true' : undefined;

    return await this.reminderJob.executeManually(daysAheadNum, includeOverdueBool);
  }

  /**
   * Permission: tax-calendar.test-reminder
   * Prueba recordatorios para una empresa específica
   */
  @Post('recordatorios/test/:companyId')
  @Audit('tax_calendar.reminder_tested', 'tax_calendar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Test recordatorios para empresa',
    description: 'Ejecuta el proceso de recordatorios para una empresa específica (testing).',
  })
  @ApiParam({
    name: 'companyId',
    description: 'ID de la empresa',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiQuery({
    name: 'daysAhead',
    required: false,
    description: 'Días hacia adelante (default: 30)',
    example: 30,
  })
  @ApiResponse({
    status: 200,
    description: 'Test ejecutado exitosamente',
  })
  async testReminderForCompany(
    @Param('companyId') companyId: string,
    @Query('daysAhead') daysAhead?: number,
  ) {
    const daysAheadNum = daysAhead ? parseInt(String(daysAhead), 10) : undefined;
    return await this.reminderJob.executeForCompany(companyId, daysAheadNum);
  }

  /**
   * Permission: tax-calendar.view-scheduler-status
   * Obtiene el estado del scheduler de recordatorios
   */
  @Get('recordatorios/scheduler-status')
  @ApiOperation({
    summary: 'Estado del scheduler',
    description: 'Obtiene información sobre la configuración del scheduler de recordatorios.',
  })
  @ApiResponse({
    status: 200,
    description: 'Estado del scheduler',
    schema: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean', example: true },
        cronExpression: { type: 'string', example: '0 7 * * *' },
        daysAhead: { type: 'number', example: 30 },
        includeOverdue: { type: 'boolean', example: true },
        overdueMaxDays: { type: 'number', example: 7 },
        nextExecution: { type: 'string', format: 'date-time' },
      },
    },
  })
  getSchedulerStatus() {
    // En una implementación real, esto vendría del scheduler de NestJS
    return {
      enabled: process.env.TAX_REMINDER_ENABLED !== 'false',
      cronExpression: process.env.TAX_REMINDER_CRON || '0 7 * * *',
      daysAhead: parseInt(process.env.TAX_REMINDER_DAYS_AHEAD || '30', 10),
      includeOverdue: process.env.TAX_REMINDER_INCLUDE_OVERDUE !== 'false',
      overdueMaxDays: parseInt(process.env.TAX_REMINDER_OVERDUE_DAYS || '7', 10),
      timezone: 'America/Bogota',
      message: 'Job se ejecuta automáticamente según el cron configurado',
    };
  }
}
