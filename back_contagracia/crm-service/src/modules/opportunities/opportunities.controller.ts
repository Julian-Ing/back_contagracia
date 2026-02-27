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
import { OpportunitiesService } from './opportunities.service';
import { CreateOpportunityDto } from './dto/create-opportunity.dto';
import { UpdateOpportunityDto } from './dto/update-opportunity.dto';
import { ChangeOpportunityStageDto } from './dto/change-stage.dto';

@ApiTags('CRM Opportunities')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('companies/:companyId/crm/opportunities')
export class OpportunitiesController {
  constructor(private readonly opportunitiesService: OpportunitiesService) {}

  @Get()
  @RequirePermissions('crm.opportunities.view')
  @ApiOperation({ summary: 'Listar oportunidades' })
  async findAll(
    @Param('companyId') companyId: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('stage_id') stage_id?: string,
    @Query('assigned_to') assigned_to?: string,
    @Query('search') search?: string,
    @Request() req?: any,
  ) {
    const userId = req.user.sub;
    return this.opportunitiesService.findAll(companyId, userId, {
      skip: skip ? parseInt(skip) : undefined,
      take: take ? parseInt(take) : undefined,
      stage_id,
      assigned_to,
      search,
    });
  }

  @Get('kanban')
  @RequirePermissions('crm.opportunities.view')
  @ApiOperation({ summary: 'Obtener vista kanban de oportunidades' })
  async getKanban(@Param('companyId') companyId: string) {
    return this.opportunitiesService.getKanban(companyId);
  }

  @Get(':id')
  @RequirePermissions('crm.opportunities.view')
  @ApiOperation({ summary: 'Obtener oportunidad por ID' })
  async findOne(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.opportunitiesService.findOne(companyId, id);
  }

  @Post()
  @RequirePermissions('crm.opportunities.create')
  @Audit('crm.opportunities.create', 'CrmOpportunity')
  @ApiOperation({ summary: 'Crear oportunidad' })
  async create(
    @Param('companyId') companyId: string,
    @Body() dto: CreateOpportunityDto,
    @Request() req: any,
  ) {
    const userId = req.user.sub;
    return this.opportunitiesService.create(companyId, userId, dto);
  }

  @Patch(':id')
  @RequirePermissions('crm.opportunities.edit')
  @Audit('crm.opportunities.edit', 'CrmOpportunity')
  @ApiOperation({ summary: 'Actualizar oportunidad' })
  async update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateOpportunityDto,
    @Request() req: any,
  ) {
    const userId = req.user.sub;
    return this.opportunitiesService.update(companyId, id, userId, dto);
  }

  @Patch(':id/stage')
  @RequirePermissions('crm.opportunities.change_stage')
  @Audit('crm.opportunities.change_stage', 'CrmOpportunity')
  @ApiOperation({ summary: 'Cambiar etapa de oportunidad' })
  async changeStage(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: ChangeOpportunityStageDto,
    @Request() req: any,
  ) {
    const userId = req.user.sub;
    return this.opportunitiesService.changeStage(companyId, id, userId, dto);
  }

  @Delete(':id')
  @RequirePermissions('crm.opportunities.delete')
  @Audit('crm.opportunities.delete', 'CrmOpportunity')
  @ApiOperation({ summary: 'Eliminar oportunidad (soft delete)' })
  async remove(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Request() req: any,
  ) {
    const userId = req.user.sub;
    return this.opportunitiesService.remove(companyId, id, userId);
  }
}
