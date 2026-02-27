import { Controller, Post, Param, Request, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '@contagracia/shared-modules';
import { TwilioWebhookService } from './services/twilio-webhook.service';

@ApiTags('Twilio Webhook')
@Controller('webhooks/twilio')
export class TwilioWebhookController {
  private readonly logger = new Logger(TwilioWebhookController.name);

  constructor(private readonly webhookService: TwilioWebhookService) {}

  @Public()
  @Post('whatsapp/:companyId')
  @ApiOperation({ summary: 'Webhook Twilio WhatsApp (inbound + status callbacks)' })
  async handleWhatsAppWebhook(
    @Param('companyId') companyId: string,
    @Request() req: any,
  ) {
    // Twilio envía datos como application/x-www-form-urlencoded
    const payload: Record<string, string> = {};

    // Si el body ya fue parseado como objeto (urlencoded)
    if (req.body && typeof req.body === 'object') {
      for (const [key, value] of Object.entries(req.body)) {
        payload[key] = String(value);
      }
    }

    return this.webhookService.handleWebhook(companyId, payload);
  }
}
