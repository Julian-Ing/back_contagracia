import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TenantModule } from '../tenant/tenant.module';
import { IntegrationsService } from './integrations.service';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsClientService } from '../whatsapp/services/integrations-client.service';

@Module({
  imports: [TenantModule, ConfigModule],
  controllers: [IntegrationsController],
  providers: [IntegrationsService, IntegrationsClientService],
  exports: [IntegrationsService],
})
export class IntegrationsModule {}
