import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Param,
  Request,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { CompanySettingsService } from './company-settings.service';
import { UpsertSettingDto, BulkUpsertSettingsDto } from './dto';
import { JwtAuthGuard, RequirePermissions, Audit } from '@contagracia/shared-modules';

@ApiTags('Configuración de Empresa (HR)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('company-settings')
export class CompanySettingsController {
  constructor(private readonly settingsService: CompanySettingsService) {}

  /**
   * Listar todas las configuraciones agrupadas por categoría
   * Permiso: config.view
   */
  @Get()
  @RequirePermissions('config.view')
  @ApiOperation({ summary: 'Listar todas las configuraciones de empresa' })
  @ApiResponse({ status: 200, description: 'Configuraciones agrupadas por categoría' })
  async findAll(@Request() req: any) {
    const companyId = req.user.company_id;
    return this.settingsService.findAll(companyId, companyId);
  }

  /**
   * Listar configuraciones por categoría
   * Permiso: config.view
   */
  @Get(':category')
  @RequirePermissions('config.view')
  @ApiOperation({ summary: 'Listar configuraciones de una categoría' })
  @ApiParam({
    name: 'category',
    description: 'Categoría (legal_params, social_security, overtime, work_schedule, work_hours, transportation, payroll_numbering)',
  })
  @ApiResponse({ status: 200, description: 'Configuraciones de la categoría' })
  async findByCategory(@Request() req: any, @Param('category') category: string) {
    const companyId = req.user.company_id;
    return this.settingsService.findByCategory(companyId, companyId, category);
  }

  /**
   * Obtener una configuración específica
   * Permiso: config.view
   */
  @Get(':category/:key')
  @RequirePermissions('config.view')
  @ApiOperation({ summary: 'Obtener valor de una configuración' })
  @ApiParam({ name: 'category', description: 'Categoría de la configuración' })
  @ApiParam({ name: 'key', description: 'Clave de la configuración' })
  @ApiResponse({ status: 200, description: 'Valor de la configuración' })
  @ApiResponse({ status: 404, description: 'Configuración no encontrada' })
  async findOne(
    @Request() req: any,
    @Param('category') category: string,
    @Param('key') key: string,
  ) {
    const companyId = req.user.company_id;
    return this.settingsService.findOne(companyId, companyId, category, key);
  }

  /**
   * Actualizar o crear una configuración
   * Permiso: payroll.configure
   */
  @Put(':category/:key')
  @RequirePermissions('payroll.configure')
  @Audit('company_setting.updated', 'company_setting')
  @ApiOperation({ summary: 'Actualizar configuración' })
  @ApiParam({ name: 'category', description: 'Categoría de la configuración' })
  @ApiParam({ name: 'key', description: 'Clave de la configuración' })
  @ApiResponse({ status: 200, description: 'Configuración actualizada' })
  @ApiResponse({ status: 400, description: 'Configuración de solo lectura' })
  async upsert(
    @Request() req: any,
    @Param('category') category: string,
    @Param('key') key: string,
    @Body() dto: UpsertSettingDto,
  ) {
    const companyId = req.user.company_id;
    return this.settingsService.upsert(companyId, companyId, category, key, dto);
  }

  /**
   * Actualizar múltiples configuraciones
   * Permiso: payroll.configure
   */
  @Post('bulk')
  @RequirePermissions('payroll.configure')
  @Audit('company_settings.bulk_updated', 'company_setting')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Actualizar múltiples configuraciones' })
  @ApiResponse({ status: 200, description: 'Configuraciones actualizadas' })
  async bulkUpsert(@Request() req: any, @Body() dto: BulkUpsertSettingsDto) {
    const companyId = req.user.company_id;
    return this.settingsService.bulkUpsert(companyId, companyId, dto);
  }

  /**
   * Inicializar configuraciones por defecto Colombia 2025
   * Permiso: payroll.configure
   */
  @Post('initialize')
  @RequirePermissions('payroll.configure')
  @Audit('company_settings.initialized', 'company_setting')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Inicializar configuraciones por defecto (Colombia 2025)' })
  @ApiResponse({ status: 200, description: 'Configuraciones inicializadas' })
  async initialize(@Request() req: any) {
    const companyId = req.user.company_id;
    return this.settingsService.initialize(companyId, companyId);
  }
}
