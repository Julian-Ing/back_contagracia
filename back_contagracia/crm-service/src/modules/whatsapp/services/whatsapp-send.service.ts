import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { TenantPrismaService } from '../../tenant/tenant-prisma.service';
import { IntegrationsClientService } from './integrations-client.service';
import { resolveVariables } from '../utils/variable-mapper';

@Injectable()
export class WhatsappSendService {
  private readonly logger = new Logger(WhatsappSendService.name);

  constructor(
    private readonly tenantPrisma: TenantPrismaService,
    private readonly integrationsClient: IntegrationsClientService,
  ) {}

  /**
   * Envía un mensaje freeform de WhatsApp.
   * Valida la ventana de 24h y la existencia del contacto.
   */
  async sendMessage(
    companyId: string,
    dto: { third_party_id: string; conversation_id?: string; body?: string; media_url?: string; media_content_type?: string },
    userId: string,
    token: string,
  ): Promise<any> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    // 1. Buscar contacto y validar teléfono
    const thirdParty = await db.thirdParty.findUnique({
      where: { id: dto.third_party_id },
      select: { id: true, name: true, phone: true, whatsapp_number: true },
    });

    if (!thirdParty) {
      throw new BadRequestException('Contacto no encontrado');
    }

    const phone = thirdParty.whatsapp_number || thirdParty.phone;
    if (!phone) {
      throw new BadRequestException('El contacto no tiene número de teléfono/WhatsApp');
    }

    // 2. Verificar ventana de 24h
    if (dto.conversation_id) {
      const conversation = await db.crmWhatsappConversation.findUnique({
        where: { id: dto.conversation_id },
        select: { last_inbound_message_at: true },
      });

      if (conversation) {
        const lastInbound = conversation.last_inbound_message_at;
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        if (!lastInbound || lastInbound < twentyFourHoursAgo) {
          throw new BadRequestException({
            message: 'Fuera de la ventana de 24 horas. Usa un template para iniciar la conversación.',
            canSendTemplate: true,
          });
        }
      }
    }

    // 3. Crear mensaje con status PENDING
    const message = await db.crmWhatsappMessage.create({
      data: {
        conversation_id: dto.conversation_id || null,
        third_party_id: dto.third_party_id,
        direction: 'OUTBOUND',
        phone_number: phone,
        message_type: dto.media_url ? 'media' : 'text',
        message_content: dto.body || '',
        media_url: dto.media_url || null,
        media_content_type: dto.media_content_type || null,
        user_id: userId,
        status: 'PENDING',
      },
    });

