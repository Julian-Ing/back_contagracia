import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsDateString, IsEnum, MaxLength } from 'class-validator';

export class UpdateObservationDto {
  @ApiPropertyOptional({ description: 'Titulo de la observacion', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ description: 'Descripcion detallada' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Fecha de la observacion (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  observation_date?: string;

  @ApiPropertyOptional({ description: 'Tipo de observacion', enum: ['RECOGNITION', 'FEEDBACK', 'INCIDENT', 'WARNING', 'ACHIEVEMENT', 'CONCERN'] })
  @IsOptional()
  @IsEnum(['RECOGNITION', 'FEEDBACK', 'INCIDENT', 'WARNING', 'ACHIEVEMENT', 'CONCERN'])
  observation_type?: string;

  @ApiPropertyOptional({ description: 'Severidad', enum: ['LOW', 'MEDIUM', 'HIGH'] })
  @IsOptional()
  @IsEnum(['LOW', 'MEDIUM', 'HIGH'])
  severity?: string;

  @ApiPropertyOptional({ description: 'Estado', enum: ['ACTIVE', 'RESOLVED', 'ARCHIVED'] })
  @IsOptional()
  @IsEnum(['ACTIVE', 'RESOLVED', 'ARCHIVED'])
  status?: string;

  @ApiPropertyOptional({ description: 'Accion requerida' })
  @IsOptional()
  @IsString()
  action_required?: string;

  @ApiPropertyOptional({ description: 'Fecha de seguimiento (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  follow_up_date?: string;
}
