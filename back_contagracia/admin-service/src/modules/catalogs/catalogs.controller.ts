import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { CatalogsService } from './catalogs.service';
import { Audit, Public } from '@contagracia/shared-modules';

@ApiTags('catalogs')
@ApiBearerAuth('JWT-auth')
@Controller('admin/catalogs')
export class CatalogsController {
  constructor(private readonly catalogsService: CatalogsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Listar catálogos disponibles' })
  @ApiResponse({ status: 200, description: 'Lista de nombres de catálogos' })
  getAvailableCatalogs() {
    return this.catalogsService.getAvailableCatalogs();
  }

  @Public()
  @Get(':table')
  @ApiOperation({ summary: 'Listar registros de un catálogo con búsqueda y paginación' })
  @ApiParam({
    name: 'table',
    description: 'Nombre del catálogo (ej: countries, departments, banks)',
  })
  @ApiQuery({ name: 'active', required: false, type: Boolean, description: 'Filtrar por estado activo' })
  @ApiQuery({ name: 'search', required: false, description: 'Buscar por nombre (fuzzy)' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Página (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Límite por página (default: 50)' })
  @ApiResponse({ status: 200, description: 'Lista de registros con paginación' })
  @ApiResponse({ status: 400, description: 'Catálogo no válido' })
  findAll(
    @Param('table') table: string,
    @Query('active') active?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.catalogsService.findAll(table, {
      is_active: active !== undefined ? active === 'true' : undefined,
      search,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Public()
  @Get(':table/:id')
  @ApiOperation({ summary: 'Obtener un registro por ID' })
  @ApiResponse({ status: 200, description: 'Registro encontrado' })
  @ApiResponse({ status: 404, description: 'Registro no encontrado' })
  findOne(@Param('table') table: string, @Param('id') id: string) {
    // Convertir a número si es necesario (para IDs numéricos)
    const parsedId = isNaN(Number(id)) ? id : Number(id);
    return this.catalogsService.findOne(table, parsedId);
  }

  @Post(':table')
  @Audit('catalog.created', 'catalog')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear un registro en el catálogo' })
  @ApiResponse({ status: 201, description: 'Registro creado' })
  @ApiResponse({ status: 400, description: 'Datos inválidos o duplicado' })
  create(@Param('table') table: string, @Body() data: Record<string, any>) {
    return this.catalogsService.create(table, data);
  }

  @Patch(':table/:id')
  @Audit('catalog.updated', 'catalog')
  @ApiOperation({ summary: 'Actualizar un registro' })
  @ApiResponse({ status: 200, description: 'Registro actualizado' })
  @ApiResponse({ status: 404, description: 'Registro no encontrado' })
  update(
    @Param('table') table: string,
    @Param('id') id: string,
    @Body() data: Record<string, any>,
  ) {
    const parsedId = isNaN(Number(id)) ? id : Number(id);
    return this.catalogsService.update(table, parsedId, data);
  }

  @Delete(':table/:id')
  @Audit('catalog.deleted', 'catalog')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar un registro' })
  @ApiResponse({ status: 200, description: 'Registro eliminado' })
  @ApiResponse({ status: 400, description: 'Tiene registros relacionados' })
  @ApiResponse({ status: 404, description: 'Registro no encontrado' })
  remove(@Param('table') table: string, @Param('id') id: string) {
    const parsedId = isNaN(Number(id)) ? id : Number(id);
    return this.catalogsService.remove(table, parsedId);
  }

  // Endpoints especiales para jerarquía geográfica
  @Public()
  @Get('departments/by-country/:countryId')
  @ApiOperation({ summary: 'Listar departamentos por país' })
  @ApiResponse({ status: 200, description: 'Lista de departamentos' })
  getDepartmentsByCountry(@Param('countryId') countryId: string) {
    return this.catalogsService.getDepartmentsByCountry(countryId);
  }

  @Public()
  @Get('municipalities/by-department/:departmentId')
  @ApiOperation({ summary: 'Listar municipios por departamento' })
  @ApiResponse({ status: 200, description: 'Lista de municipios' })
  getMunicipalitiesByDepartment(@Param('departmentId') departmentId: string) {
    return this.catalogsService.getMunicipalitiesByDepartment(departmentId);
  }
}
