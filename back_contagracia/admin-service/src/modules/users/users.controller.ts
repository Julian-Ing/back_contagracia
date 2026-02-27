import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UsersService } from './users.service.js';
import { CreateUserDto, UpdateUserStatusDto } from './dto/index.js';
import { Audit } from '@contagracia/shared-modules';

@ApiTags('users')
@ApiBearerAuth('JWT-auth')
@Controller('admin/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Listar usuarios con paginación y búsqueda' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: ['all', 'active', 'inactive'] })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.usersService.findAll({
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
      search,
      status,
    });
  }

  @Post()
  @Audit('user.created', 'user')
  @ApiOperation({ summary: 'Crear usuario (sin verificación de email)' })
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Patch(':id/status')
  @Audit('user.status_updated', 'user')
  @ApiOperation({ summary: 'Activar/desactivar usuario' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateUserStatusDto) {
    return this.usersService.updateStatus(id, dto);
  }

  @Delete(':id')
  @Audit('user.deleted', 'user')
  @ApiOperation({ summary: 'Eliminar usuario y toda su data (tenant DB incluida)' })
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
