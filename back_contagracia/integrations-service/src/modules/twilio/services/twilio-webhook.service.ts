import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { TwilioMediaService } from './twilio-media.service';
import { mapTwilioStatus, getMessageType } from '../utils/status-mapper';
import { fromWhatsAppFormat } from '../utils/phone-utils';

@Injectable()
export class TwilioWebhookService {
  private readonly logger = new Logger(TwilioWebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly mediaService: TwilioMediaService,
  ) {}

  /**
   * Procesa un webhook de Twilio (status callback o inbound message).
   * companyId viene del path de la URL del webhook.
   */
  async handleWebhook(companyId: string, payload: Record<string, string>): Promise<any> {
    this.logger.log(
      `Webhook received: companyId=${companyId}, SID=${payload.MessageSid}, Status=${payload.MessageStatus}, From=${payload.From}, To=${payload.To}`,
    );

    // CASO 1: Status Callback
    if (payload.MessageStatus && payload.MessageSid && !payload.Body && !payload.NumMedia) {
      return this.handleStatusCallback(companyId, payload);
    }

    // CASO 2: Inbound Message
    if (payload.From && payload.To) {
      return this.handleInboundMessage(companyId, payload);
    }

    return { success: false, error: 'Payload no reconocido' };
  }

  /**
   * Maneja actualizaciones de status de mensajes enviados
   */
  private async handleStatusCallback(companyId: string, payload: Record<string, string>): Promise<any> {
    const newStatus = mapTwilioStatus(payload.MessageStatus);

    this.logger.log(`Status callback: SID=${payload.MessageSid} → ${newStatus}, companyId=${companyId}`);

    // Forward al CRM service
    const crmServiceUrl = this.configService.get<string>('CRM_SERVICE_URL', 'http://localhost:3011');
    const internalApiKey = this.configService.get<string>('INTERNAL_API_KEY', '');

    try {
      const response = await fetch(`${crmServiceUrl}/api/internal/whatsapp/status-callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Api-Key': internalApiKey,
        },
        body: JSON.stringify({
          company_id: companyId,
          twilio_sid: payload.MessageSid,
          status: newStatus,
          error_code: payload.ErrorCode || null,
          error_message: payload.ErrorMessage || null,
          original_status: payload.MessageStatus,
        }),
      });

      if (!response.ok) {
        this.logger.warn(`CRM status-callback failed: ${response.status}`);
      }

      return { success: true, action: 'status_callback', status: newStatus };
    } catch (error: any) {
      this.logger.error(`Error forwarding status to CRM: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Maneja mensajes inbound (recibidos del cliente)
   */
  private async handleInboundMessage(companyId: string, payload: Record<string, string>): Promise<any> {
    const fromNumber = fromWhatsAppFormat(payload.From);
    const toNumber = fromWhatsAppFormat(payload.To);

    this.logger.log(`Inbound message from ${fromNumber} to ${toNumber}, companyId=${companyId}`);

    // Leer company_name de master para el forward al CRM
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, company_name: true },
    });

    if (!company) {
      this.logger.warn(`Company not found for companyId: ${companyId}`);
      return { success: false, error: `Company not found: ${companyId}` };
    }

    // 2. Procesar media si existe
    const hasMedia = payload.NumMedia && parseInt(payload.NumMedia) > 0;
    const messageType = hasMedia ? getMessageType(payload.MediaContentType0) : 'text';
    let mediaLocalPath: string | null = null;
    let mediaContentType: string | null = payload.MediaContentType0 || null;

    if (hasMedia && payload.MediaUrl0) {
      try {
        const mediaResult = await this.mediaService.downloadMedia(
          company.id,
          payload.MediaUrl0,
          payload.MediaContentType0 || 'application/octet-stream',
          payload.MessageSid,
        );
        mediaLocalPath = mediaResult.localPath;
        mediaContentType = mediaResult.contentType;
      } catch (error: any) {
        this.logger.error(`Error downloading media: ${error.message}`);
      }
    }

    // 3. Forward al CRM service
    const crmServiceUrl = this.configService.get<string>('CRM_SERVICE_URL', 'http://localhost:3011');
    const internalApiKey = this.configService.get<string>('INTERNAL_API_KEY', '');

    try {
      const response = await fetch(`${crmServiceUrl}/api/internal/whatsapp/inbound`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Api-Key': internalApiKey,
        },
        body: JSON.stringify({
          company_id: company.id,
          from_number: fromNumber,
          to_number: toNumber,
          twilio_sid: payload.MessageSid,
          body: payload.Body || null,
          message_type: messageType,
          media_url: mediaLocalPath,
          media_content_type: mediaContentType,
          account_sid: payload.AccountSid,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.warn(`CRM inbound failed: ${response.status} - ${errorText}`);
      }

      return { success: true, action: 'inbound', company_id: company.id };
    } catch (error: any) {
      this.logger.error(`Error forwarding inbound to CRM: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}
