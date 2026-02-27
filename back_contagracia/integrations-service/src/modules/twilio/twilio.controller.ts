import { Controller, Post, Put, Body, Request, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody, ApiResponse } from '@nestjs/swagger';
import { TwilioSendService } from './services/twilio-send.service';
import { TwilioTemplateSyncService } from './services/twilio-template-sync.service';
import { TwilioClientService } from './services/twilio-client.service';
import { TenantContextService, Audit } from '@contagracia/shared-modules';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Twilio')
@ApiBearerAuth()
@Controller('api/twilio')
export class TwilioController {
  private readonly logger = new Logger(TwilioController.name);

  constructor(
    private readonly sendService: TwilioSendService,
    private readonly syncService: TwilioTemplateSyncService,
    private readonly clientService: TwilioClientService,
    private readonly tenantContext: TenantContextService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('send')
  @Audit('twilio_message.sent', 'twilio_message')
  @ApiOperation({ summary: 'Enviar mensaje WhatsApp via Twilio' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        to: { type: 'string', description: 'Número destino', example: '+573001234567' },
        body: { type: 'string', description: 'Texto del mensaje' },
        mediaUrl: { type: 'string', description: 'URL de media' },
        mediaContentType: { type: 'string', description: 'Content type del media' },
      },
      required: ['to'],
    },
  })
  async sendMessage(
    @Request() req: any,
    @Body() body: { to: string; body?: string; mediaUrl?: string; mediaContentType?: string },
  ) {
    const companyId = req.user.company_id;
    return this.sendService.sendMessage(companyId, body);
  }

  @Post('send-template')
  @Audit('twilio_template.sent', 'twilio_template')
  @ApiOperation({ summary: 'Enviar template WhatsApp via Twilio' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        to: { type: 'string', description: 'Número destino', example: '+573001234567' },
        contentSid: { type: 'string', description: 'Content SID del template Twilio' },
        contentVariables: { type: 'object', description: 'Variables del template' },
      },
      required: ['to', 'contentSid'],
    },
  })
  async sendTemplate(
    @Request() req: any,
    @Body() body: { to: string; contentSid: string; contentVariables?: Record<string, string> },
  ) {
    const companyId = req.user.company_id;
    return this.sendService.sendTemplate(companyId, body);
  }

  @Post('sync-templates')
  @Audit('twilio_contacts.synced', 'twilio_contacts')
  @ApiOperation({ summary: 'Sincronizar templates desde Twilio Content API' })
  async syncTemplates(@Request() req: any) {
    const companyId = req.user.company_id;
    return this.syncService.syncTemplates(companyId);
  }

  @Post('test-connection')
  @Audit('twilio_connection.tested', 'twilio_connection')
  @ApiOperation({ summary: 'Probar conexión con credenciales Twilio' })
  async testConnection(@Request() req: any) {
    const companyId = req.user.company_id;
    return this.clientService.testConnection(companyId);
  }

  @Put('config')
  @Audit('twilio_config.updated', 'twilio_config')
  @ApiOperation({ summary: 'Guardar configuración Twilio y sincronizar número WhatsApp' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        twilio_account_sid: { type: 'string' },
        twilio_auth_token: { type: 'string' },
        twilio_whatsapp_number: { type: 'string', example: '+573001234567' },
      },
    },
  })
  async saveConfig(
    @Request() req: any,
    @Body()
    body: {
      twilio_account_sid?: string;
      twilio_auth_token?: string;
      twilio_whatsapp_number?: string;
    },
  ) {
    const companyId = req.user.company_id;

    // Guardar en tenant DB (EmailSmsConfig)
    const tenantClient = await this.tenantContext.getTenantClient(companyId);
    if (!tenantClient) {
      throw new Error('No se pudo conectar a la base de datos del tenant');
    }

    const existingConfig = await (tenantClient as any).emailSmsConfig.findFirst();

    if (existingConfig) {
      await (tenantClient as any).emailSmsConfig.update({
        where: { id: existingConfig.id },
        data: {
          ...(body.twilio_account_sid !== undefined && { twilio_account_sid: body.twilio_account_sid }),
          ...(body.twilio_auth_token !== undefined && { twilio_auth_token: body.twilio_auth_token }),
          ...(body.twilio_whatsapp_number !== undefined && { twilio_whatsapp_number: body.twilio_whatsapp_number }),
        },
      });
    } else {
      await (tenantClient as any).emailSmsConfig.create({
        data: {
          twilio_account_sid: body.twilio_account_sid || null,
          twilio_auth_token: body.twilio_auth_token || null,
          twilio_whatsapp_number: body.twilio_whatsapp_number || null,
        },
      });
    }

    // Guardar whatsapp_number en tenant CompanySetting
    if (body.twilio_whatsapp_number !== undefined) {
      const cleanNumber = body.twilio_whatsapp_number
        ? body.twilio_whatsapp_number.replace(/[^\d+]/g, '')
        : null;

      await (tenantClient as any).companySetting.upsert({
        where: { category_key: { category: 'company_info', key: 'whatsapp_number' } },
        create: {
          category: 'company_info',
          key: 'whatsapp_number',
          value: cleanNumber || '',
          value_type: 'string',
          is_readonly: false,
        },
        update: { value: cleanNumber || '' },
      });
    }

    // Invalidar cache de credenciales
    this.clientService.invalidateCache(companyId);

    return { success: true, message: 'Configuración Twilio guardada' };
  }
}
