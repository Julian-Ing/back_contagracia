import { Controller, Get, Put, Post, Body, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Audit } from '@contagracia/shared-modules';
import { EmailConfigService } from './email-config.service';

// ─── DTO ────────────────────────────────────────────────────────

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

// ─── Controller ─────────────────────────────────────────────────

@ApiTags('Email Config')
@ApiBearerAuth()
@Controller('api/email-config')
export class EmailConfigController {
  constructor(private readonly emailConfigService: EmailConfigService) {}

  @Get()
  @ApiOperation({
    summary: 'Obtener configuración de email SMTP',
    description: 'Retorna la configuración SMTP del tenant. No incluye la contraseña.',
  })
  @ApiResponse({ status: 200, description: 'Configuración de email' })
  async getEmailConfig(@Request() req: any) {
    return this.emailConfigService.getEmailConfig(req.user.company_id);
  }

  @Put()
  @Audit('integrations.email.upsert_config', 'EmailConfig')
  @ApiOperation({
    summary: 'Guardar configuración de email SMTP',
    description: 'Crea o actualiza la configuración SMTP del tenant',
  })
  @ApiResponse({ status: 200, description: 'Configuración guardada exitosamente' })
  async upsertEmailConfig(
    @Request() req: any,
    @Body() dto: UpdateEmailConfigDto,
  ) {
    return this.emailConfigService.upsertEmailConfig(req.user.company_id, dto);
  }

  @Post('test')
  @Audit('integrations.email.test', 'EmailConfig')
  @ApiOperation({
    summary: 'Probar configuración de email',
    description: 'Envía un email de prueba usando la configuración SMTP guardada',
  })
  @ApiResponse({ status: 200, description: 'Resultado del test' })
  async testEmailConfig(@Request() req: any) {
    return this.emailConfigService.testEmailConfig(req.user.company_id);
  }
}
