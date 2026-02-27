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
  NotFoundException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { TenantContextService, Audit } from '@contagracia/shared-modules';

@ApiTags('roles')

@Controller('roles')
export class RolesController {
  constructor(
    private readonly rolesService: RolesService,
    private readonly tenantContext: TenantContextService,
  ) {}

  /**
   * Crear un nuevo rol
   */
  @Post()
  @Audit('role.created', 'role')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear un nuevo rol en el tenant' })
  @ApiResponse({ status: 201, description: 'Rol creado exitosamente' })
  @ApiResponse({ status: 403, description: 'Sin permisos de administrador' })
  @ApiResponse({ status: 409, description: 'Ya existe un rol con esa clave' })
  async create(@Request() req: any, @Body() dto: CreateRoleDto) {
    return this.rolesService.create(req.user.company_id, req.user.sub, dto);
  }

  /**
   * Listar roles disponibles
   */
  @Get()
  @ApiOperation({ summary: 'Listar roles disponibles en el tenant' })
  @ApiResponse({ status: 200, description: 'Lista de roles' })
  async findAll(@Request() req: any) {
    return this.rolesService.findAll(req.user.company_id);
  }

  /**
   * Obtener acciones disponibles del plan (paginado con búsqueda)
   */
  @Get('available-actions')
  @ApiOperation({ summary: 'Obtener acciones disponibles del plan para asignar a roles' })
  @ApiResponse({ status: 200, description: 'Lista paginada de acciones' })
  async getAvailableActions(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('module') moduleKey?: string,
    @Query('actionKeys') actionKeysParam?: string, // Comma-separated list of action_keys
  ) {
    // Parsear actionKeys si viene como string separado por comas
    const actionKeys = actionKeysParam
      ? actionKeysParam.split(',').map((k) => k.trim()).filter(Boolean)
      : undefined;

    return this.tenantContext.getCompanyPlanActions(req.user.company_id, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
      search: search || undefined,
      moduleKey: moduleKey || undefined,
      actionKeys,
    });
  }

  /**
   * Obtener rol por ID con sus permisos
   */
  @Get(':id')
  @ApiOperation({ summary: 'Obtener rol con sus permisos' })
  @ApiResponse({ status: 200, description: 'Detalle del rol' })
  @ApiResponse({ status: 404, description: 'Rol no encontrado' })
  async findOne(@Request() req: any, @Param('id') id: string) {
    const role = await this.rolesService.findOne(req.user.company_id, id);
    if (!role) {
      throw new NotFoundException('Rol no encontrado');
    }
    return role;
  }

  /**
   * Actualizar rol existente
   */
  @Patch(':id')
  @Audit('role.updated', 'role')
  @ApiOperation({ summary: 'Actualizar un rol existente' })
  @ApiResponse({ status: 200, description: 'Rol actualizado exitosamente' })
  @ApiResponse({ status: 403, description: 'Sin permisos o rol de sistema' })
  @ApiResponse({ status: 404, description: 'Rol no encontrado' })
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.rolesService.update(req.user.company_id, req.user.sub, id, dto);
  }

  /**
   * Eliminar rol existente
   */
  @Delete(':id')
  @Audit('role.deleted', 'role')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar un rol existente' })
  @ApiResponse({ status: 200, description: 'Rol eliminado exitosamente' })
  @ApiResponse({ status: 403, description: 'Sin permisos o rol de sistema' })
  @ApiResponse({ status: 404, description: 'Rol no encontrado' })
  @ApiResponse({ status: 409, description: 'Rol tiene usuarios asignados' })
  async delete(@Request() req: any, @Param('id') id: string) {
    return this.rolesService.delete(req.user.company_id, req.user.sub, id);
  }
}
