import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Query,
  Body,
  Request,
  Res,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiConsumes } from '@nestjs/swagger';
import { Audit } from '@contagracia/shared-modules';
import { Response } from 'express';
import { PeriodsService } from './periods.service';
import { OpeningBalanceTemplateService } from './opening-balance-template.service';
import { OpeningBalanceImportService } from './opening-balance-import.service';
import {
  CreatePeriodDto,
  UpdatePeriodDto,
  QueryPeriodDto,
  CreatePeriodActionDto,
  QueryPeriodActionDto,
  ClosePeriodDto,
} from './dto';

@ApiTags('accounting-periods')
@Controller('accounting-periods')
export class PeriodsController {
  constructor(
    private readonly periodsService: PeriodsService,
    private readonly openingBalanceTemplateService: OpeningBalanceTemplateService,
    private readonly openingBalanceImportService: OpeningBalanceImportService,
  ) {}

  // ============ PERÍODOS ============

  @Get()
  @ApiOperation({ summary: 'Listar períodos contables con búsqueda y paginación' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'year', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'is_annual', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'Lista de períodos contables' })
  async findAll(@Request() req: any, @Query() query: QueryPeriodDto) {
    return this.periodsService.findAll(req.user.company_id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener período por ID' })
  @ApiResponse({ status: 200, description: 'Detalle del período' })
  @ApiResponse({ status: 404, description: 'Período no encontrado' })
  async findOne(@Request() req: any, @Param('id') id: string) {
    return this.periodsService.findOne(req.user.company_id, id);
  }

  @Post()
  @Audit('period.created', 'period')
  @ApiOperation({ summary: 'Crear período contable' })
  @ApiResponse({ status: 201, description: 'Período creado' })
  @ApiResponse({ status: 400, description: 'Fechas superpuestas o máximo de activos' })
  async create(@Request() req: any, @Body() dto: CreatePeriodDto) {
    return this.periodsService.create(req.user.company_id, dto, req.user.sub);
  }

  @Put(':id')
  @Audit('period.updated', 'period')
  @ApiOperation({ summary: 'Actualizar período (solo si está abierto)' })
  @ApiResponse({ status: 200, description: 'Período actualizado' })
  @ApiResponse({ status: 400, description: 'Período cerrado no editable' })
  async update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdatePeriodDto) {
    return this.periodsService.update(req.user.company_id, id, dto);
  }

  @Get(':id/closing-preview')
  @ApiOperation({ summary: 'Obtener preview de cierre (saldos de cuentas 4, 5, 6 y utilidad)' })
  @ApiResponse({ status: 200, description: 'Preview de cierre con utilidad neta' })
  @ApiResponse({ status: 404, description: 'Período no encontrado' })
  async getClosingPreview(@Request() req: any, @Param('id') id: string) {
    return this.periodsService.getClosingPreview(req.user.company_id, id);
  }

  @Post(':id/close')
  @Audit('period.closed', 'period')
  @ApiOperation({ summary: 'Cerrar período contable (genera asientos de cierre y apertura)' })
  @ApiResponse({ status: 200, description: 'Período cerrado con asientos generados' })
  @ApiResponse({ status: 400, description: 'Período ya cerrado o cuentas inválidas' })
  async close(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: ClosePeriodDto,
  ) {
    return this.periodsService.close(req.user.company_id, id, req.user.sub, dto);
  }

  @Post(':id/reopen')
  @Audit('period.reopened', 'period')
  @ApiOperation({ summary: 'Reabrir período' })
  @ApiResponse({ status: 200, description: 'Período reabierto' })
  @ApiResponse({ status: 400, description: 'Período no está cerrado' })
  async reopen(
    @Request() req: any,
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ) {
    return this.periodsService.reopen(req.user.company_id, id, req.user.sub, reason);
  }

  // ============ SALDOS INICIALES ============

  @Get(':id/opening-balance-template')
  @ApiOperation({ summary: 'Descargar plantilla Excel para importar saldos iniciales' })
  @ApiResponse({ status: 200, description: 'Archivo Excel con plantilla' })
  async downloadOpeningBalanceTemplate(
    @Request() req: any,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const workbook = await this.openingBalanceTemplateService.generateTemplate(req.user.company_id);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=plantilla_saldos_iniciales.xlsx',
    );

    await workbook.xlsx.write(res);
    res.end();
  }

  @Post(':id/preview-opening-balance')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Preview de saldos iniciales desde Excel (sin crear nada)' })
  @ApiResponse({ status: 200, description: 'Preview generado' })
  @ApiResponse({ status: 400, description: 'Errores de validación en el archivo' })
  async previewOpeningBalance(
    @Request() req: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No se proporcionó ningún archivo');
    }
    return this.openingBalanceImportService.previewOpeningBalance(
      req.user.company_id,
      file.buffer,
    );
  }

  @Post(':id/import-opening-balance')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Importar saldos iniciales desde Excel' })
  @ApiResponse({ status: 201, description: 'Saldos importados exitosamente' })
  @ApiResponse({ status: 400, description: 'Errores de validación en el archivo' })
  async importOpeningBalance(
    @Request() req: any,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('description') description?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No se proporcionó ningún archivo');
    }
    return this.openingBalanceImportService.importOpeningBalance(
      req.user.company_id,
      id,
      req.user.sub,
      file.buffer,
      description,
    );
  }

  @Post(':id/actions/:actionId/reverse-opening-balance')
  @ApiOperation({ summary: 'Reversar importación de saldos iniciales' })
  @ApiResponse({ status: 200, description: 'Saldos iniciales reversados' })
  @ApiResponse({ status: 400, description: 'La acción no es reversable' })
  async reverseOpeningBalance(
    @Request() req: any,
    @Param('id') id: string,
    @Param('actionId') actionId: string,
  ) {
    return this.openingBalanceImportService.reverseOpeningBalance(
      req.user.company_id,
      id,
      actionId,
      req.user.sub,
    );
  }

  // ============ ACCIONES ============

  @Get(':id/actions')
  @ApiOperation({ summary: 'Listar acciones de un período' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'action', required: false })
  @ApiQuery({ name: 'from_date', required: false })
  @ApiQuery({ name: 'to_date', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'Lista de acciones' })
  async findActions(
    @Request() req: any,
    @Param('id') periodId: string,
    @Query() query: QueryPeriodActionDto,
  ) {
    return this.periodsService.findActions(req.user.company_id, periodId, query);
  }

  @Post(':id/actions')
  @Audit('period.action_executed', 'period')
  @ApiOperation({ summary: 'Crear acción manual' })
  @ApiResponse({ status: 201, description: 'Acción creada' })
  async createAction(
    @Request() req: any,
    @Param('id') periodId: string,
    @Body() dto: CreatePeriodActionDto,
  ) {
    return this.periodsService.createAction(req.user.company_id, periodId, req.user.sub, dto);
  }
}
