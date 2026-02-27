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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { EmployeeObservationsService } from './employee-observations.service';
import {
  CreateObservationDto,
  UpdateObservationDto,
  QueryObservationsDto,
} from './dto';
import {
  RequirePermissions,
  RequireAnyPermission,
  Audit,
} from '@contagracia/shared-modules';

@ApiTags('Observaciones de Empleados (HR)')
@ApiBearerAuth()
@Controller('observations')
export class EmployeeObservationsController {
  constructor(private readonly service: EmployeeObservationsService) {}

  @Get()
  @RequireAnyPermission('observations.view', 'observations.self_view')
  @ApiOperation({ summary: 'Listar observaciones de empleados' })
  @ApiResponse({ status: 200, description: 'Lista paginada de observaciones' })
  async findAll(@Request() req: any, @Query() query: QueryObservationsDto): Promise<any> {
    const companyId = req.user.company_id;
    const userId = req.user.sub || req.user.id;
    const permissions: string[] = req.user.permissions || [];
    const selfOnly = !permissions.includes('*') && !permissions.includes('observations.view');
    return this.service.findAll(companyId, companyId, userId, selfOnly, query);
  }

  @Get('stats')
  @RequirePermissions('observations.view')
  @ApiOperation({ summary: 'Estadisticas de observaciones' })
  @ApiResponse({ status: 200, description: 'Estadisticas generales' })
  async getStats(@Request() req: any): Promise<any> {
    const companyId = req.user.company_id;
    return this.service.getStats(companyId, companyId);
  }

  @Get(':id')
  @RequireAnyPermission('observations.view', 'observations.self_view')
  @ApiOperation({ summary: 'Obtener detalle de una observacion' })
  @ApiParam({ name: 'id', description: 'ID de la observacion' })
  @ApiResponse({ status: 200, description: 'Detalle de la observacion' })
  async findOne(@Request() req: any, @Param('id') id: string): Promise<any> {
    const companyId = req.user.company_id;
    const userId = req.user.sub || req.user.id;
    const permissions: string[] = req.user.permissions || [];
    const selfOnly = !permissions.includes('*') && !permissions.includes('observations.view');
    return this.service.findOne(companyId, companyId, userId, selfOnly, id);
  }

  @Post()
  @RequirePermissions('observations.create')
  @Audit('observation.created', 'employee_observation')
  @ApiOperation({ summary: 'Crear observacion de empleado' })
  @ApiResponse({ status: 201, description: 'Observacion creada' })
  async create(@Request() req: any, @Body() dto: CreateObservationDto): Promise<any> {
    const companyId = req.user.company_id;
    const userId = req.user.sub || req.user.id;
    return this.service.create(companyId, companyId, userId, dto);
  }

  @Patch(':id')
  @RequirePermissions('observations.edit')
  @Audit('observation.updated', 'employee_observation')
  @ApiOperation({ summary: 'Editar observacion de empleado' })
  @ApiParam({ name: 'id', description: 'ID de la observacion' })
  @ApiResponse({ status: 200, description: 'Observacion actualizada' })
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateObservationDto,
  ): Promise<any> {
    const companyId = req.user.company_id;
    return this.service.update(companyId, companyId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('observations.delete')
  @Audit('observation.archived', 'employee_observation')
  @ApiOperation({ summary: 'Archivar observacion de empleado' })
  @ApiParam({ name: 'id', description: 'ID de la observacion' })
  @ApiResponse({ status: 200, description: 'Observacion archivada' })
  async remove(@Request() req: any, @Param('id') id: string): Promise<any> {
    const companyId = req.user.company_id;
    return this.service.remove(companyId, companyId, id);
  }
}
