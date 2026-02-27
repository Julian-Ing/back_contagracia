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
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { CostCentersService } from './cost-centers.service';
import { CreateCostCenterDto, UpdateCostCenterDto } from './dto';

@ApiTags('cost-centers')
@Controller('cost-centers')
export class CostCentersController {
  constructor(private readonly costCentersService: CostCentersService) {}

  @Get()
  @ApiOperation({ summary: 'Listar centros de costos (plano o árbol)' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'includeInactive', required: false })
  @ApiQuery({ name: 'tree', required: false })
  @ApiResponse({ status: 200, description: 'Lista de centros de costos' })
  async findAll(
    @Request() req: any,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('includeInactive') includeInactive?: string,
    @Query('tree') tree?: string,
  ) {
    return this.costCentersService.findAll(req.user.company_id, {
      search,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      includeInactive: includeInactive === 'true',
      tree: tree === 'true',
    });
  }

  @Get('movement-types')
  @ApiOperation({ summary: 'Listar tipos de movimiento de centro de costos' })
  @ApiResponse({ status: 200, description: 'Lista de tipos de movimiento' })
  async getMovementTypes(@Request() req: any) {
    return this.costCentersService.getMovementTypes(req.user.company_id);
  }

  @Get('movement-reference-types')
  @ApiOperation({ summary: 'Listar tipos de referencia de movimiento' })
  @ApiResponse({ status: 200, description: 'Lista de tipos de referencia' })
  async getMovementReferenceTypes(@Request() req: any) {
    return this.costCentersService.getMovementReferenceTypes(req.user.company_id);
  }

  @Get(':id/movements')
  @ApiOperation({ summary: 'Listar movimientos de un centro de costos' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'type_key', required: false })
  @ApiQuery({ name: 'reference_type_key', required: false })
  @ApiQuery({ name: 'from_date', required: false })
  @ApiQuery({ name: 'to_date', required: false })
  @ApiQuery({ name: 'sign', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'Movimientos paginados' })
  async findMovements(
    @Request() req: any,
    @Param('id') id: string,
    @Query('search') search?: string,
    @Query('type_key') type_key?: string,
    @Query('reference_type_key') reference_type_key?: string,
    @Query('from_date') from_date?: string,
    @Query('to_date') to_date?: string,
    @Query('sign') sign?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.costCentersService.findMovements(req.user.company_id, id, {
      search,
      type_key,
      reference_type_key,
      from_date,
      to_date,
      sign,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener centro de costos por ID' })
  @ApiResponse({ status: 200, description: 'Centro de costos encontrado' })
  @ApiResponse({ status: 404, description: 'No encontrado' })
  async findOne(@Request() req: any, @Param('id') id: string) {
    return this.costCentersService.findOne(req.user.company_id, id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear centro de costos' })
  @ApiResponse({ status: 201, description: 'Centro de costos creado' })
  @ApiResponse({ status: 409, description: 'Nombre duplicado en el mismo nivel' })
  async create(@Request() req: any, @Body() dto: CreateCostCenterDto) {
    return this.costCentersService.create(req.user.company_id, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar centro de costos' })
  @ApiResponse({ status: 200, description: 'Centro de costos actualizado' })
  @ApiResponse({ status: 404, description: 'No encontrado' })
  @ApiResponse({ status: 409, description: 'Nombre duplicado en el mismo nivel' })
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateCostCenterDto,
  ) {
    return this.costCentersService.update(req.user.company_id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar o desactivar centro de costos' })
  @ApiResponse({ status: 200, description: 'Eliminado o desactivado' })
  @ApiResponse({ status: 404, description: 'No encontrado' })
  async delete(@Request() req: any, @Param('id') id: string) {
    return this.costCentersService.delete(req.user.company_id, id);
  }

  @Put(':id/reactivate')
  @ApiOperation({ summary: 'Reactivar centro de costos desactivado' })
  @ApiResponse({ status: 200, description: 'Centro de costos reactivado' })
  @ApiResponse({ status: 404, description: 'No encontrado' })
  @ApiResponse({ status: 400, description: 'Ya está activo o padre inactivo' })
  async reactivate(@Request() req: any, @Param('id') id: string) {
    return this.costCentersService.reactivate(req.user.company_id, id);
  }
}
