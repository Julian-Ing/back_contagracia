import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsUUID, IsBoolean, IsIn, IsInt, Min, ValidateIf } from 'class-validator';

export class CreateActivityAutomationDto {
  @ApiPropertyOptional({ description: 'Nombre descriptivo' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'ID de etapa origen (null = cualquier etapa)' })
  @ValidateIf((o) => o.trigger_stage_from !== '' && o.trigger_stage_from != null)
  @IsUUID()
  @IsOptional()
  trigger_stage_from?: string;

  @ApiProperty({ description: 'ID de etapa destino' })
  @IsUUID()
  @IsNotEmpty()
  trigger_stage_to: string;

  @ApiProperty({ description: 'Tipo de actividad', enum: ['TASK', 'CALL', 'MEETING', 'EMAIL', 'NOTE'] })
  @IsString()
  @IsIn(['TASK', 'CALL', 'MEETING', 'EMAIL', 'NOTE'])
  activity_type: 'TASK' | 'CALL' | 'MEETING' | 'EMAIL' | 'NOTE';

  @ApiProperty({ description: 'Asunto de la actividad' })
  @IsString()
  @IsNotEmpty()
  activity_subject: string;

  @ApiPropertyOptional({ description: 'Descripción de la actividad' })
  @IsString()
  @IsOptional()
  activity_description?: string;

  @ApiPropertyOptional({ description: 'Días de desfase para programar la actividad', default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  days_offset?: number;

  @ApiPropertyOptional({ description: 'Regla de asignación', enum: ['same_as_owner', 'specific_user'], default: 'same_as_owner' })
  @IsString()
  @IsIn(['same_as_owner', 'specific_user'])
  @IsOptional()
  assigned_to_rule?: 'same_as_owner' | 'specific_user';

  @ApiPropertyOptional({ description: 'ID del usuario asignado (si assigned_to_rule = specific_user)' })
  @ValidateIf((o) => o.assigned_to_user_id !== '' && o.assigned_to_user_id != null)
  @IsUUID()
  @IsOptional()
  assigned_to_user_id?: string;
}

export class UpdateActivityAutomationDto {
  @ApiPropertyOptional({ description: 'Nombre descriptivo' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'ID de etapa origen' })
  @ValidateIf((o) => o.trigger_stage_from !== '' && o.trigger_stage_from != null)
  @IsUUID()
  @IsOptional()
  trigger_stage_from?: string;

  @ApiPropertyOptional({ description: 'ID de etapa destino' })
  @ValidateIf((o) => o.trigger_stage_to !== '' && o.trigger_stage_to != null)
  @IsUUID()
  @IsOptional()
  trigger_stage_to?: string;

  @ApiPropertyOptional({ description: 'Tipo de actividad' })
  @IsString()
  @IsIn(['TASK', 'CALL', 'MEETING', 'EMAIL', 'NOTE'])
  @IsOptional()
  activity_type?: 'TASK' | 'CALL' | 'MEETING' | 'EMAIL' | 'NOTE';

  @ApiPropertyOptional({ description: 'Asunto de la actividad' })
  @IsString()
  @IsOptional()
  activity_subject?: string;

  @ApiPropertyOptional({ description: 'Descripción de la actividad' })
  @IsString()
  @IsOptional()
  activity_description?: string;

  @ApiPropertyOptional({ description: 'Días de desfase' })
  @IsInt()
  @Min(0)
  @IsOptional()
  days_offset?: number;

  @ApiPropertyOptional({ description: 'Regla de asignación' })
  @IsString()
  @IsIn(['same_as_owner', 'specific_user'])
  @IsOptional()
  assigned_to_rule?: 'same_as_owner' | 'specific_user';

  @ApiPropertyOptional({ description: 'ID del usuario asignado' })
  @ValidateIf((o) => o.assigned_to_user_id !== '' && o.assigned_to_user_id != null)
  @IsUUID()
  @IsOptional()
  assigned_to_user_id?: string;

  @ApiPropertyOptional({ description: 'Activo' })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
