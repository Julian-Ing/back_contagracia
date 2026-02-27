import { Module } from '@nestjs/common';
import { TwilioController } from './twilio.controller';
import { TwilioWebhookController } from './twilio-webhook.controller';
import { TwilioClientService } from './services/twilio-client.service';
import { TwilioSendService } from './services/twilio-send.service';
import { TwilioWebhookService } from './services/twilio-webhook.service';
import { TwilioTemplateSyncService } from './services/twilio-template-sync.service';
import { TwilioMediaService } from './services/twilio-media.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TwilioController, TwilioWebhookController],
  providers: [
    TwilioClientService,
    TwilioSendService,
    TwilioWebhookService,
    TwilioTemplateSyncService,
    TwilioMediaService,
  ],
  exports: [TwilioClientService, TwilioSendService],
})
export class TwilioModule {}
