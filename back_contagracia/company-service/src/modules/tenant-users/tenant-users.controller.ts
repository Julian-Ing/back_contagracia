import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Request,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { TenantUsersService } from './tenant-users.service';
import { CreateTenantUserDto } from './dto/create-tenant-user.dto';
import {
  UpdateTenantUserDto,
  UpdateTenantUserPermissionsDto,
} from './dto/update-tenant-user.dto';
import { Audit, RequirePermissions, JwtAuthGuard } from '@contagracia/shared-modules';

@ApiTags('Tenant Users (Empleados)')

@UseGuards(JwtAuthGuard)
@Controller('companies/:companyId/employees')
export class TenantUsersController {
  constructor(private readonly tenantUsersService: TenantUsersService) {}

  /**
   * Crear un nuevo empleado en el tenant
   */
  @Post()
  @RequirePermissions('users.create')
  @Audit('tenant_user.created', 'tenant_user')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear nuevo empleado en la empresa' })
  @ApiResponse({
    status: 201,
    description: 'Empleado creado exitosamente',
  })
  @ApiResponse({
    status: 403,
    description: 'Sin permisos de administrador',
  })
  @ApiResponse({
    status: 409,
    description: 'Email ya registrado',
  })
  async create(
    @Param('companyId') companyId: string,
    @Body() dto: CreateTenantUserDto,
    @Request() req: any,
  ) {
    const jwtCompanyId = req.user.company_id;
    return this.tenantUsersService.create(companyId, jwtCompanyId, dto);
  }

  /**
   * Listar empleados del tenant
   */
  @Get()
  @RequirePermissions('users.view')
  @ApiOperation({ summary: 'Listar empleados de la empresa' })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiResponse({
    status: 200,
    description: 'Lista de empleados',
  })
  async findAll(
    @Param('companyId') companyId: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
    @Request() req?: any,
  ) {
    const jwtCompanyId = req.user.company_id;
    return this.tenantUsersService.findAll(companyId, jwtCompanyId, {
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
      search,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    });
  }

  /**
   * Obtener detalle de un empleado
   */
  @Get(':id')
  @RequirePermissions('users.view')
  @ApiOperation({ summary: 'Obtener detalle de un empleado' })
  @ApiResponse({
    status: 200,
    description: 'Detalle del empleado',
  })
  @ApiResponse({
    status: 404,
    description: 'Empleado no encontrado',
  })
  async findOne(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Request() req: any,
  ) {
    const jwtCompanyId = req.user.company_id;
    return this.tenantUsersService.findOne(companyId, jwtCompanyId, id);
  }

  /**
   * Actualizar datos de un empleado
   */
  @Patch(':id')
  @RequirePermissions('users.edit')
  @Audit('tenant_user.updated', 'tenant_user')
  @ApiOperation({ summary: 'Actualizar datos de un empleado' })
  @ApiResponse({
    status: 200,
    description: 'Empleado actualizado',
  })
  @ApiResponse({
    status: 404,
    description: 'Empleado no encontrado',
  })
  async update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTenantUserDto,
    @Request() req: any,
  ) {
    const jwtCompanyId = req.user.company_id;
    return this.tenantUsersService.update(companyId, jwtCompanyId, id, dto);
  }

  /**
   * Actualizar permisos de un empleado
   */
  @Patch(':id/permissions')
  @RequirePermissions('users.permissions.edit')
  @Audit('tenant_user.permissions_updated', 'tenant_user')
  @ApiOperation({ summary: 'Actualizar permisos de un empleado' })
  @ApiResponse({
    status: 200,
    description: 'Permisos actualizados',
  })
  @ApiResponse({
    status: 403,
    description: 'Módulos no disponibles en el plan',
  })
  async updatePermissions(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTenantUserPermissionsDto,
    @Request() req: any,
  ) {
    const jwtCompanyId = req.user.company_id;
    return this.tenantUsersService.updatePermissions(
      companyId,
      jwtCompanyId,
      id,
      dto,
    );
  }

  /**
   * Desactivar un empleado
   */
  @Delete(':id')
  @RequirePermissions('users.deactivate')
  @Audit('tenant_user.deactivated', 'tenant_user')
  @ApiOperation({ summary: 'Desactivar un empleado' })
  @ApiResponse({
    status: 200,
    description: 'Empleado desactivado',
  })
  async remove(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Request() req: any,
  ) {
    const jwtCompanyId = req.user.company_id;
    return this.tenantUsersService.remove(companyId, jwtCompanyId, id);
  }

  /**
   * Obtener permisos de un empleado (endpoint interno para validación)
   */
  @Get(':id/permissions')
  @RequirePermissions('users.permissions.view')
  @ApiOperation({ summary: 'Obtener permisos efectivos de un empleado' })
  @ApiResponse({
    status: 200,
    description: 'Permisos del empleado filtrados por plan',
  })
  async getPermissions(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.tenantUsersService.getEmployeePermissions(companyId, id);
  }
}
