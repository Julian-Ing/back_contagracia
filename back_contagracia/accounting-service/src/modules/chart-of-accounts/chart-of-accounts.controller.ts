import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBody } from '@nestjs/swagger';
import { Audit } from '@contagracia/shared-modules';
import { ChartOfAccountsService, CreateAccountDto, UpdateAccountDto } from './chart-of-accounts.service';

@ApiTags('chart-of-accounts')
@Controller('chart-of-accounts')
export class ChartOfAccountsController {
  constructor(private readonly chartOfAccountsService: ChartOfAccountsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar cuentas con búsqueda, filtro y paginación' })
  @ApiQuery({ name: 'search', required: false, description: 'Buscar por código o nombre' })
  @ApiQuery({ name: 'type', required: false, description: 'Filtrar por tipo de cuenta' })
  @ApiQuery({ name: 'code_prefix', required: false, description: 'Filtrar por prefijo de código (ej: 13 para CxC, 22 para CxP)' })
  @ApiQuery({ name: 'include_prefixes', required: false, description: 'Incluir cuentas con estos prefijos (separados por coma)' })
  @ApiQuery({ name: 'exclude_prefixes', required: false, description: 'Excluir cuentas con estos prefijos (separados por coma)' })
  @ApiQuery({ name: 'flat', required: false, description: 'Si es true, retorna lista plana sin árbol (para selects)' })
  @ApiQuery({ name: 'page', required: false, description: 'Número de página (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Límite por página (default: 100)' })
  @ApiResponse({ status: 200, description: 'Lista de cuentas' })
  async findAll(
    @Request() req: any,
    @Query('search') search?: string,
    @Query('type') type?: string,
    @Query('code_prefix') code_prefix?: string,
    @Query('include_prefixes') include_prefixes?: string,
    @Query('exclude_prefixes') exclude_prefixes?: string,
    @Query('flat') flat?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.chartOfAccountsService.findAll(req.user.company_id, {
      search,
      type,
      code_prefix,
      include_prefixes,
      exclude_prefixes,
      flat: flat === 'true',
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(':code')
  @ApiOperation({ summary: 'Obtener cuenta por código' })
  @ApiResponse({ status: 200, description: 'Detalle de la cuenta' })
  @ApiResponse({ status: 404, description: 'Cuenta no encontrada' })
  async findOne(@Request() req: any, @Param('code') code: string) {
    return this.chartOfAccountsService.findOne(req.user.company_id, code);
  }

  @Post()
  @Audit('chart_of_account.created', 'chart_of_account')
  @ApiOperation({ summary: 'Crear nueva cuenta' })
  @ApiBody({ type: Object, description: 'Datos de la cuenta' })
  @ApiResponse({ status: 201, description: 'Cuenta creada exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 409, description: 'La cuenta ya existe' })
  async create(@Request() req: any, @Body() dto: CreateAccountDto) {
    return this.chartOfAccountsService.create(req.user.company_id, dto);
  }

  @Put(':code')
  @Audit('chart_of_account.updated', 'chart_of_account')
  @ApiOperation({ summary: 'Actualizar cuenta' })
  @ApiBody({ type: Object, description: 'Datos a actualizar' })
  @ApiResponse({ status: 200, description: 'Cuenta actualizada exitosamente' })
  @ApiResponse({ status: 404, description: 'Cuenta no encontrada' })
  async update(
    @Request() req: any,
    @Param('code') code: string,
    @Body() dto: UpdateAccountDto,
  ) {
    return this.chartOfAccountsService.update(req.user.company_id, code, dto);
  }

  @Delete(':code')
  @Audit('chart_of_account.deleted', 'chart_of_account')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar cuenta permanentemente' })
  @ApiResponse({ status: 200, description: 'Cuenta eliminada' })
  @ApiResponse({ status: 404, description: 'Cuenta no encontrada' })
  @ApiResponse({ status: 409, description: 'No se puede eliminar (tiene dependencias)' })
  async delete(@Request() req: any, @Param('code') code: string) {
    return this.chartOfAccountsService.delete(req.user.company_id, code);
  }
}
