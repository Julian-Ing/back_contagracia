import { Module } from '@nestjs/common';
import { SiteSettingsController } from './site-settings.controller';
import { SiteSettingsPublicController } from './site-settings-public.controller';
import { SiteSettingsService } from './site-settings.service';

@Module({
  controllers: [SiteSettingsController, SiteSettingsPublicController],
  providers: [SiteSettingsService],
  exports: [SiteSettingsService],
})
export class SiteSettingsModule {}
