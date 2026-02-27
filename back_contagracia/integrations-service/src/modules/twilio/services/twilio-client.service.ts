import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { TenantContextService } from '@contagracia/shared-modules';
import { normalizePhone } from '../utils/phone-utils';

interface TwilioCredentials {
  accountSid: string;
  authToken: string;
  whatsappNumber: string;
}

@Injectable()
export class TwilioClientService {
  private readonly logger = new Logger(TwilioClientService.name);
  private credentialsCache = new Map<string, { credentials: TwilioCredentials; cachedAt: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutos

  constructor(private readonly tenantContext: TenantContextService) {}

  /**
   * Obtiene las credenciales de Twilio para una empresa desde EmailSmsConfig
   */
  async getCredentials(companyId: string): Promise<TwilioCredentials> {
    // Check cache
    const cached = this.credentialsCache.get(companyId);
    if (cached && Date.now() - cached.cachedAt < this.CACHE_TTL) {
      return cached.credentials;
    }

    const tenantClient = await this.tenantContext.getTenantClient(companyId);
    if (!tenantClient) {
      throw new BadRequestException('No se pudo conectar a la base de datos del tenant');
    }

    const config = await (tenantClient as any).emailSmsConfig.findFirst();

    if (!config?.twilio_account_sid || !config?.twilio_auth_token || !config?.twilio_whatsapp_number) {
      throw new BadRequestException(
        'Credenciales de Twilio no configuradas. Configure Account SID, Auth Token y número WhatsApp en el Perfil de Empresa.',
      );
    }

    const credentials: TwilioCredentials = {
      accountSid: config.twilio_account_sid,
      authToken: config.twilio_auth_token,
      whatsappNumber: normalizePhone(config.twilio_whatsapp_number),
    };

    this.credentialsCache.set(companyId, { credentials, cachedAt: Date.now() });
    return credentials;
  }

  /**
   * Genera el header de autenticación Basic para Twilio API
   */
  getAuthHeader(credentials: TwilioCredentials): string {
    return 'Basic ' + Buffer.from(`${credentials.accountSid}:${credentials.authToken}`).toString('base64');
  }

  /**
   * Prueba la conexión con las credenciales de Twilio
   */
  async testConnection(companyId: string): Promise<{ success: boolean; account_name?: string; error?: string }> {
    try {
      const credentials = await this.getCredentials(companyId);
      const url = `https://api.twilio.com/2010-04-01/Accounts/${credentials.accountSid}.json`;

      const response = await fetch(url, {
        method: 'GET',
        headers: { Authorization: this.getAuthHeader(credentials) },
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, error: `Twilio API error: ${response.status} - ${errorText}` };
      }

      const data = await response.json();
      return {
        success: true,
        account_name: data.friendly_name,
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Invalida el cache de credenciales para una empresa
   */
  invalidateCache(companyId: string): void {
    this.credentialsCache.delete(companyId);
  }
}
