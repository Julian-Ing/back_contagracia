import {
  Controller,
  Get,
  Post,
  Put,
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
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { CompaniesService } from './companies.service';
import {
  ManageSubscriptionDto,
  UpdateCompanyStatusDto,
  AssignCategoriesDto,
} from './dto';
import { Audit } from '@contagracia/shared-modules';

@ApiTags('companies')
@ApiBearerAuth('JWT-auth')
@Controller('admin/companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar compañías con filtros y paginación' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Página (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items por página (default: 15)' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Buscar por nombre, NIT o email' })
  @ApiQuery({ name: 'expiration', required: false, type: String, description: 'Filtrar por expiración: expired, 30, 60, 90, more90' })
  @ApiQuery({ name: 'category_id', required: false, type: String, description: 'Filtrar por categoría asignada' })
  @ApiResponse({ status: 200, description: 'Lista de compañías con paginación' })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('expiration') expiration?: string,
    @Query('category_id') category_id?: string,
  ) {
    return this.companiesService.findAll({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      search,
      expiration,
      category_id,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de una compañía' })
  @ApiResponse({ status: 200, description: 'Compañía encontrada' })
  @ApiResponse({ status: 404, description: 'Compañía no encontrada' })
  findOne(@Param('id') id: string) {
    return this.companiesService.findOne(id);
  }

  @Patch(':id/status')
  @Audit('company.status_updated', 'company')
  @ApiOperation({ summary: 'Activar/inactivar compañía' })
  @ApiResponse({ status: 200, description: 'Estado actualizado' })
  @ApiResponse({ status: 404, description: 'Compañía no encontrada' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateCompanyStatusDto) {
    return this.companiesService.updateStatus(id, dto);
  }

  @Patch(':id/subscription')
  @Audit('company.subscription_updated', 'company')
  @ApiOperation({ summary: 'Gestionar suscripción de la compañía' })
  @ApiResponse({ status: 200, description: 'Suscripción actualizada' })
  @ApiResponse({ status: 404, description: 'Compañía o plan no encontrado' })
  manageSubscription(@Param('id') id: string, @Body() dto: ManageSubscriptionDto) {
    return this.companiesService.manageSubscription(id, dto);
  }

  @Put(':id/categories')
  @Audit('company.categories_assigned', 'company')
  @ApiOperation({ summary: 'Asignar categorías a una compañía (reemplaza las existentes)' })
  @ApiResponse({ status: 200, description: 'Categorías asignadas' })
  @ApiResponse({ status: 404, description: 'Compañía no encontrada' })
  assignCategories(@Param('id') id: string, @Body() dto: AssignCategoriesDto) {
    return this.companiesService.assignCategories(id, dto);
  }

  @Delete(':id')
  @Audit('company.deleted', 'company')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar una compañía y todos sus datos asociados' })
  @ApiResponse({ status: 200, description: 'Compañía eliminada' })
  @ApiResponse({ status: 404, description: 'Compañía no encontrada' })
  remove(@Param('id') id: string) {
    return this.companiesService.remove(id);
  }

  @Post(':id/impersonate')
  @Audit('company.impersonated', 'company')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generar token para acceder como una compañía (impersonate)' })
  @ApiResponse({ status: 200, description: 'Token generado exitosamente' })
  @ApiResponse({ status: 404, description: 'Compañía no encontrada' })
  @ApiResponse({ status: 400, description: 'Compañía inactiva o sin usuario owner' })
  impersonate(@Param('id') id: string) {
    return this.companiesService.impersonate(id);
  }
}
