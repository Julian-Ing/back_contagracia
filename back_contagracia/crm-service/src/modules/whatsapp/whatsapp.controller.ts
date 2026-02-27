import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard, RequirePermissions, Audit } from '@contagracia/shared-modules';
import { WhatsappService } from './whatsapp.service';
import { WhatsappSendService } from './services/whatsapp-send.service';
import { CreateWhatsappTemplateDto } from './dto/create-whatsapp-template.dto';
import { UpdateWhatsappTemplateDto } from './dto/update-whatsapp-template.dto';
import { SendWhatsappMessageDto } from './dto/send-whatsapp-message.dto';
import { SendWhatsappTemplateDto } from './dto/send-whatsapp-template.dto';
import { UpdateTemplateMappingDto } from './dto/update-template-mapping.dto';

@ApiTags('CRM WhatsApp')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('companies/:companyId/crm/whatsapp')
export class WhatsappController {
  constructor(
    private readonly whatsappService: WhatsappService,
    private readonly whatsappSendService: WhatsappSendService,
  ) {}

  // --- Templates ---

  @Get('templates')
  @RequirePermissions('crm.whatsapp_templates.view')
  @ApiOperation({ summary: 'Listar plantillas de WhatsApp' })
  async findAllTemplates(@Param('companyId') companyId: string) {
    return this.whatsappService.findAllTemplates(companyId);
  }

  @Post('templates')
  @RequirePermissions('crm.whatsapp_templates.create')
  @Audit('crm.whatsapp_templates.create', 'CrmWhatsappTemplate')
  @ApiOperation({ summary: 'Crear plantilla de WhatsApp' })
  async createTemplate(
    @Param('companyId') companyId: string,
    @Body() dto: CreateWhatsappTemplateDto,
  ) {
    return this.whatsappService.createTemplate(companyId, dto);
  }

  @Patch('templates/:id')
  @RequirePermissions('crm.whatsapp_templates.edit')
  @Audit('crm.whatsapp_templates.edit', 'CrmWhatsappTemplate')
  @ApiOperation({ summary: 'Actualizar plantilla de WhatsApp' })
  async updateTemplate(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateWhatsappTemplateDto,
  ) {
    return this.whatsappService.updateTemplate(companyId, id, dto);
  }

  @Patch('templates/:id/mapping')
  @RequirePermissions('crm.whatsapp_templates.edit')
  @Audit('crm.whatsapp_templates.edit_mapping', 'CrmWhatsappTemplate')
  @ApiOperation({ summary: 'Actualizar mapeo de variables de un template' })
  async updateTemplateMapping(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTemplateMappingDto,
  ) {
    return this.whatsappService.updateTemplate(companyId, id, {
      variable_mapping: dto.variable_mapping,
    } as any);
  }

  @Post('templates/sync')
  @RequirePermissions('crm.whatsapp.sync_templates')
  @Audit('crm.whatsapp.sync_templates', 'CrmWhatsappTemplate')
  @ApiOperation({ summary: 'Sincronizar plantillas desde Twilio Content API' })
  async syncTemplates(
    @Param('companyId') companyId: string,
    @Headers('authorization') authHeader: string,
  ) {
    const token = authHeader?.replace('Bearer ', '') || '';
    return this.whatsappSendService.syncTemplates(companyId, token);
  }

  @Post('templates/send')
  @RequirePermissions('crm.whatsapp.send_template')
  @Audit('crm.whatsapp.send_template', 'CrmWhatsappMessage')
  @ApiOperation({ summary: 'Enviar template de WhatsApp a un contacto' })
  async sendTemplate(
    @Param('companyId') companyId: string,
    @Body() dto: SendWhatsappTemplateDto,
    @Request() req: any,
    @Headers('authorization') authHeader: string,
  ) {
    const token = authHeader?.replace('Bearer ', '') || '';
    const userId = req.user?.id || req.user?.sub || '';
    return this.whatsappSendService.sendTemplate(companyId, dto, userId, token);
  }

  // --- Conversations ---

  @Get('conversations')
  @RequirePermissions('crm.whatsapp.view')
  @ApiOperation({ summary: 'Listar conversaciones con contacto y último mensaje' })
  async findAllConversations(
    @Param('companyId') companyId: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('status') status?: string,
  ) {
    return this.whatsappService.findAllConversations(
      companyId,
      skip ? parseInt(skip, 10) : 0,
      take ? parseInt(take, 10) : 20,
      status,
    );
  }

  @Get('conversations/:id/messages')
  @RequirePermissions('crm.whatsapp.view')
  @ApiOperation({ summary: 'Listar mensajes de una conversación' })
  async findConversationMessages(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.whatsappService.findConversationMessages(
      companyId,
      id,
      skip ? parseInt(skip, 10) : 0,
      take ? parseInt(take, 10) : 50,
    );
  }

  @Patch('conversations/:id/assign')
  @RequirePermissions('crm.whatsapp.manage_conversations')
  @Audit('crm.whatsapp.assign_conversation', 'CrmWhatsappConversation')
  @ApiOperation({ summary: 'Asignar conversación a un usuario' })
  async assignConversation(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() body: { assigned_to: string | null },
  ) {
    return this.whatsappService.updateConversation(companyId, id, {
      assigned_to: body.assigned_to,
    });
  }

  @Patch('conversations/:id/close')
  @RequirePermissions('crm.whatsapp.manage_conversations')
  @Audit('crm.whatsapp.close_conversation', 'CrmWhatsappConversation')
  @ApiOperation({ summary: 'Cerrar una conversación' })
  async closeConversation(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.whatsappService.updateConversation(companyId, id, {
      status: 'closed',
    });
  }

  @Patch('conversations/:id/read')
  @RequirePermissions('crm.whatsapp.view')
  @ApiOperation({ summary: 'Marcar conversación como leída' })
  async markConversationRead(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.whatsappService.updateConversation(companyId, id, {
      unread_count: 0,
    });
  }

  // --- Messages ---

  @Post('messages/send')
  @RequirePermissions('crm.whatsapp.send_message')
  @Audit('crm.whatsapp.send_message', 'CrmWhatsappMessage')
  @ApiOperation({ summary: 'Enviar mensaje freeform de WhatsApp' })
  async sendMessage(
    @Param('companyId') companyId: string,
    @Body() dto: SendWhatsappMessageDto,
    @Request() req: any,
    @Headers('authorization') authHeader: string,
  ) {
    const token = authHeader?.replace('Bearer ', '') || '';
    const userId = req.user?.id || req.user?.sub || '';
    return this.whatsappSendService.sendMessage(companyId, dto, userId, token);
  }
}