    // 4. Enviar via integrations-service
    try {
      const result = await this.integrationsClient.sendMessage(
        token,
        phone,
        dto.body,
        dto.media_url,
        dto.media_content_type,
      );

      // 5. Actualizar mensaje con twilio_sid
      await db.crmWhatsappMessage.update({
        where: { id: message.id },
        data: {
          twilio_sid: result.twilio_sid,
          status: result.status as any,
          sent_at: new Date(),
        },
      });

      // 6. Upsert conversation
      await this.upsertConversation(db, dto.third_party_id, phone, dto.conversation_id);

      return {
        success: true,
        message_id: message.id,
        twilio_sid: result.twilio_sid,
        status: result.status,
      };
    } catch (error: any) {
      // Update message as failed
      await db.crmWhatsappMessage.update({
        where: { id: message.id },
        data: {
          status: 'FAILED',
          failed_at: new Date(),
          failure_reason: error.message,
        },
      });
      throw error;
    }
  }

  /**
   * Envía un template de WhatsApp con resolución de variables.
   */
  async sendTemplate(
    companyId: string,
    dto: { third_party_id: string; template_id: string; variables?: Record<string, string>; conversation_id?: string },
    userId: string,
    token: string,
  ): Promise<any> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    // 1. Buscar contacto
    const thirdParty = await db.thirdParty.findUnique({
      where: { id: dto.third_party_id },
      select: { id: true, name: true, phone: true, whatsapp_number: true, email: true },
    });

    if (!thirdParty) {
      throw new BadRequestException('Contacto no encontrado');
    }

    const phone = thirdParty.whatsapp_number || thirdParty.phone;
    if (!phone) {
      throw new BadRequestException('El contacto no tiene número de teléfono/WhatsApp');
    }

    // 2. Buscar template
    const template = await db.crmWhatsappTemplate.findUnique({
      where: { id: dto.template_id },
    });

    if (!template) {
      throw new BadRequestException('Template no encontrado');
    }

    if (!template.is_active) {
      throw new BadRequestException('El template no está activo');
    }

    // 3. Resolver variables
    let finalVariables = dto.variables || {};

    if (
      (!dto.variables || Object.keys(dto.variables).length === 0) &&
      template.variable_mapping &&
      typeof template.variable_mapping === 'object' &&
      Object.keys(template.variable_mapping as any).length > 0
    ) {
      const context = { company_name: '' }; // TODO: get from company
      finalVariables = resolveVariables(template.variable_mapping as any, thirdParty, context);
    }

    // 4. Resolver el body para almacenamiento local
    let messageBody = template.body_template || '';
    for (const [key, value] of Object.entries(finalVariables)) {
      messageBody = messageBody.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }

    // 5. Crear mensaje PENDING
    const message = await db.crmWhatsappMessage.create({
      data: {
        conversation_id: dto.conversation_id || null,
        third_party_id: dto.third_party_id,
        direction: 'OUTBOUND',
        phone_number: phone,
        message_type: 'template',
        message_content: messageBody,
        template_name: template.name,
        template_params: finalVariables as any,
        user_id: userId,
        status: 'PENDING',
      },
    });

    // 6. Enviar via integrations-service
    try {
      const result = await this.integrationsClient.sendTemplate(
        token,
        phone,
        template.template_sid,
        Object.keys(finalVariables).length > 0 ? finalVariables : undefined,
      );

      await db.crmWhatsappMessage.update({
        where: { id: message.id },
        data: {
          twilio_sid: result.twilio_sid,
          status: result.status as any,
          sent_at: new Date(),
        },
      });

      await this.upsertConversation(db, dto.third_party_id, phone, dto.conversation_id);

      return {
        success: true,
        message_id: message.id,
        twilio_sid: result.twilio_sid,
        status: result.status,
      };
    } catch (error: any) {
      await db.crmWhatsappMessage.update({
        where: { id: message.id },
        data: {
          status: 'FAILED',
          failed_at: new Date(),
          failure_reason: error.message,
        },
      });
      throw error;
    }
  }

  /**
   * Sincroniza templates desde Twilio y los guarda/actualiza en la DB
   */
  async syncTemplates(companyId: string, token: string): Promise<any> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const result = await this.integrationsClient.syncTemplates(token);

    if (!result.templates || result.templates.length === 0) {
      return { synced: 0, created: 0, updated: 0, message: 'No se encontraron templates en Twilio' };
    }

    let created = 0;
    let updated = 0;

    for (const t of result.templates) {
      const existing = await db.crmWhatsappTemplate.findUnique({
        where: { template_sid: t.sid },
      });

      const data = {
        name: t.name,
        language: t.language,
        body_template: t.body_template,
        variables: t.variables.length > 0 ? t.variables : undefined,
        template_type: t.template_type,
        template_config: t.template_config,
        header_text: t.header_text,
        footer_text: t.footer_text,
        buttons: t.buttons.length > 0 ? t.buttons : undefined,
        media_url: t.media_url,
        twilio_status: t.twilio_status,
        last_synced_at: new Date(),
        is_active: true,
      };

      if (existing) {
        await db.crmWhatsappTemplate.update({
          where: { id: existing.id },
          data,
        });
        updated++;
      } else {
        await db.crmWhatsappTemplate.create({
          data: { ...data, template_sid: t.sid },
        });
        created++;
      }
    }

    return {
      synced: result.templates.length,
      created,
      updated,
      errors: result.errors || 0,
    };
  }

  private async upsertConversation(db: any, thirdPartyId: string, phone: string, conversationId?: string) {
    if (conversationId) {
      await db.crmWhatsappConversation.update({
        where: { id: conversationId },
        data: { last_message_at: new Date() },
      });
    } else {
      // Find or create conversation
      const existing = await db.crmWhatsappConversation.findFirst({
        where: { third_party_id: thirdPartyId, is_active: true },
      });

      if (existing) {
        await db.crmWhatsappConversation.update({
          where: { id: existing.id },
          data: { last_message_at: new Date() },
        });
      } else {
        await db.crmWhatsappConversation.create({
          data: {
            third_party_id: thirdPartyId,
            phone_number: phone,
            is_active: true,
            status: 'open',
            last_message_at: new Date(),
          },
        });
      }
    }
  }
}
