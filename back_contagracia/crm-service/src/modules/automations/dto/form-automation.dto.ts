import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsUUID, IsBoolean, IsIn, IsInt, Min, Max, IsNumber, IsArray, ValidateIf } from 'class-validator';

export class CreateFormAutomationDto {
  @ApiProperty({ description: 'ID del formulario' })
  @IsUUID()
  @IsNotEmpty()
  form_id: string;

  @ApiPropertyOptional({ description: 'Crear lead automáticamente', default: true })
  @IsBoolean()
  @IsOptional()
  create_lead?: boolean;

  @ApiPropertyOptional({ description: 'Etapa inicial del lead' })
  @IsString()
  @IsOptional()
  lead_stage?: string;

  @ApiPropertyOptional({ description: 'Source del lead' })
  @IsString()
  @IsOptional()
  lead_source?: string;

  @ApiPropertyOptional({ description: 'Crear oportunidad automáticamente', default: false })
  @IsBoolean()
  @IsOptional()
  create_opportunity?: boolean;

  @ApiPropertyOptional({ description: 'ID de etapa inicial de la oportunidad' })
  @ValidateIf((o) => o.opportunity_stage_id !== '' && o.opportunity_stage_id != null)
  @IsUUID()
  @IsOptional()
  opportunity_stage_id?: string;

  @ApiPropertyOptional({ description: 'Valor de la oportunidad' })
  @IsNumber()
  @IsOptional()
  opportunity_value?: number;

  @ApiPropertyOptional({ description: 'Probabilidad de la oportunidad (0-100)' })
  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  opportunity_probability?: number;

  @ApiPropertyOptional({ description: 'Tipo de asignación', enum: ['none', 'round_robin', 'specific_user'], default: 'none' })
  @IsString()
  @IsIn(['none', 'round_robin', 'specific_user'])
  @IsOptional()
  assignment_type?: 'none' | 'round_robin' | 'specific_user';

  @ApiPropertyOptional({ description: 'ID del usuario asignado (si assignment_type = specific_user)' })
  @ValidateIf((o) => o.assigned_user_id !== '' && o.assigned_user_id != null)
  @IsUUID()
  @IsOptional()
  assigned_user_id?: string;

  @ApiPropertyOptional({ description: 'IDs de usuarios para round robin' })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  round_robin_users?: string[];

  @ApiPropertyOptional({ description: 'Enviar notificación al usuario asignado', default: false })
  @IsBoolean()
  @IsOptional()
  send_notification?: boolean;

  @ApiPropertyOptional({ description: 'Enviar respuesta automática al contacto', default: false })
  @IsBoolean()
  @IsOptional()
  auto_response_enabled?: boolean;

  @ApiPropertyOptional({ description: 'ID del template de respuesta automática' })
  @ValidateIf((o) => o.auto_response_template_id !== '' && o.auto_response_template_id != null)
  @IsUUID()
  @IsOptional()
  auto_response_template_id?: string;
}

export class UpdateFormAutomationDto {
  @ApiPropertyOptional({ description: 'Crear lead automáticamente' })
  @IsBoolean()
  @IsOptional()
  create_lead?: boolean;

  @ApiPropertyOptional({ description: 'Etapa inicial del lead' })
  @IsString()
  @IsOptional()
  lead_stage?: string;

  @ApiPropertyOptional({ description: 'Source del lead' })
  @IsString()
  @IsOptional()
  lead_source?: string;

  @ApiPropertyOptional({ description: 'Crear oportunidad automáticamente' })
  @IsBoolean()
  @IsOptional()
  create_opportunity?: boolean;

  @ApiPropertyOptional({ description: 'ID de etapa inicial de la oportunidad' })
  @ValidateIf((o) => o.opportunity_stage_id !== '' && o.opportunity_stage_id != null)
  @IsUUID()
  @IsOptional()
  opportunity_stage_id?: string;

  @ApiPropertyOptional({ description: 'Valor de la oportunidad' })
  @IsNumber()
  @IsOptional()
  opportunity_value?: number;

  @ApiPropertyOptional({ description: 'Probabilidad de la oportunidad' })
  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  opportunity_probability?: number;

  @ApiPropertyOptional({ description: 'Tipo de asignación' })
  @IsString()
  @IsIn(['none', 'round_robin', 'specific_user'])
  @IsOptional()
  assignment_type?: 'none' | 'round_robin' | 'specific_user';

  @ApiPropertyOptional({ description: 'ID del usuario asignado' })
  @ValidateIf((o) => o.assigned_user_id !== '' && o.assigned_user_id != null)
  @IsUUID()
  @IsOptional()
  assigned_user_id?: string;

  @ApiPropertyOptional({ description: 'IDs de usuarios para round robin' })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  round_robin_users?: string[];

  @ApiPropertyOptional({ description: 'Enviar notificación' })
  @IsBoolean()
  @IsOptional()
  send_notification?: boolean;

  @ApiPropertyOptional({ description: 'Respuesta automática habilitada' })
  @IsBoolean()
  @IsOptional()
  auto_response_enabled?: boolean;

  @ApiPropertyOptional({ description: 'ID del template de respuesta automática' })
  @ValidateIf((o) => o.auto_response_template_id !== '' && o.auto_response_template_id != null)
  @IsUUID()
  @IsOptional()
  auto_response_template_id?: string;

  @ApiPropertyOptional({ description: 'Activo' })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
