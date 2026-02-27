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
import { PlansService } from './plans.service';
import { CreatePlanDto, UpdatePlanDto, SetPlanModulesDto, AddPlanModuleDto } from './dto';
import { Audit, Public } from '@contagracia/shared-modules';

@ApiTags('plans')
@ApiBearerAuth('JWT-auth')
@Controller('admin/plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Listar todos los planes' })
  @ApiQuery({
    name: 'includeInactive',
    required: false,
    type: Boolean,
    description: 'Incluir planes inactivos',
  })
  @ApiResponse({ status: 200, description: 'Lista de planes' })
  findAll(@Query('includeInactive') includeInactive?: string) {
    return this.plansService.findAll(includeInactive === 'true');
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Obtener un plan por ID' })
  @ApiResponse({ status: 200, description: 'Plan encontrado' })
  @ApiResponse({ status: 404, description: 'Plan no encontrado' })
  findOne(@Param('id') id: string) {
    return this.plansService.findOne(id);
  }

  @Post()
  @Audit('plan.created', 'plan')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear un nuevo plan' })
  @ApiResponse({ status: 201, description: 'Plan creado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 409, description: 'Nombre de plan ya existe' })
  create(@Body() createDto: CreatePlanDto) {
    return this.plansService.create(createDto);
  }

  @Patch(':id')
  @Audit('plan.updated', 'plan')
  @ApiOperation({ summary: 'Actualizar un plan' })
  @ApiResponse({ status: 200, description: 'Plan actualizado' })
  @ApiResponse({ status: 404, description: 'Plan no encontrado' })
  update(@Param('id') id: string, @Body() updateDto: UpdatePlanDto) {
    return this.plansService.update(id, updateDto);
  }

  @Delete(':id')
  @Audit('plan.deleted', 'plan')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar un plan' })
  @ApiResponse({ status: 200, description: 'Plan eliminado' })
  @ApiResponse({ status: 400, description: 'Plan tiene suscripciones activas' })
  @ApiResponse({ status: 404, description: 'Plan no encontrado' })
  remove(@Param('id') id: string) {
    return this.plansService.remove(id);
  }

  // Plan Modules endpoints
  @Public()
  @Get(':id/modules')
  @ApiOperation({ summary: 'Obtener módulos de un plan' })
  @ApiResponse({ status: 200, description: 'Lista de módulos del plan' })
  @ApiResponse({ status: 404, description: 'Plan no encontrado' })
  getPlanModules(@Param('id') id: string) {
    return this.plansService.getPlanModules(id);
  }

  @Post(':id/modules')
  @Audit('plan.modules_set', 'plan')
  @ApiOperation({ summary: 'Configurar módulos de un plan (reemplaza todos)' })
  @ApiResponse({ status: 200, description: 'Módulos configurados' })
  @ApiResponse({ status: 400, description: 'Módulos inválidos' })
  @ApiResponse({ status: 404, description: 'Plan no encontrado' })
  setPlanModules(@Param('id') id: string, @Body() dto: SetPlanModulesDto) {
    return this.plansService.setPlanModules(id, dto);
  }

  @Post(':id/modules/add')
  @Audit('plan.module_added', 'plan')
  @ApiOperation({ summary: 'Agregar un módulo al plan' })
  @ApiResponse({ status: 201, description: 'Módulo agregado' })
  @ApiResponse({ status: 404, description: 'Plan o módulo no encontrado' })
  @ApiResponse({ status: 409, description: 'El módulo ya está asignado' })
  addPlanModule(@Param('id') id: string, @Body() dto: AddPlanModuleDto) {
    return this.plansService.addPlanModule(id, dto.module_id);
  }

  @Delete(':id/modules/:moduleId')
  @Audit('plan.module_removed', 'plan')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remover un módulo del plan' })
  @ApiResponse({ status: 200, description: 'Módulo removido del plan' })
  @ApiResponse({ status: 404, description: 'Módulo no asignado al plan' })
  removePlanModule(
    @Param('id') id: string,
    @Param('moduleId') moduleId: string,
  ) {
    return this.plansService.removePlanModule(id, moduleId);
  }
}
