import {
  Controller,
  Get,
  Param,
  Query,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { CatalogsService } from './catalogs.service';

@ApiTags('Catalogs')
@ApiBearerAuth('JWT-auth')
@Controller('catalogs')
export class CatalogsController {
  constructor(private readonly catalogsService: CatalogsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar catálogos disponibles' })
  @ApiResponse({ status: 200, description: 'Lista de nombres de catálogos' })
  getAvailableCatalogs() {
    return this.catalogsService.getAvailableCatalogs();
  }

  @Get('departments/by-country/:countryId')
  @ApiOperation({ summary: 'Departamentos por país (tenant DB)' })
  @ApiResponse({ status: 200, description: 'Lista de departamentos' })
  getDepartmentsByCountry(
    @Request() req: any,
    @Param('countryId') countryId: string,
  ) {
    const companyId = req.user.company_id;
    return this.catalogsService.getDepartmentsByCountry(companyId, countryId);
  }

  @Get('municipalities/by-department/:departmentId')
  @ApiOperation({ summary: 'Municipios por departamento (tenant DB)' })
  @ApiResponse({ status: 200, description: 'Lista de municipios' })
  getMunicipalitiesByDepartment(
    @Request() req: any,
    @Param('departmentId') departmentId: string,
  ) {
    const companyId = req.user.company_id;
    return this.catalogsService.getMunicipalitiesByDepartment(companyId, departmentId);
  }

  @Get(':table')
  @ApiOperation({ summary: 'Listar registros de un catálogo con búsqueda y paginación (tenant DB)' })
  @ApiParam({ name: 'table', description: 'Nombre del catálogo' })
  @ApiQuery({ name: 'active', required: false, type: Boolean })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Lista paginada de registros' })
  findAll(
    @Request() req: any,
    @Param('table') table: string,
    @Query('active') active?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const companyId = req.user.company_id;
    return this.catalogsService.findAll(companyId, table, {
      is_active: active !== undefined ? active === 'true' : undefined,
      search,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(':table/:id')
  @ApiOperation({ summary: 'Obtener un registro por ID' })
  @ApiResponse({ status: 200, description: 'Registro encontrado' })
  findOne(
    @Request() req: any,
    @Param('table') table: string,
    @Param('id') id: string,
  ) {
    const companyId = req.user.company_id;
    const parsedId = isNaN(Number(id)) ? id : Number(id);
    return this.catalogsService.findOne(companyId, table, parsedId);
  }
}
