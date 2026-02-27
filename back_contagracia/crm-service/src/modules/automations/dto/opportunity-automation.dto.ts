import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsUUID, IsBoolean, IsIn } from 'class-validator';

export class CreateOpportunityAutomationDto {
  @ApiPropertyOptional({ description: 'Nombre descriptivo' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'ID de etapa origen (null = cualquier etapa)' })
  @IsUUID()
  @IsOptional()
  trigger_stage_from?: string;

  @ApiProperty({ description: 'ID de etapa destino' })
  @IsUUID()
  @IsNotEmpty()
  trigger_stage_to!: string;

  @ApiProperty({ description: 'Tipo de acción', enum: ['email', 'whatsapp'] })
  @IsString()
  @IsIn(['email', 'whatsapp'])
  action_type!: 'email' | 'whatsapp';

  // Templates son opcionales - sin validación UUID porque vienen de perfil empresa
  @ApiPropertyOptional({ description: 'ID del template de email' })
  @IsString()
  @IsOptional()
  email_template_id?: string;

  @ApiPropertyOptional({ description: 'ID del template de WhatsApp' })
  @IsString()
  @IsOptional()
  whatsapp_template_id?: string;
}

export class UpdateOpportunityAutomationDto {
  @ApiPropertyOptional({ description: 'Nombre descriptivo' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'ID de etapa origen' })
  @IsUUID()
  @IsOptional()
  trigger_stage_from?: string;

  @ApiPropertyOptional({ description: 'ID de etapa destino' })
  @IsUUID()
  @IsOptional()
  trigger_stage_to?: string;

  @ApiPropertyOptional({ description: 'Tipo de acción', enum: ['email', 'whatsapp'] })
  @IsString()
  @IsIn(['email', 'whatsapp'])
  @IsOptional()
  action_type?: 'email' | 'whatsapp';

  // Templates sin validación UUID
  @ApiPropertyOptional({ description: 'ID del template de email' })
  @IsString()
  @IsOptional()
  email_template_id?: string;

  @ApiPropertyOptional({ description: 'ID del template de WhatsApp' })
  @IsString()
  @IsOptional()
  whatsapp_template_id?: string;

  @ApiPropertyOptional({ description: 'Activo' })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
