import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class IntegrationsClientService {
  private readonly logger = new Logger(IntegrationsClientService.name);
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('INTEGRATIONS_SERVICE_URL', 'http://localhost:3014');
  }

  /**
   * Envía un mensaje freeform via integrations-service → Twilio
   */
  async sendMessage(
    token: string,
    to: string,
    body?: string,
    mediaUrl?: string,
    mediaContentType?: string,
  ): Promise<{ twilio_sid: string; status: string }> {
    return this.post(token, '/api/twilio/send', { to, body, mediaUrl, mediaContentType });
  }

  /**
   * Envía un template via integrations-service → Twilio
   */
  async sendTemplate(
    token: string,
    to: string,
    contentSid: string,
    contentVariables?: Record<string, string>,
  ): Promise<{ twilio_sid: string; status: string }> {
    return this.post(token, '/api/twilio/send-template', { to, contentSid, contentVariables });
  }

  /**
   * Sincroniza templates desde Twilio Content API
   */
  async syncTemplates(token: string): Promise<any> {
    return this.post(token, '/api/twilio/sync-templates', {});
  }

  /**
   * Prueba conexión con credenciales Twilio
   */
  async testConnection(token: string): Promise<{ success: boolean; account_name?: string; error?: string }> {
    return this.post(token, '/api/twilio/test-connection', {});
  }

  private async post(token: string, path: string, body: any): Promise<any> {
    const url = `${this.baseUrl}${path}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new BadRequestException(errorData.message || `Integrations service error: ${response.status}`);
      }

      return response.json();
    } catch (error: any) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error(`Error calling integrations-service ${path}: ${error.message}`);
      throw new BadRequestException(`Error de comunicación con el servicio de integraciones: ${error.message}`);
    }
  }
}
