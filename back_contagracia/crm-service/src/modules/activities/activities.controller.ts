import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard, RequirePermissions, Audit } from '@contagracia/shared-modules';
import { ActivitiesService } from './activities.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';

@ApiTags('CRM Activities')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('companies/:companyId/crm/activities')
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Get()
  @RequirePermissions('crm.activities.view')
  @ApiOperation({ summary: 'Listar actividades' })
  async findAll(
    @Param('companyId') companyId: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('user_id') user_id?: string,
    @Query('third_party_id') third_party_id?: string,
    @Query('lead_id') lead_id?: string,
    @Query('opportunity_id') opportunity_id?: string,
    @Query('date_from') date_from?: string,
    @Query('date_to') date_to?: string,
    @Request() req?: any,
  ) {
    const userId = req.user.sub;
    return this.activitiesService.findAll(companyId, userId, {
      skip: skip ? parseInt(skip) : undefined,
      take: take ? parseInt(take) : undefined,
      type,
      status,
      user_id,
      third_party_id,
      lead_id,
      opportunity_id,
      date_from,
      date_to,
    });
  }

  @Get(':id')
  @RequirePermissions('crm.activities.view')
  @ApiOperation({ summary: 'Obtener actividad por ID' })
  async findOne(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.activitiesService.findOne(companyId, id);
  }

  @Post()
  @RequirePermissions('crm.activities.create')
  @Audit('crm.activities.create', 'CrmActivity')
  @ApiOperation({ summary: 'Crear actividad' })
  async create(
    @Param('companyId') companyId: string,
    @Body() dto: CreateActivityDto,
    @Request() req: any,
  ) {
    const userId = req.user.sub;
    return this.activitiesService.create(companyId, userId, dto);
  }

  @Patch(':id')
  @RequirePermissions('crm.activities.edit')
  @Audit('crm.activities.edit', 'CrmActivity')
  @ApiOperation({ summary: 'Actualizar actividad' })
  async update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateActivityDto,
    @Request() req: any,
  ) {
    const userId = req.user.sub;
    return this.activitiesService.update(companyId, id, userId, dto);
  }

  @Patch(':id/complete')
  @RequirePermissions('crm.activities.complete')
  @Audit('crm.activities.complete', 'CrmActivity')
  @ApiOperation({ summary: 'Completar actividad' })
  async complete(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Request() req: any,
  ) {
    const userId = req.user.sub;
    return this.activitiesService.complete(companyId, id, userId);
  }

  @Patch(':id/cancel')
  @RequirePermissions('crm.activities.cancel')
  @Audit('crm.activities.cancel', 'CrmActivity')
  @ApiOperation({ summary: 'Cancelar actividad' })
  async cancel(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Request() req: any,
  ) {
    const userId = req.user.sub;
    return this.activitiesService.cancel(companyId, id, userId);
  }

  @Delete(':id')
  @RequirePermissions('crm.activities.delete')
  @Audit('crm.activities.delete', 'CrmActivity')
  @ApiOperation({ summary: 'Eliminar actividad (soft delete)' })
  async remove(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Request() req: any,
  ) {
    const userId = req.user.sub;
    return this.activitiesService.remove(companyId, id, userId);
  }
}
