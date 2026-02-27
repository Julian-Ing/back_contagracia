import { Controller, Post, Body, Headers, UnauthorizedException, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '@contagracia/shared-modules';
import { ConfigService } from '@nestjs/config';
import { TenantPrismaService } from '../tenant/tenant-prisma.service';

/**
 * Controller interno para recibir callbacks de integrations-service.
 * Protegido por API key (no JWT) ya que las llamadas son inter-servicio.
 */
@ApiTags('WhatsApp Internal')
@Controller('internal/whatsapp')
export class WhatsappInternalController {
  private readonly logger = new Logger(WhatsappInternalController.name);

  constructor(
    private readonly tenantPrisma: TenantPrismaService,
    private readonly configService: ConfigService,
  ) {}

  private validateApiKey(apiKey: string) {
    const expectedKey = this.configService.get<string>('INTERNAL_API_KEY', '');
    if (!expectedKey || apiKey !== expectedKey) {
      throw new UnauthorizedException('Invalid internal API key');
    }
  }

  /**
   * Recibe mensajes inbound desde integrations-service (Twilio webhook → forward)
   */
  @Public()
  @Post('inbound')
  @ApiOperation({ summary: 'Recibir mensaje inbound (inter-service)' })
  async handleInbound(
    @Headers('x-internal-api-key') apiKey: string,
    @Body()
    body: {
      company_id: string;
      from_number: string;
      to_number: string;
      twilio_sid: string;
      body: string | null;
      message_type: string;
      media_url: string | null;
      media_content_type: string | null;
      account_sid: string;
    },
  ): Promise<any> {
    this.validateApiKey(apiKey);

    const db = await this.tenantPrisma.getClientForCompany(body.company_id);

    this.logger.log(`Inbound message from ${body.from_number} for company ${body.company_id}`);

    // 1. Buscar ThirdParty por variantes del teléfono
    const numberVariants = this.getNumberVariants(body.from_number);
    let thirdParty: { id: string; name: string | null } | null = null;

    for (const variant of numberVariants) {
      thirdParty = await db.thirdParty.findFirst({
        where: {
          OR: [{ phone: variant }, { whatsapp_number: variant }],
        },
        select: { id: true, name: true },
      });
      if (thirdParty) break;
    }

    // 2. Si no existe, crear con rol CONTACT
    if (!thirdParty) {
      thirdParty = await db.thirdParty.create({
        data: {
          name: body.from_number,
          phone: body.from_number,
          whatsapp_number: body.from_number,
          roles: ['CONTACT'],
          is_active: true,
        },
        select: { id: true, name: true },
      });
      this.logger.log(`Created new ThirdParty for ${body.from_number}`);
    }

    // 3. Get or create conversation
    let conversation = await db.crmWhatsappConversation.findFirst({
      where: { third_party_id: thirdParty.id, is_active: true },
    });

    if (!conversation) {
      conversation = await db.crmWhatsappConversation.create({
        data: {
          third_party_id: thirdParty.id,
          phone_number: body.from_number,
          is_active: true,
          status: 'open',
          last_message_at: new Date(),
          last_inbound_message_at: new Date(),
          unread_count: 1,
        },
      });
    } else {
      await db.crmWhatsappConversation.update({
        where: { id: conversation.id },
        data: {
          last_message_at: new Date(),
          last_inbound_message_at: new Date(),
          unread_count: { increment: 1 },
          status: 'open',
        },
      });
    }

    // 4. Crear mensaje
    const message = await db.crmWhatsappMessage.create({
      data: {
        conversation_id: conversation.id,
        third_party_id: thirdParty.id,
        direction: 'INBOUND',
        phone_number: body.from_number,
        message_type: body.message_type,
        message_content: body.body || '',
        media_url: body.media_url,
        media_content_type: body.media_content_type,
        twilio_sid: body.twilio_sid,
        status: 'DELIVERED',
        delivered_at: new Date(),
        metadata: { from: body.from_number, to: body.to_number, account_sid: body.account_sid },
      },
    });

    return { success: true, message_id: message.id, contact_name: thirdParty.name };
  }

  /**
   * Recibe status callbacks desde integrations-service
   */
  @Public()
  @Post('status-callback')
  @ApiOperation({ summary: 'Recibir status callback (inter-service)' })
  async handleStatusCallback(
    @Headers('x-internal-api-key') apiKey: string,
    @Body()
    body: {
      company_id: string | null;
      twilio_sid: string;
      status: string;
      error_code: string | null;
      error_message: string | null;
      original_status: string;
    },
  ): Promise<any> {
    this.validateApiKey(apiKey);

    this.logger.log(`Status callback: SID=${body.twilio_sid} → ${body.status}`);

    if (!body.company_id) {
      this.logger.warn('Status callback without company_id, skipping');
      return { success: false, error: 'Missing company_id' };
    }

    const db = await this.tenantPrisma.getClientForCompany(body.company_id);

    // Buscar mensaje por twilio_sid
    const message = await db.crmWhatsappMessage.findFirst({
      where: { twilio_sid: body.twilio_sid },
    });

    if (!message) {
      this.logger.warn(`Message not found for SID: ${body.twilio_sid}`);
      return { success: false, error: 'Message not found' };
    }

    // Actualizar status + timestamps
    const updateData: any = { status: body.status };

    if (body.status === 'DELIVERED') {
      updateData.delivered_at = new Date();
    } else if (body.status === 'READ') {
      updateData.read_at = new Date();
    } else if (body.status === 'FAILED') {
      updateData.failed_at = new Date();
      if (body.error_message) {
        updateData.failure_reason = `${body.error_code || ''} - ${body.error_message}`;
      }
    }

    await db.crmWhatsappMessage.update({
      where: { id: message.id },
      data: updateData,
    });

    return { success: true, message_id: message.id, status: body.status };
  }

  private getNumberVariants(number: string): string[] {
    const variants: string[] = [number];

    if (number.startsWith('+')) {
      variants.push(number.substring(1));
    } else {
      variants.push('+' + number);
    }

    if (number.startsWith('+57')) {
      variants.push(number.substring(3));
    } else if (number.startsWith('57') && number.length > 10) {
      variants.push(number.substring(2));
      variants.push('+' + number);
    }

    if (number.match(/^3\d{9}$/)) {
      variants.push('+57' + number);
      variants.push('57' + number);
    }

    return [...new Set(variants)];
  }
}
