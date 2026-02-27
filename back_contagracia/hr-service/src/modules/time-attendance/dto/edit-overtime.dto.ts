import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsDateString, Matches, MinLength, IsUUID } from 'class-validator';

enum OvertimeTypeDto {
  HED = 'HED',
  HEN = 'HEN',
  HEDDF = 'HEDDF',
  HENDF = 'HENDF',
  HRN = 'HRN',
  HRDDF = 'HRDDF',
  HRNDF = 'HRNDF',
}

export class EditOvertimeDto {
  @ApiPropertyOptional({ description: 'Fecha de la hora extra (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  overtime_date?: string;

  @ApiPropertyOptional({ description: 'Hora de inicio (HH:mm)', example: '18:00' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'start_time debe tener formato HH:mm' })
  start_time?: string;

  @ApiPropertyOptional({ description: 'Hora de fin (HH:mm)', example: '20:00' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'end_time debe tener formato HH:mm' })
  end_time?: string;

  @ApiPropertyOptional({ description: 'Tipo de hora extra', enum: OvertimeTypeDto })
  @IsOptional()
  @IsEnum(OvertimeTypeDto)
  overtime_type?: OvertimeTypeDto;

  @ApiPropertyOptional({ description: 'Justificacion' })
  @IsOptional()
  @IsString()
  @MinLength(5, { message: 'La justificacion debe tener al menos 5 caracteres' })
  reason?: string;

  @ApiPropertyOptional({ description: 'Notas adicionales' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'ID del centro de costo' })
  @IsOptional()
  @IsUUID()
  cost_center_id?: string;
}
