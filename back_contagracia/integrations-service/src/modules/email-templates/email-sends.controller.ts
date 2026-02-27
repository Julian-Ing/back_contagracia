import { Controller, Get, Post, Body, Query, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Audit } from '@contagracia/shared-modules';
import { EmailTemplatesService } from './email-templates.service';
import { CreateEmailSendDto } from './dto/create-email-send.dto';

@ApiTags('Email Sends')
@ApiBearerAuth()
@Controller('api/email-sends')
export class EmailSendsController {
  constructor(private readonly emailTemplatesService: EmailTemplatesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar envíos de correo' })
  @ApiResponse({ status: 200, description: 'Lista de envíos' })
  async findAllSends(
    @Request() req: any,
    @Query('campaign_id') campaignId?: string,
    @Query('third_party_id') thirdPartyId?: string,
    @Query('status') status?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.emailTemplatesService.findAllSends(
      req.user.company_id,
      { campaign_id: campaignId, third_party_id: thirdPartyId, status },
      skip ? parseInt(skip, 10) : 0,
      take ? parseInt(take, 10) : 20,
    );
  }

  @Post()
  @Audit('integrations.email_sends.create', 'EmailSend')
  @ApiOperation({ summary: 'Crear registro de envío de correo (estado PENDING)' })
  @ApiResponse({ status: 201, description: 'Registro creado' })
  async createSend(@Request() req: any, @Body() dto: CreateEmailSendDto) {
    return this.emailTemplatesService.createSend(req.user.company_id, dto);
  }
}
