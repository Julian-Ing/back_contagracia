import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsUUID, IsDateString, IsEnum, IsOptional, MaxLength } from 'class-validator';

export class CreateObservationDto {
  @ApiProperty({ description: 'ID del tercero (empleado)' })
  @IsUUID()
  @IsNotEmpty()
  third_party_id: string;

  @ApiProperty({ description: 'Titulo de la observacion', maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiProperty({ description: 'Descripcion detallada' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ description: 'Fecha de la observacion (YYYY-MM-DD)' })
  @IsDateString()
  @IsNotEmpty()
  observation_date: string;

  @ApiProperty({ description: 'Tipo de observacion', enum: ['RECOGNITION', 'FEEDBACK', 'INCIDENT', 'WARNING', 'ACHIEVEMENT', 'CONCERN'] })
  @IsEnum(['RECOGNITION', 'FEEDBACK', 'INCIDENT', 'WARNING', 'ACHIEVEMENT', 'CONCERN'])
  @IsNotEmpty()
  observation_type: string;

  @ApiPropertyOptional({ description: 'Severidad', enum: ['LOW', 'MEDIUM', 'HIGH'], default: 'MEDIUM' })
  @IsOptional()
  @IsEnum(['LOW', 'MEDIUM', 'HIGH'])
  severity?: string;

  @ApiPropertyOptional({ description: 'Accion requerida' })
  @IsOptional()
  @IsString()
  action_required?: string;

  @ApiPropertyOptional({ description: 'Fecha de seguimiento (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  follow_up_date?: string;
}
