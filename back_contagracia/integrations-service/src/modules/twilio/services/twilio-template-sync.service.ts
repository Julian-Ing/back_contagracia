import { Injectable, Logger } from '@nestjs/common';
import { TwilioClientService } from './twilio-client.service';

export interface SyncedTemplate {
  sid: string;
  name: string;
  language: string;
  template_type: string;
  body_template: string;
  variables: string[];
  template_config: any;
  header_text: string | null;
  footer_text: string | null;
  buttons: any[];
  media_url: string | null;
  twilio_status: string;
}

@Injectable()
export class TwilioTemplateSyncService {
  private readonly logger = new Logger(TwilioTemplateSyncService.name);

  constructor(private readonly twilioClient: TwilioClientService) {}

  /**
   * Sincroniza templates desde Twilio Content API.
   * Retorna los templates parseados (NO guarda en DB — eso lo hace CRM).
   */
  async syncTemplates(companyId: string): Promise<{ templates: SyncedTemplate[]; synced: number; errors: number }> {
    const credentials = await this.twilioClient.getCredentials(companyId);
    const authHeader = this.twilioClient.getAuthHeader(credentials);

    // Fetch templates desde Twilio Content API
    const response = await fetch('https://content.twilio.com/v1/Content', {
      method: 'GET',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`Twilio Content API error: ${errorText}`);
      throw new Error(`Error de Twilio Content API: ${response.status}`);
    }

    const data = await response.json();
    const contents = data.contents || [];

    if (contents.length === 0) {
      return { templates: [], synced: 0, errors: 0 };
    }

    // Filtrar templates con contenido válido
    const validTemplates = contents.filter((t: any) => {
      const types = t.types || {};
      return (
        types['twilio/text'] ||
        types['twilio/media'] ||
        types['twilio/quick-reply'] ||
        types['twilio/call-to-action'] ||
        types['twilio/card'] ||
        types['twilio/list-picker'] ||
        types['twilio/carousel'] ||
        t.language
      );
    });

    const results: SyncedTemplate[] = [];
    let errors = 0;

    for (const template of validTemplates) {
      try {
        const templateType = this.detectTemplateType(template);
        const bodyText = this.extractMessageText(template);
        const variables = this.extractVariables(bodyText);
        const buttons = this.extractButtons(template);
        const mediaUrl = this.extractMediaUrl(template);
        const headerText = this.extractHeaderText(template);
        const footerText = this.extractFooterText(template);

        // Obtener estado de aprobación WhatsApp
        const approvalStatus = await this.getWhatsAppApprovalStatus(
          template.sid,
          credentials.accountSid,
          credentials.authToken,
        );

        results.push({
          sid: template.sid,
          name: template.friendly_name || 'Sin nombre',
          language: template.language || 'es',
          template_type: templateType,
          body_template: bodyText,
          variables,
          template_config: template.types || {},
          header_text: headerText,
          footer_text: footerText,
          buttons,
          media_url: mediaUrl,
          twilio_status: approvalStatus,
        });
      } catch (error: any) {
        this.logger.error(`Error parsing template ${template.sid}: ${error.message}`);
        errors++;
      }
    }

    return { templates: results, synced: results.length, errors };
  }

  private detectTemplateType(template: any): string {
    const types = template.types || {};
    if (types['twilio/quick-reply']) return 'quick_reply';
    if (types['twilio/call-to-action']) return 'call_to_action';
    if (types['twilio/card']) return 'card';
    if (types['twilio/list-picker']) return 'list';
    if (types['twilio/carousel']) return 'carousel';
    if (types['twilio/catalog']) return 'catalog';
    if (types['twilio/authentication']) return 'authentication';
    if (types['twilio/media']) return 'media';
    if (types['twilio/text']) return 'text';
    return 'text';
  }

  private extractMessageText(template: any): string {
    const types = template.types || {};
    return (
      types['twilio/text']?.body ||
      types['twilio/media']?.body ||
      types['twilio/quick-reply']?.body ||
      types['twilio/call-to-action']?.body ||
      types['twilio/card']?.body ||
      types['twilio/list-picker']?.body ||
      types['twilio/carousel']?.body ||
      ''
    );
  }

  private extractVariables(messageText: string): string[] {
    if (!messageText) return [];
    const matches = messageText.match(/\{\{(\d+)\}\}/g);
    if (matches) {
      return [...new Set(matches.map((v: string) => v.replace(/[{}]/g, '')))];
    }
    return [];
  }

  private extractButtons(template: any): any[] {
    const types = template.types || {};

    if (types['twilio/quick-reply']?.actions) {
      return types['twilio/quick-reply'].actions.map((a: any) => ({
        type: 'QUICK_REPLY',
        text: a.title || a.text,
        payload: a.id || a.payload,
      }));
    }

    if (types['twilio/call-to-action']?.actions) {
      return types['twilio/call-to-action'].actions.map((a: any) => ({
        type: a.type,
        text: a.title || a.text,
        url: a.url,
        phone: a.phone,
      }));
    }

    if (types['twilio/card']?.actions) {
      return types['twilio/card'].actions.map((a: any) => ({
        type: a.type,
        text: a.title || a.text,
        url: a.url,
        phone: a.phone,
        payload: a.id || a.payload,
      }));
    }

    if (types['twilio/list-picker']?.items) {
      return types['twilio/list-picker'].items.map((item: any) => ({
        type: 'LIST_ITEM',
        text: item.item,
        description: item.description,
        payload: item.id,
      }));
    }

    return [];
  }

  private extractMediaUrl(template: any): string | null {
    const types = template.types || {};
    if (types['twilio/media']?.media?.length > 0) return types['twilio/media'].media[0];
    if (types['twilio/card']?.media?.length > 0) return types['twilio/card'].media[0];
    return null;
  }

  private extractHeaderText(template: any): string | null {
    const types = template.types || {};
    if (types['twilio/card']?.title) return types['twilio/card'].title;
    if (types['twilio/list-picker']?.title) return types['twilio/list-picker'].title;
    return null;
  }

  private extractFooterText(template: any): string | null {
    const types = template.types || {};
    if (types['twilio/card']?.subtitle) return types['twilio/card'].subtitle;
    return null;
  }

  private async getWhatsAppApprovalStatus(
    contentSid: string,
    accountSid: string,
    authToken: string,
  ): Promise<string> {
    try {
      const url = `https://content.twilio.com/v1/Content/${contentSid}/ApprovalRequests`;
      const authHeader = 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64');

      const response = await fetch(url, {
        method: 'GET',
        headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      });

      if (!response.ok) return 'unknown';

      const data = await response.json();

      if (data.whatsapp) {
        const status = data.whatsapp.status?.toLowerCase();
        if (status === 'approved') return 'approved';
        if (status === 'rejected') return 'rejected';
        if (status === 'pending') return 'pending';
        if (status === 'unsubmitted' || status === 'not submitted') return 'not_submitted';
      }

      return 'unknown';
    } catch {
      return 'unknown';
    }
  }
}
