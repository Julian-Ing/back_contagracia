import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard, RequirePermissions, Audit } from '@contagracia/shared-modules';
import { StagesService } from './stages.service';
import { CreateStageDto } from './dto/create-stage.dto';
import { UpdateStageDto } from './dto/update-stage.dto';
import { ReorderStagesDto } from './dto/reorder-stages.dto';

@ApiTags('CRM Stages')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('companies/:companyId/crm/stages')
export class StagesController {
  constructor(private readonly stagesService: StagesService) {}

  @Get()
  @RequirePermissions('crm.settings.stages.view')
  @ApiOperation({ summary: 'Listar etapas' })
  async findAll(@Param('companyId') companyId: string) {
    return this.stagesService.findAll(companyId);
  }

  @Post()
  @RequirePermissions('crm.settings.stages.manage')
  @Audit('crm.stages.create', 'CrmOpportunityStage')
  @ApiOperation({ summary: 'Crear etapa' })
  async create(
    @Param('companyId') companyId: string,
    @Body() dto: CreateStageDto,
  ) {
    return this.stagesService.create(companyId, dto);
  }

  @Patch('reorder')
  @RequirePermissions('crm.settings.stages.manage')
  @Audit('crm.stages.reorder', 'CrmOpportunityStage')
  @ApiOperation({ summary: 'Reordenar etapas' })
  async reorder(
    @Param('companyId') companyId: string,
    @Body() dto: ReorderStagesDto,
  ) {
    return this.stagesService.reorder(companyId, dto);
  }

  @Patch(':id')
  @RequirePermissions('crm.settings.stages.manage')
  @Audit('crm.stages.edit', 'CrmOpportunityStage')
  @ApiOperation({ summary: 'Actualizar etapa' })
  async update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateStageDto,
  ) {
    return this.stagesService.update(companyId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('crm.settings.stages.manage')
  @Audit('crm.stages.delete', 'CrmOpportunityStage')
  @ApiOperation({ summary: 'Eliminar etapa (soft delete)' })
  async remove(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.stagesService.remove(companyId, id);
  }
}
