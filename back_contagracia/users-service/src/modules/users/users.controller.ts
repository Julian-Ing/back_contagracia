import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { Audit } from '@contagracia/shared-modules';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, UpdateStatusDto } from './dto';

@ApiTags('users')

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Listar usuarios del tenant
   */
  @Get()
    @ApiOperation({ summary: 'Listar usuarios del tenant' })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Lista de usuarios' })
  @ApiResponse({ status: 403, description: 'Sin permisos' })
  async findAll(
    @Request() req: any,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.usersService.findAll(
      req.user.company_id,
      req.user.sub,
      {
        skip: skip ? parseInt(skip, 10) : undefined,
        take: take ? parseInt(take, 10) : undefined,
        search,
        isActive: isActive !== undefined ? isActive === 'true' : undefined,
      },
    );
  }

  /**
   * Obtener usuario por ID
   */
  @Get(':id')
    @ApiOperation({ summary: 'Obtener detalle de un usuario' })
  @ApiResponse({ status: 200, description: 'Detalle del usuario' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async findOne(@Request() req: any, @Param('id') id: string) {
    return this.usersService.findOne(req.user.company_id, req.user.sub, id);
  }

  /**
   * Crear nuevo usuario
   */
  @Post()
    @Audit('users.created', 'user')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear nuevo usuario' })
  @ApiResponse({ status: 201, description: 'Usuario creado exitosamente' })
  @ApiResponse({ status: 409, description: 'Email ya existe' })
  @ApiResponse({ status: 403, description: 'Sin permisos' })
  async create(@Request() req: any, @Body() dto: CreateUserDto) {
    return this.usersService.create(req.user.company_id, req.user.sub, dto);
  }

  /**
   * Actualizar usuario
   */
  @Patch(':id')
    @Audit('users.updated', 'user')
  @ApiOperation({ summary: 'Actualizar datos de un usuario' })
  @ApiResponse({ status: 200, description: 'Usuario actualizado' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  @ApiResponse({ status: 409, description: 'Email ya existe' })
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(
      req.user.company_id,
      req.user.sub,
      id,
      dto,
    );
  }

  /**
   * Activar/Desactivar usuario
   */
  @Patch(':id/status')
    @Audit('users.status_changed', 'user')
  @ApiOperation({ summary: 'Activar o desactivar usuario' })
  @ApiResponse({ status: 200, description: 'Estado actualizado' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  @ApiResponse({ status: 403, description: 'No se puede desactivar al owner' })
  async updateStatus(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
  ) {
    return this.usersService.updateStatus(
      req.user.company_id,
      req.user.sub,
      id,
      dto,
    );
  }

  /**
   * Cambiar rol de usuario
   */
  @Patch(':id/role')
    @Audit('users.role_changed', 'user')
  @ApiOperation({ summary: 'Cambiar rol de un usuario' })
  @ApiResponse({ status: 200, description: 'Rol actualizado' })
  @ApiResponse({ status: 404, description: 'Usuario o rol no encontrado' })
  @ApiResponse({ status: 403, description: 'No se puede cambiar rol del owner' })
  async updateRole(
    @Request() req: any,
    @Param('id') id: string,
    @Body('role_id') roleId: string,
  ) {
    return this.usersService.updateRole(
      req.user.company_id,
      req.user.sub,
      id,
      roleId,
    );
  }
}
