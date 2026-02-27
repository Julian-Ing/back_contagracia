import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { TwilioClientService } from './twilio-client.service';
import { mapTwilioStatus } from '../utils/status-mapper';
import { normalizePhone } from '../utils/phone-utils';
import { ConfigService } from '@nestjs/config';

export interface SendMessageDto {
  to: string;
  body?: string;
  mediaUrl?: string;
  mediaContentType?: string;
}

export interface SendTemplateDto {
  to: string;
  contentSid: string;
  contentVariables?: Record<string, string>;
}

export interface TwilioSendResult {
  twilio_sid: string;
  status: string;
  from: string;
  to: string;
}

@Injectable()
export class TwilioSendService {
  private readonly logger = new Logger(TwilioSendService.name);

  constructor(
    private readonly twilioClient: TwilioClientService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Envía un mensaje freeform via Twilio WhatsApp API
   */
  async sendMessage(companyId: string, dto: SendMessageDto): Promise<TwilioSendResult> {
    if (!dto.body && !dto.mediaUrl) {
      throw new BadRequestException('Se requiere body o mediaUrl');
    }

    const credentials = await this.twilioClient.getCredentials(companyId);
    const toNumber = normalizePhone(dto.to);

    const webhookBaseUrl = this.configService.get<string>('WHATSAPP_WEBHOOK_BASE_URL', '');
    const statusCallbackUrl = webhookBaseUrl ? `${webhookBaseUrl}/webhooks/twilio/whatsapp/${companyId}` : '';

    const formData = new URLSearchParams();
    formData.append('From', `whatsapp:${credentials.whatsappNumber}`);
    formData.append('To', `whatsapp:${toNumber}`);

    if (statusCallbackUrl) {
      formData.append('StatusCallback', statusCallbackUrl);
    }

    if (dto.body) {
      formData.append('Body', dto.body);
    }

    if (dto.mediaUrl) {
      formData.append('MediaUrl', dto.mediaUrl);
    }

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${credentials.accountSid}/Messages.json`;

    this.logger.log(`Sending message to ${toNumber}`);

    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        Authorization: this.twilioClient.getAuthHeader(credentials),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`Twilio error: ${errorText}`);
      throw new BadRequestException(`Error de Twilio: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    return {
      twilio_sid: data.sid,
      status: mapTwilioStatus(data.status),
      from: data.from,
      to: data.to,
    };
  }

  /**
   * Envía un template via Twilio WhatsApp API
   */
  async sendTemplate(companyId: string, dto: SendTemplateDto): Promise<TwilioSendResult> {
    const credentials = await this.twilioClient.getCredentials(companyId);
    const toNumber = normalizePhone(dto.to);

    const webhookBaseUrl = this.configService.get<string>('WHATSAPP_WEBHOOK_BASE_URL', '');
    const statusCallbackUrl = webhookBaseUrl ? `${webhookBaseUrl}/webhooks/twilio/whatsapp/${companyId}` : '';

    const formData = new URLSearchParams();
    formData.append('From', `whatsapp:${credentials.whatsappNumber}`);
    formData.append('To', `whatsapp:${toNumber}`);
    formData.append('ContentSid', dto.contentSid);

    if (statusCallbackUrl) {
      formData.append('StatusCallback', statusCallbackUrl);
    }

    if (dto.contentVariables && Object.keys(dto.contentVariables).length > 0) {
      formData.append('ContentVariables', JSON.stringify(dto.contentVariables));
    }

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${credentials.accountSid}/Messages.json`;

    this.logger.log(`Sending template ${dto.contentSid} to ${toNumber}`);

    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        Authorization: this.twilioClient.getAuthHeader(credentials),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`Twilio error: ${errorText}`);
      throw new BadRequestException(`Error de Twilio: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    return {
      twilio_sid: data.sid,
      status: mapTwilioStatus(data.status),
      from: data.from,
      to: data.to,
    };
  }
}
