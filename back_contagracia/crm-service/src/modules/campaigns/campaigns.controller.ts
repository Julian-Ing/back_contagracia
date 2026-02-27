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
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard, RequirePermissions, Audit } from '@contagracia/shared-modules';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';

@ApiTags('CRM Campaigns')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('companies/:companyId/crm/campaigns')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Get()
  @RequirePermissions('crm.campaigns.view')
  @ApiOperation({ summary: 'Listar campañas con filtros y paginación' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'channel', required: false })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  async findAll(
    @Param('companyId') companyId: string,
    @Query('status') status?: string,
    @Query('channel') channel?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ): Promise<any> {
    return this.campaignsService.findAll(companyId, {
      status,
      channel,
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
    });
  }

  @Get(':id')
  @RequirePermissions('crm.campaigns.view')
  @ApiOperation({ summary: 'Obtener campaña por ID con estadísticas' })
  async findOne(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.campaignsService.findOne(companyId, id);
  }

  @Post()
  @RequirePermissions('crm.campaigns.create')
  @Audit('crm.campaigns.create', 'CrmCampaign')
  @ApiOperation({ summary: 'Crear campaña' })
  async create(
    @Param('companyId') companyId: string,
    @Body() dto: CreateCampaignDto,
    @Request() req: any,
  ) {
    return this.campaignsService.create(companyId, dto, req.user.sub);
  }

  @Patch(':id')
  @RequirePermissions('crm.campaigns.edit')
  @Audit('crm.campaigns.edit', 'CrmCampaign')
  @ApiOperation({ summary: 'Actualizar campaña' })
  async update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCampaignDto,
    @Request() req: any,
  ) {
    return this.campaignsService.update(companyId, id, dto, req.user.sub);
  }

  @Delete(':id')
  @RequirePermissions('crm.campaigns.delete')
  @Audit('crm.campaigns.delete', 'CrmCampaign')
  @ApiOperation({ summary: 'Eliminar campaña (soft delete)' })
  async remove(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.campaignsService.remove(companyId, id);
  }
}
