import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CompaniesService } from './companies.service';
import { RegisterCompanyDto } from './dto/register-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { UpdateCompanyInfoDto } from './dto/update-company-info.dto';
import { UpdateLegalRepDto } from './dto/update-legal-rep.dto';
import { UpdateContadorDto } from './dto/update-contador.dto';
import { UpdateRevisorFiscalDto } from './dto/update-revisor-fiscal.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { Public, Audit } from '@contagracia/shared-modules';

@ApiTags('Companies')
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  /**
   * Verificar si un NIT ya está registrado (público)
   */
  @Public()
  @Get('check-nit/:nit')
  @ApiOperation({ summary: 'Verificar si un NIT ya está registrado' })
  @ApiResponse({
    status: 200,
    description: 'Resultado de la verificación',
  })
  async checkNit(@Param('nit') nit: string) {
    return this.companiesService.checkNitExists(nit);
  }

  /**
   * Registro público de empresa (no requiere autenticación)
   */
  @Public()
  @Post('register')
  @Audit('company.registered', 'company')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registrar nueva empresa con administrador' })
  @ApiResponse({
    status: 201,
    description: 'Empresa registrada exitosamente',
  })
  @ApiResponse({
    status: 409,
    description: 'NIT o email ya registrado',
  })
  async register(@Body() dto: RegisterCompanyDto): Promise<any> {
    return this.companiesService.registerCompany(dto);
  }

  /**
   * Obtener información de una empresa (requiere autenticación)
   * NOTA: El acceso se valida via JWT (company_id del login)
   * Guards globales (JwtAuthGuard) protegen este endpoint automáticamente
   */
  @Get(':id')

  @ApiOperation({ summary: 'Obtener información de una empresa' })
  @ApiResponse({
    status: 200,
    description: 'Información de la empresa',
  })
  @ApiResponse({
    status: 404,
    description: 'Empresa no encontrada',
  })
  async getCompany(@Param('id') id: string): Promise<any> {
    return this.companiesService.getCompany(id);
  }

  /**
   * Actualizar información de una empresa (solo admin/owner)
   * NOTA: La verificación de permisos se hace en el tenant
   * Guards globales (JwtAuthGuard) protegen este endpoint automáticamente
   */
  @Patch(':id')
  @Audit('company.updated', 'company')

  @ApiOperation({ summary: 'Actualizar información de la empresa' })
  @ApiResponse({
    status: 200,
    description: 'Empresa actualizada exitosamente',
  })
  @ApiResponse({
    status: 403,
    description: 'Sin permisos para modificar',
  })
  async updateCompany(
    @Param('id') id: string,
    @Body() dto: UpdateCompanyDto,
  ) {
    return this.companiesService.updateCompany(id, dto);
  }

  /**
   * Actualizar información general de la empresa (NIT, razón social, etc.)
   */
  @Patch(':id/info')
  @Audit('company.info.updated', 'company')
  @ApiOperation({ summary: 'Actualizar información general de la empresa' })
  @ApiResponse({
    status: 200,
    description: 'Información general actualizada',
  })
  async updateCompanyInfo(
    @Param('id') id: string,
    @Body() dto: UpdateCompanyInfoDto,
  ) {
    return this.companiesService.updateCompanyInfo(id, dto);
  }

  /**
   * Actualizar representante legal de la empresa
   */
  @Patch(':id/legal-representative')
  @Audit('company.legal-rep.updated', 'company')
  @ApiOperation({ summary: 'Actualizar representante legal' })
  @ApiResponse({
    status: 200,
    description: 'Representante legal actualizado',
  })
  async updateLegalRep(
    @Param('id') id: string,
    @Body() dto: UpdateLegalRepDto,
  ) {
    return this.companiesService.updateLegalRep(id, dto);
  }

  /**
   * Actualizar contador de la empresa
   */
  @Patch(':id/contador')
  @Audit('company.contador.updated', 'company')
  @ApiOperation({ summary: 'Actualizar datos del contador' })
  @ApiResponse({ status: 200, description: 'Contador actualizado' })
  async updateContador(
    @Param('id') id: string,
    @Body() dto: UpdateContadorDto,
  ) {
    return this.companiesService.updateContador(id, dto);
  }

  /**
   * Actualizar revisor fiscal de la empresa
   */
  @Patch(':id/revisor-fiscal')
  @Audit('company.revisor-fiscal.updated', 'company')
  @ApiOperation({ summary: 'Actualizar datos del revisor fiscal' })
  @ApiResponse({ status: 200, description: 'Revisor fiscal actualizado' })
  async updateRevisorFiscal(
    @Param('id') id: string,
    @Body() dto: UpdateRevisorFiscalDto,
  ) {
    return this.companiesService.updateRevisorFiscal(id, dto);
  }

  /**
   * Actualizar configuración de decimales para visualización
   */
  @Patch(':id/settings')
  @Audit('company.settings.updated', 'company')
  @ApiOperation({ summary: 'Actualizar configuración de decimales' })
  @ApiResponse({
    status: 200,
    description: 'Configuración actualizada',
  })
  async updateSettings(
    @Param('id') id: string,
    @Body() dto: UpdateSettingsDto,
  ) {
    return this.companiesService.updateSettings(id, dto);
  }

  /**
   * Actualizar logo y/o firma de la empresa (URLs de media-service)
   */
  @Patch(':id/brand')
  @Audit('company.brand.updated', 'company')
  @ApiOperation({ summary: 'Actualizar logo y/o firma (media-service URLs)' })
  @ApiResponse({
    status: 200,
    description: 'Marca actualizada',
  })
  async updateBrand(
    @Param('id') id: string,
    @Body() dto: UpdateBrandDto,
  ) {
    return this.companiesService.updateBrand(id, dto);
  }

  /**
   * Endpoint interno: sincronizar empresa con API DIAN
   * Llamado por admin-service cuando cambia plan/módulos
   * Requiere autenticación interna (Bearer token)
   */
  @Public()
  @Post('internal/sync-dian')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[INTERNAL] Sincronizar empresa con DIAN' })
  @ApiResponse({
    status: 200,
    description: 'Sincronización iniciada',
  })
  async internalSyncDian(@Body() body: { company_id: string }): Promise<{ success: boolean; message: string }> {
    try {
      await this.companiesService.syncDianByCompanyId(body.company_id);
      return { success: true, message: 'Sincronización completada' };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }
}
