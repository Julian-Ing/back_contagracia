import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '@contagracia/shared-modules';
import { SiteSettingsService } from './site-settings.service';

@ApiTags('site-settings-public')
@Public()
@Controller('site-settings')
export class SiteSettingsPublicController {
  constructor(private readonly settingsService: SiteSettingsService) {}

  @Get('metadata')
  @ApiOperation({ summary: 'Obtener metadatos públicos del sitio (sin auth)' })
  @ApiResponse({ status: 200, description: 'Metadatos del sitio' })
  getMetadata() {
    return this.settingsService.getPublicMetadata();
  }
}
