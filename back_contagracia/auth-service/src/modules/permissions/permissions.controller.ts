import {
  Controller,
  Get,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Audit } from '@contagracia/shared-modules';
import { PermissionsService } from './permissions.service';

/**
 * PermissionsController en auth-service
 * Solo maneja verificación de módulos del plan.
 * Los permisos específicos de usuario se manejan en el tenant.
 *
 * Nota: JwtAuthGuard ya está registrado globalmente via AuthModule.forRoot()
 */
@ApiTags('Permissions')
@Controller('permissions')

export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get('modules')
  @ApiOperation({
    summary: 'Listar módulos de la compañía',
    description: 'Retorna los módulos habilitados para la compañía según el plan',
  })
  @ApiResponse({ status: 200, description: 'Módulos obtenidos exitosamente' })
  async getCompanyModules(@Req() req: any): Promise<any> {
    const { company_id } = req.user;
    if (!company_id) {
      return { modules: [], message: 'Sin empresa asociada' };
    }
    return this.permissionsService.getCompanyModules(company_id);
  }

  @Audit('permissions.check_module', 'permission')
  @Post('check-module')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verificar acceso a módulo',
    description: 'Verifica si el módulo está incluido en el plan de la compañía',
  })
  @ApiResponse({ status: 200, description: 'Verificación completada' })
  async checkModuleAccess(
    @Body() body: { module_key: string },
    @Req() req: any,
  ): Promise<any> {
    const { company_id } = req.user;
    if (!company_id) {
      return { allowed: false, reason: 'Sin empresa asociada' };
    }
    return this.permissionsService.checkModuleAccess(company_id, body.module_key);
  }
}
