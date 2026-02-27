import { Controller, Get, Patch, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Audit } from '@contagracia/shared-modules';
import { IntegrationsService } from './integrations.service';

@ApiTags('Integrations')
@Controller('api/integrations')
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todas las integraciones' })
  findAll() {
    return this.integrationsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una integración por ID' })
  findOne(@Param('id') id: string) {
    return this.integrationsService.findOne(id);
  }

  @Get('code/:code')
  @ApiOperation({ summary: 'Obtener una integración por código' })
  findByCode(@Param('code') code: string) {
    return this.integrationsService.findByCode(code);
  }

  @Get(':id/keys')
  @ApiOperation({ summary: 'Obtener las claves de una integración' })
  getKeys(@Param('id') id: string) {
    return this.integrationsService.getKeys(id);
  }

  @Audit('integration.keys_updated', 'integration')
  @Patch(':id/keys')
  @ApiOperation({ summary: 'Actualizar claves de una integración' })
  updateKeys(
    @Param('id') id: string,
    @Body() body: { keys: { key_name: string; key_value: string }[] },
  ) {
    return this.integrationsService.updateKeys(id, body.keys);
  }

  @Audit('integration.key_updated', 'integration')
  @Patch('key/:keyId')
  @ApiOperation({ summary: 'Actualizar una clave específica' })
  updateKey(
    @Param('keyId') keyId: string,
    @Body() body: { value: string },
  ) {
    return this.integrationsService.updateKey(keyId, body.value);
  }

  @Audit('integration.toggled', 'integration')
  @Patch(':id/toggle')
  @ApiOperation({ summary: 'Activar/desactivar una integración' })
  toggleActive(
    @Param('id') id: string,
    @Body() body: { is_active: boolean },
  ) {
    return this.integrationsService.toggleActive(id, body.is_active);
  }
}
