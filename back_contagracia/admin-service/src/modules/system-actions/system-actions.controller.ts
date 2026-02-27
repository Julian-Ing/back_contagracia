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
} from '@nestjs/swagger';
import { SystemActionsService } from './system-actions.service';
import { CreateSystemActionDto, UpdateSystemActionDto } from './dto';
import { Audit } from '@contagracia/shared-modules';

@ApiTags('system-actions')
@ApiBearerAuth('JWT-auth')
@Controller('admin/system-actions')
export class SystemActionsController {
  constructor(private readonly systemActionsService: SystemActionsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todas las acciones del sistema' })
  @ApiQuery({
    name: 'module',
    required: false,
    description: 'Filtrar por módulo',
  })
  @ApiResponse({ status: 200, description: 'Lista de acciones' })
  findAll(@Query('module') moduleKey?: string) {
    return this.systemActionsService.findAll(moduleKey);
  }

  @Get('modules')
  @ApiOperation({ summary: 'Listar claves de módulos disponibles' })
  @ApiResponse({ status: 200, description: 'Lista de claves de módulos' })
  getModules() {
    return this.systemActionsService.getModules();
  }

  @Get('modules/all')
  @ApiOperation({ summary: 'Listar todos los módulos con detalle completo' })
  @ApiQuery({ name: 'search', required: false, description: 'Búsqueda fuzzy en nombre o clave de módulo' })
  @ApiResponse({ status: 200, description: 'Lista completa de módulos' })
  getModulesFull(@Query('search') search?: string) {
    return this.systemActionsService.getModulesFull(search);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una acción por ID' })
  @ApiResponse({ status: 200, description: 'Acción encontrada' })
  @ApiResponse({ status: 404, description: 'Acción no encontrada' })
  findOne(@Param('id') id: string) {
    return this.systemActionsService.findOne(id);
  }

  @Get('key/:actionKey')
  @ApiOperation({ summary: 'Obtener una acción por su clave' })
  @ApiResponse({ status: 200, description: 'Acción encontrada' })
  @ApiResponse({ status: 404, description: 'Acción no encontrada' })
  findByKey(@Param('actionKey') actionKey: string) {
    return this.systemActionsService.findByKey(actionKey);
  }

  @Post()
  @Audit('system_action.created', 'system_action')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear una nueva acción del sistema' })
  @ApiResponse({ status: 201, description: 'Acción creada exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 409, description: 'action_key ya existe' })
  create(@Body() createDto: CreateSystemActionDto) {
    return this.systemActionsService.create(createDto);
  }

  @Patch(':id')
  @Audit('system_action.updated', 'system_action')
  @ApiOperation({ summary: 'Actualizar una acción' })
  @ApiResponse({ status: 200, description: 'Acción actualizada' })
  @ApiResponse({ status: 404, description: 'Acción no encontrada' })
  update(@Param('id') id: string, @Body() updateDto: UpdateSystemActionDto) {
    return this.systemActionsService.update(id, updateDto);
  }

  @Delete(':id')
  @Audit('system_action.deleted', 'system_action')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar una acción' })
  @ApiResponse({ status: 200, description: 'Acción eliminada' })
  @ApiResponse({ status: 404, description: 'Acción no encontrada' })
  remove(@Param('id') id: string) {
    return this.systemActionsService.remove(id);
  }
}
