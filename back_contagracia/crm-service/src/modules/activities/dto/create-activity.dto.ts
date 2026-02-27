import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsUUID, IsDateString } from 'class-validator';

export enum CrmActivityType {
  CALL = 'CALL',
  MEETING = 'MEETING',
  EMAIL = 'EMAIL',
  TASK = 'TASK',
  NOTE = 'NOTE',
  REMINDER = 'REMINDER',
  WHATSAPP_MESSAGE = 'WHATSAPP_MESSAGE',
}

export enum CrmActivityStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  CANCELED = 'CANCELED',
}

export class CreateActivityDto {
  @ApiProperty({ description: 'Tipo de actividad', enum: CrmActivityType })
  @IsEnum(CrmActivityType)
  @IsNotEmpty()
  type: CrmActivityType;

  @ApiProperty({ description: 'Asunto de la actividad' })
  @IsString()
  @IsNotEmpty()
  subject: string;

  @ApiPropertyOptional({ description: 'Descripcion' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Estado', enum: CrmActivityStatus, default: CrmActivityStatus.PENDING })
  @IsEnum(CrmActivityStatus)
  @IsOptional()
  status?: CrmActivityStatus;

  @ApiPropertyOptional({ description: 'ID del tercero (contacto)' })
  @IsUUID()
  @IsOptional()
  third_party_id?: string;

  @ApiPropertyOptional({ description: 'ID del lead' })
  @IsUUID()
  @IsOptional()
  lead_id?: string;

  @ApiPropertyOptional({ description: 'ID de la oportunidad' })
  @IsUUID()
  @IsOptional()
  opportunity_id?: string;

  @ApiPropertyOptional({ description: 'ID del usuario asignado' })
  @IsUUID()
  @IsOptional()
  user_id?: string;

  @ApiPropertyOptional({ description: 'ID de la campana' })
  @IsUUID()
  @IsOptional()
  campaign_id?: string;

  @ApiPropertyOptional({ description: 'Fecha limite' })
  @IsDateString()
  @IsOptional()
  due_date?: string;

  @ApiPropertyOptional({ description: 'Metadata adicional (JSON)' })
  @IsOptional()
  metadata?: any;
}
