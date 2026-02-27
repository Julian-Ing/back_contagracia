import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Audit } from '@contagracia/shared-modules';
import { MaintenancePlansService } from './maintenance-plans.service';
import { CreateMaintenancePlanDto, UpdateMaintenancePlanDto, CreateMaintenanceLogDto, UpdateMaintenanceLogDto } from './dto';

@ApiTags('PH Maintenance Plans')
@ApiBearerAuth()
@Controller('companies/:companyId/ph/maintenance-plans')
export class MaintenancePlansController {
  constructor(private readonly service: MaintenancePlansService) {}

  @Get()
  @ApiOperation({ summary: 'Listar planes de mantenimiento' })
  @ApiQuery({ name: 'condominium_id', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  async findAll(
    @Param('companyId') companyId: string,
    @Query('condominium_id') condominiumId?: string,
    @Query('category') category?: string,
    @Query('status') status?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.service.findAll(companyId, {
      condominium_id: condominiumId,
      category,
      status,
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener plan de mantenimiento por ID' })
  async findOne(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.findOne(companyId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear plan de mantenimiento' })
  @Audit('maintenance_plan.created', 'maintenance_plan')
  async create(
    @Param('companyId') companyId: string,
    @Body() dto: CreateMaintenancePlanDto,
    @Request() req: any,
  ) {
    return this.service.create(companyId, dto, req.user.sub);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar plan de mantenimiento' })
  @Audit('maintenance_plan.updated', 'maintenance_plan')
  async update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateMaintenancePlanDto,
  ) {
    return this.service.update(companyId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar plan de mantenimiento' })
  @Audit('maintenance_plan.deleted', 'maintenance_plan')
  async remove(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.remove(companyId, id);
  }

  // ─── Maintenance Logs ───

  @Get(':planId/logs')
  @ApiOperation({ summary: 'Listar historial de mantenimientos de un plan' })
  async findPlanLogs(
    @Param('companyId') companyId: string,
    @Param('planId') planId: string,
  ) {
    return this.service.findPlanLogs(companyId, planId);
  }

  @Post(':planId/logs')
  @ApiOperation({ summary: 'Registrar mantenimiento realizado' })
  @Audit('maintenance_log.created', 'maintenance_log')
  async addLog(
    @Param('companyId') companyId: string,
    @Param('planId') planId: string,
    @Body() dto: CreateMaintenanceLogDto,
    @Request() req: any,
  ) {
    return this.service.addLog(companyId, planId, dto, req.user.sub);
  }

  @Patch(':planId/logs/:logId')
  @ApiOperation({ summary: 'Actualizar registro de mantenimiento' })
  @Audit('maintenance_log.updated', 'maintenance_log')
  async updateLog(
    @Param('companyId') companyId: string,
    @Param('logId') logId: string,
    @Body() dto: UpdateMaintenanceLogDto,
  ) {
    return this.service.updateLog(companyId, logId, dto);
  }

  @Delete('logs/:logId')
  @ApiOperation({ summary: 'Eliminar registro de mantenimiento' })
  @Audit('maintenance_log.deleted', 'maintenance_log')
  async removeLog(
    @Param('companyId') companyId: string,
    @Param('logId') logId: string,
  ) {
    return this.service.removeLog(companyId, logId);
  }
}
