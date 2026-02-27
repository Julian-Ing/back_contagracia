import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class RegisterAttendanceDto {
  @ApiPropertyOptional({ description: 'ID de la unidad' })
  @IsString()
  @IsOptional()
  unit_id?: string;

  @ApiPropertyOptional({ description: 'ID del tercero (residente)' })
  @IsString()
  @IsOptional()
  tercero_id?: string;

  @ApiPropertyOptional({ description: 'Nombre del residente' })
  @IsString()
  @IsOptional()
  resident_name?: string;

  @ApiPropertyOptional({ description: 'Etiqueta de la unidad (ej: Torre 1 - Apt 301)' })
  @IsString()
  @IsOptional()
  unit_label?: string;

  @ApiPropertyOptional({ description: 'Nombre del delegado/apoderado' })
  @IsString()
  @IsOptional()
  delegate_name?: string;

  @ApiPropertyOptional({ description: 'Notas' })
  @IsString()
  @IsOptional()
  notes?: string;
}
