import { Controller, Get, Post, Put, Delete, Query, Param, Body, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { Audit } from '@contagracia/shared-modules';
import { TaxesService } from './taxes.service';
import { CreateTaxDto, UpdateTaxDto } from './dto';

@ApiTags('taxes')
@Controller('taxes')
export class TaxesController {
  constructor(private readonly taxesService: TaxesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar impuestos y retenciones' })
  @ApiQuery({ name: 'search', required: false, description: 'Buscar por nombre o código' })
  @ApiQuery({ name: 'is_tax', required: false, description: 'true=impuestos, false=retenciones' })
  @ApiQuery({ name: 'tax_type_id', required: false, description: 'Filtrar por tipo de impuesto' })
  @ApiQuery({ name: 'page', required: false, description: 'Página (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Límite por página (default: 20)' })
  @ApiResponse({ status: 200, description: 'Lista de impuestos' })
  async findAll(
    @Request() req: any,
    @Query('search') search?: string,
    @Query('is_tax') is_tax?: string,
    @Query('tax_type_id') tax_type_id?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.taxesService.findAll(req.user.company_id, {
      search,
      is_tax: is_tax !== undefined ? is_tax === 'true' : undefined,
      tax_type_id: tax_type_id ? parseInt(tax_type_id, 10) : undefined,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('for-select')
  @ApiOperation({ summary: 'Listar impuestos para select (ligero)' })
  @ApiQuery({ name: 'search', required: false, description: 'Buscar por nombre' })
  @ApiQuery({ name: 'is_tax', required: false, description: 'true=impuestos, false=retenciones' })
  @ApiQuery({ name: 'include_type_ids', required: false, description: 'IDs de tipo a incluir (separados por coma)' })
  @ApiQuery({ name: 'exclude_type_ids', required: false, description: 'IDs de tipo a excluir (separados por coma)' })
  @ApiQuery({ name: 'exclude_cost_tax', required: false, description: 'Excluir impuestos a mayor costo' })
  @ApiResponse({ status: 200, description: 'Lista ligera de impuestos {id, name, rate, tax_type_id}' })
  async findForSelect(
    @Request() req: any,
    @Query('search') search?: string,
    @Query('is_tax') is_tax?: string,
    @Query('include_type_ids') include_type_ids?: string,
    @Query('exclude_type_ids') exclude_type_ids?: string,
    @Query('exclude_cost_tax') exclude_cost_tax?: string,
  ) {
    return this.taxesService.findForSelect(req.user.company_id, {
      search,
      is_tax: is_tax !== undefined ? is_tax === 'true' : undefined,
      includeTypeIds: include_type_ids ? include_type_ids.split(',').map(Number) : undefined,
      excludeTypeIds: exclude_type_ids ? exclude_type_ids.split(',').map(Number) : undefined,
      excludeCostTax: exclude_cost_tax === 'true',
    });
  }

  @Get('types')
  @ApiOperation({ summary: 'Listar tipos de impuestos para select' })
  @ApiQuery({ name: 'is_tax', required: false, description: 'true=impuestos, false=retenciones' })
  @ApiResponse({ status: 200, description: 'Lista de tipos de impuestos' })
  async findAllTaxTypes(@Request() req: any, @Query('is_tax') is_tax?: string) {
    return this.taxesService.findAllTaxTypes(
      req.user.company_id,
      is_tax !== undefined ? is_tax === 'true' : undefined,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener impuesto por ID' })
  @ApiResponse({ status: 200, description: 'Detalle del impuesto' })
  async findOne(@Request() req: any, @Param('id') id: string) {
    return this.taxesService.findOne(req.user.company_id, id);
  }

  @Get(':id/can-delete')
  @ApiOperation({ summary: 'Verificar si se puede eliminar un impuesto' })
  @ApiResponse({ status: 200, description: 'Información sobre si se puede eliminar' })
  async canDelete(@Request() req: any, @Param('id') id: string) {
    return this.taxesService.canDelete(req.user.company_id, id);
  }

  @Post()
  @Audit('tax.created', 'tax')
  @ApiOperation({ summary: 'Crear impuesto o retención' })
  @ApiResponse({ status: 201, description: 'Impuesto creado' })
  async create(@Request() req: any, @Body() dto: CreateTaxDto) {
    return this.taxesService.create(req.user.company_id, dto);
  }

  @Put(':id')
  @Audit('tax.updated', 'tax')
  @ApiOperation({ summary: 'Actualizar impuesto' })
  @ApiResponse({ status: 200, description: 'Impuesto actualizado' })
  async update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateTaxDto) {
    return this.taxesService.update(req.user.company_id, id, dto);
  }

  @Delete(':id')
  @Audit('tax.deleted', 'tax')
  @ApiOperation({ summary: 'Eliminar impuesto' })
  @ApiResponse({ status: 200, description: 'Impuesto eliminado' })
  async delete(@Request() req: any, @Param('id') id: string) {
    return this.taxesService.delete(req.user.company_id, id);
  }
}
