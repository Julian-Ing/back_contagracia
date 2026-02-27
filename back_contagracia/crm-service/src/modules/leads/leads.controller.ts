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
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { ChangeLeadStageDto } from './dto/change-stage.dto';
import { BulkAssignDto } from './dto/bulk-assign.dto';
import { ConvertLeadDto } from './dto/convert-lead.dto';

@ApiTags('CRM Leads')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('companies/:companyId/crm/leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get()
  @RequirePermissions('crm.leads.view')
  @ApiOperation({ summary: 'Listar leads' })
  async findAll(
    @Param('companyId') companyId: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('stage') stage?: string,
    @Query('source') source?: string,
    @Query('assigned_to') assigned_to?: string,
    @Query('campaign_id') campaign_id?: string,
    @Query('search') search?: string,
    @Request() req?: any,
  ) {
    const userId = req.user.sub;
    return this.leadsService.findAll(companyId, userId, {
      skip: skip ? parseInt(skip) : undefined,
      take: take ? parseInt(take) : undefined,
      stage,
      source,
      assigned_to,
      campaign_id,
      search,
    });
  }

  @Get(':id')
  @RequirePermissions('crm.leads.view')
  @ApiOperation({ summary: 'Obtener lead por ID' })
  async findOne(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.leadsService.findOne(companyId, id);
  }

  @Post()
  @RequirePermissions('crm.leads.create')
  @Audit('crm.leads.create', 'CrmLead')
  @ApiOperation({ summary: 'Crear lead' })
  async create(
    @Param('companyId') companyId: string,
    @Body() dto: CreateLeadDto,
    @Request() req: any,
  ) {
    const userId = req.user.sub;
    return this.leadsService.create(companyId, userId, dto);
  }

  @Patch('bulk-assign')
  @RequirePermissions('crm.leads.bulk_assign')
  @Audit('crm.leads.bulk_assign', 'CrmLead')
  @ApiOperation({ summary: 'Asignar leads masivamente' })
  async bulkAssign(
    @Param('companyId') companyId: string,
    @Body() dto: BulkAssignDto,
    @Request() req: any,
  ) {
    const userId = req.user.sub;
    return this.leadsService.bulkAssign(companyId, userId, dto);
  }

  @Patch(':id')
  @RequirePermissions('crm.leads.edit')
  @Audit('crm.leads.edit', 'CrmLead')
  @ApiOperation({ summary: 'Actualizar lead' })
  async update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateLeadDto,
    @Request() req: any,
  ) {
    const userId = req.user.sub;
    return this.leadsService.update(companyId, id, userId, dto);
  }

  @Patch(':id/stage')
  @RequirePermissions('crm.leads.edit')
  @Audit('crm.leads.change_stage', 'CrmLead')
  @ApiOperation({ summary: 'Cambiar etapa del lead' })
  async changeStage(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: ChangeLeadStageDto,
    @Request() req: any,
  ) {
    const userId = req.user.sub;
    return this.leadsService.changeStage(companyId, id, userId, dto);
  }

  @Post(':id/convert')
  @RequirePermissions('crm.leads.convert')
  @Audit('crm.leads.convert', 'CrmLead')
  @ApiOperation({ summary: 'Convertir lead a oportunidad' })
  async convert(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: ConvertLeadDto,
    @Request() req: any,
  ) {
    const userId = req.user.sub;
    return this.leadsService.convert(companyId, id, userId, dto);
  }

  @Delete(':id')
  @RequirePermissions('crm.leads.delete')
  @Audit('crm.leads.delete', 'CrmLead')
  @ApiOperation({ summary: 'Eliminar lead (soft delete)' })
  async remove(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Request() req: any,
  ) {
    const userId = req.user.sub;
    return this.leadsService.remove(companyId, id, userId);
  }
}
