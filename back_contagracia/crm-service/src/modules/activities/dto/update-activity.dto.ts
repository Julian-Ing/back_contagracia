import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsUUID, IsDateString } from 'class-validator';
import { CrmActivityType } from './create-activity.dto';

export class UpdateActivityDto {
  @ApiPropertyOptional({ description: 'Tipo de actividad', enum: CrmActivityType })
  @IsEnum(CrmActivityType)
  @IsOptional()
  type?: CrmActivityType;

  @ApiPropertyOptional({ description: 'Asunto' })
  @IsString()
  @IsOptional()
  subject?: string;

  @ApiPropertyOptional({ description: 'Descripcion' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Fecha limite' })
  @IsDateString()
  @IsOptional()
  due_date?: string;

  @ApiPropertyOptional({ description: 'ID del usuario asignado' })
  @IsUUID()
  @IsOptional()
  user_id?: string;

  @ApiPropertyOptional({ description: 'Metadata adicional (JSON)' })
  @IsOptional()
  metadata?: any;
}
