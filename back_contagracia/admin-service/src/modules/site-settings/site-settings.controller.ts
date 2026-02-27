import {
  Controller,
  Get,
  Put,
  Param,
  Body,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Audit } from '@contagracia/shared-modules';
import { SiteSettingsService } from './site-settings.service';
import { UpdateSiteSettingDto } from './dto/update-site-setting.dto';

@ApiTags('site-settings')
@ApiBearerAuth('JWT-auth')
@Controller('admin/site-settings')
export class SiteSettingsController {
  constructor(
    private readonly settingsService: SiteSettingsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar todas las configuraciones del sitio' })
  @ApiResponse({ status: 200, description: 'Lista de settings' })
  findAll() {
    return this.settingsService.findAll();
  }

  @Get(':key')
  @ApiOperation({ summary: 'Obtener un setting por key' })
  @ApiResponse({ status: 200, description: 'Setting encontrado' })
  @ApiResponse({ status: 404, description: 'Setting no encontrado' })
  findOne(@Param('key') key: string) {
    return this.settingsService.findOne(key);
  }

  @Put(':key')
  @Audit('site_setting.updated', 'site_setting')
  @ApiOperation({ summary: 'Actualizar un setting' })
  @ApiResponse({ status: 200, description: 'Setting actualizado' })
  update(@Param('key') key: string, @Body() dto: UpdateSiteSettingDto) {
    return this.settingsService.upsert(key, dto.value ?? null);
  }
}
