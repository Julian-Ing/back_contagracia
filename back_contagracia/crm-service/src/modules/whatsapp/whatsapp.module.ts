import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappInternalController } from './whatsapp-internal.controller';
import { WhatsappService } from './whatsapp.service';
import { WhatsappSendService } from './services/whatsapp-send.service';
import { IntegrationsClientService } from './services/integrations-client.service';

@Module({
  imports: [ConfigModule],
  controllers: [WhatsappController, WhatsappInternalController],
  providers: [WhatsappService, WhatsappSendService, IntegrationsClientService],
  exports: [WhatsappService],
})
export class WhatsappModule {}
