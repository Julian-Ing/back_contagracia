import { Controller, Get, Put, Post, Param, Body, Headers, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { JwtAuthGuard, RequirePermissions, Audit } from '@contagracia/shared-modules';
import { IntegrationsService } from './integrations.service';
import { IntegrationsClientService } from '../whatsapp/services/integrations-client.service';

// ============================================
// DTOs
// ============================================

class UpdateEmailConfigDto {
  @ApiProperty({ description: 'Servidor SMTP', example: 'smtp.gmail.com' })
  @IsString()
  @IsOptional()
  smtp_host?: string;

  @ApiProperty({ description: 'Puerto SMTP', example: 587 })
  @IsNumber()
  @IsOptional()
  smtp_port?: number;

  @ApiProperty({ description: 'Usuario SMTP (email)', example: 'user@gmail.com' })
  @IsString()
  @IsOptional()
  smtp_user?: string;

  @ApiProperty({ description: 'Contraseña SMTP' })
  @IsString()
  @IsOptional()
  smtp_password?: string;

  @ApiProperty({ description: 'Nombre del remitente', example: 'Mi Empresa' })
  @IsString()
  @IsOptional()
  from_name?: string;
}

class UpdateTwilioConfigDto {
  @ApiProperty({ description: 'Twilio Account SID' })
  @IsString()
  @IsOptional()
  twilio_account_sid?: string;

  @ApiProperty({ description: 'Twilio Auth Token' })
  @IsString()
  @IsOptional()
  twilio_auth_token?: string;

  @ApiProperty({ description: 'Número de WhatsApp Twilio', example: '+1234567890' })
  @IsString()
  @IsOptional()
  twilio_whatsapp_number?: string;
}

// ============================================
// Controller
// ============================================

@ApiTags('CRM Integrations')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('companies/:companyId/crm')
export class IntegrationsController {
  constructor(
    private readonly integrationsService: IntegrationsService,
    private readonly integrationsClient: IntegrationsClientService,
  ) {}

  // ============================================
  // Email Config
  // ============================================

  @Get('email-config')
  @RequirePermissions('crm.integrations.view')
  @ApiOperation({
    summary: 'Obtener configuración de email SMTP',
    description: 'Retorna la configuración SMTP del tenant para envío de emails. No incluye la contraseña.',
  })
  @ApiParam({ name: 'companyId', description: 'ID de la empresa (tenant)' })
  @ApiResponse({ status: 200, description: 'Configuración de email' })
  async getEmailConfig(@Param('companyId') companyId: string) {
    return this.integrationsService.getEmailConfig(companyId);
  }

  @Put('email-config')
  @RequirePermissions('crm.integrations.manage')
  @Audit('crm.integrations.upsert_email_config', 'CrmIntegration')
  @ApiOperation({
    summary: 'Guardar configuración de email SMTP',
    description: 'Crea o actualiza la configuración SMTP del tenant',
  })
  @ApiParam({ name: 'companyId', description: 'ID de la empresa (tenant)' })
  @ApiResponse({ status: 200, description: 'Configuración guardada exitosamente' })
  async upsertEmailConfig(
    @Param('companyId') companyId: string,
    @Body() dto: UpdateEmailConfigDto,
  ) {
    return this.integrationsService.upsertEmailConfig(companyId, dto);
  }

  @Post('email-config/test')
  @RequirePermissions('crm.integrations.manage')
  @Audit('crm.integrations.test_email', 'CrmIntegration')
  @ApiOperation({
    summary: 'Probar configuración de email',
    description: 'Envía un email de prueba usando la configuración SMTP guardada',
  })
  @ApiParam({ name: 'companyId', description: 'ID de la empresa (tenant)' })
  @ApiResponse({ status: 200, description: 'Resultado del test' })
  async testEmailConfig(@Param('companyId') companyId: string) {
    return this.integrationsService.testEmailConfig(companyId);
  }

  // ============================================
  // Twilio Config
  // ============================================

  @Get('twilio-config')
  @RequirePermissions('crm.integrations.view')
  @ApiOperation({
    summary: 'Obtener configuración de Twilio',
    description: 'Retorna la configuración de Twilio del tenant. No incluye el auth token.',
  })
  @ApiParam({ name: 'companyId', description: 'ID de la empresa (tenant)' })
  @ApiResponse({ status: 200, description: 'Configuración de Twilio' })
  async getTwilioConfig(@Param('companyId') companyId: string) {
    return this.integrationsService.getTwilioConfig(companyId);
  }

  @Put('twilio-config')
  @RequirePermissions('crm.integrations.manage')
  @Audit('crm.integrations.upsert_twilio_config', 'CrmIntegration')
  @ApiOperation({
    summary: 'Guardar configuración de Twilio',
    description: 'Crea o actualiza la configuración de Twilio del tenant',
  })
  @ApiParam({ name: 'companyId', description: 'ID de la empresa (tenant)' })
  @ApiResponse({ status: 200, description: 'Configuración guardada exitosamente' })
  async upsertTwilioConfig(
    @Param('companyId') companyId: string,
    @Body() dto: UpdateTwilioConfigDto,
  ) {
    return this.integrationsService.upsertTwilioConfig(companyId, dto);
  }

  @Post('twilio-config/test')
  @RequirePermissions('crm.integrations.manage')
  @Audit('crm.integrations.test_twilio', 'CrmIntegration')
  @ApiOperation({
    summary: 'Probar conexión con Twilio',
    description: 'Verifica las credenciales de Twilio configuradas para el tenant',
  })
  @ApiParam({ name: 'companyId', description: 'ID de la empresa (tenant)' })
  @ApiResponse({ status: 200, description: 'Resultado del test de conexión' })
  async testTwilioConfig(
    @Param('companyId') companyId: string,
    @Headers('authorization') authHeader: string,
  ) {
    const token = authHeader?.replace('Bearer ', '') || '';
    return this.integrationsClient.testConnection(token);
  }
}
