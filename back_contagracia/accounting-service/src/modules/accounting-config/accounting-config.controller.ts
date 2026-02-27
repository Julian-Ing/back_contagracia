import { Controller, Get, Patch, Post, Param, Body, Query, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { Audit } from '@contagracia/shared-modules';
import { AccountingConfigService, UpdateAccountingConfigDto } from './accounting-config.service';

@ApiTags('accounting-config')
@Controller('accounting-config')
export class AccountingConfigController {
  constructor(private readonly configService: AccountingConfigService) {}

  @Get()
  @ApiOperation({ summary: 'Listar configuraciones contables con paginación' })
  @ApiQuery({ name: 'search', required: false, description: 'Buscar por key o descripción' })
  @ApiQuery({ name: 'page', required: false, description: 'Número de página (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Límite por página (default: 20)' })
  @ApiResponse({ status: 200, description: 'Lista de configuraciones paginada' })
  async findAll(
    @Request() req: any,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.configService.findAll(
      req.user.company_id,
      search,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get(':key')
  @ApiOperation({ summary: 'Obtener una configuración por key' })
  @ApiResponse({ status: 200, description: 'Configuración encontrada' })
  @ApiResponse({ status: 404, description: 'Configuración no encontrada' })
  async findOne(
    @Request() req: any,
    @Param('key') key: string,
  ) {
    return this.configService.findOne(req.user.company_id, key);
  }

  @Patch(':key')
  @Audit('accounting_config.updated', 'accounting_config')
  @ApiOperation({ summary: 'Actualizar cuenta(s) de una configuración' })
  @ApiResponse({ status: 200, description: 'Configuración actualizada' })
  @ApiResponse({ status: 404, description: 'Configuración o cuenta no encontrada' })
  async update(
    @Request() req: any,
    @Param('key') key: string,
    @Body() dto: UpdateAccountingConfigDto,
  ) {
    return this.configService.update(req.user.company_id, key, dto);
  }

  @Post(':key/reset')
  @Audit('accounting_config.reset', 'accounting_config')
  @ApiOperation({ summary: 'Resetear configuración a valor por defecto' })
  @ApiResponse({ status: 200, description: 'Configuración reseteada' })
  @ApiResponse({ status: 404, description: 'Configuración no encontrada' })
  async resetToDefault(
    @Request() req: any,
    @Param('key') key: string,
  ) {
    return this.configService.resetToDefault(req.user.company_id, key);
  }
}
