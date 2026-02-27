import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard, RequirePermissions, Audit } from '@contagracia/shared-modules';
import { EmailService } from './email.service';
import { CreateEmailTemplateDto } from './dto/create-email-template.dto';
import { UpdateEmailTemplateDto } from './dto/update-email-template.dto';
import { CreateEmailSendDto } from './dto/create-email-send.dto';

@ApiTags('CRM Email')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('companies/:companyId/crm/email')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  // --- Templates ---

  @Get('templates')
  @RequirePermissions('crm.email_marketing.view')
  @ApiOperation({ summary: 'Listar plantillas de correo' })
  async findAllTemplates(@Param('companyId') companyId: string) {
    return this.emailService.findAllTemplates(companyId);
  }

  @Post('templates')
  @RequirePermissions('crm.email_marketing.create')
  @Audit('crm.email_marketing.create', 'EmailTemplate')
  @ApiOperation({ summary: 'Crear plantilla de correo' })
  async createTemplate(
    @Param('companyId') companyId: string,
    @Body() dto: CreateEmailTemplateDto,
  ) {
    return this.emailService.createTemplate(companyId, dto);
  }

  @Patch('templates/:id')
  @RequirePermissions('crm.email_marketing.edit')
  @Audit('crm.email_marketing.edit', 'EmailTemplate')
  @ApiOperation({ summary: 'Actualizar plantilla de correo' })
  async updateTemplate(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateEmailTemplateDto,
  ) {
    return this.emailService.updateTemplate(companyId, id, dto);
  }

  @Delete('templates/:id')
  @RequirePermissions('crm.email_marketing.delete')
  @Audit('crm.email_marketing.delete', 'EmailTemplate')
  @ApiOperation({ summary: 'Eliminar plantilla de correo (soft delete)' })
  async removeTemplate(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.emailService.removeTemplate(companyId, id);
  }

  // --- Sends ---

  @Get('sends')
  @RequirePermissions('crm.email_marketing.view_stats')
  @ApiOperation({ summary: 'Listar envíos de correo' })
  async findAllSends(
    @Param('companyId') companyId: string,
    @Query('campaign_id') campaignId?: string,
    @Query('third_party_id') thirdPartyId?: string,
    @Query('status') status?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ): Promise<any> {
    return this.emailService.findAllSends(
      companyId,
      { campaign_id: campaignId, third_party_id: thirdPartyId, status },
      skip ? parseInt(skip, 10) : 0,
      take ? parseInt(take, 10) : 20,
    );
  }

  @Post('sends')
  @RequirePermissions('crm.email_marketing.send')
  @Audit('crm.email_marketing.send', 'EmailSend')
  @ApiOperation({ summary: 'Crear registro de envío de correo (estado PENDING)' })
  async createSend(
    @Param('companyId') companyId: string,
    @Body() dto: CreateEmailSendDto,
  ) {
    return this.emailService.createSend(companyId, dto);
  }
}
