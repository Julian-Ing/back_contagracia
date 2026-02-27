import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsString, IsEnum, IsDateString, IsOptional, IsBoolean, Matches, MinLength } from 'class-validator';

enum OvertimeTypeDto {
  HED = 'HED',
  HEN = 'HEN',
  HEDDF = 'HEDDF',
  HENDF = 'HENDF',
  HRN = 'HRN',
  HRDDF = 'HRDDF',
  HRNDF = 'HRNDF',
}

export class CreateOvertimeDto {
  @ApiPropertyOptional({ description: 'ID del perfil de empleado (opcional, si no se envia se usa el del usuario autenticado)' })
  @IsOptional()
  @IsUUID()
  third_party_id?: string;

  @ApiProperty({ description: 'Fecha de la hora extra (YYYY-MM-DD)' })
  @IsDateString()
  overtime_date: string;

  @ApiProperty({ description: 'Hora de inicio (HH:mm)', example: '18:00' })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'start_time debe tener formato HH:mm' })
  start_time: string;

  @ApiProperty({ description: 'Hora de fin (HH:mm)', example: '20:00' })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'end_time debe tener formato HH:mm' })
  end_time: string;

  @ApiProperty({ description: 'Tipo de hora extra', enum: OvertimeTypeDto })
  @IsEnum(OvertimeTypeDto)
  overtime_type: OvertimeTypeDto;

  @ApiProperty({ description: 'Justificacion obligatoria' })
  @IsString()
  @MinLength(5, { message: 'La justificacion debe tener al menos 5 caracteres' })
  reason: string;

  @ApiPropertyOptional({ description: 'Notas adicionales' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'ID del centro de costo' })
  @IsOptional()
  @IsUUID()
  cost_center_id?: string;

  @ApiPropertyOptional({ description: 'Auto-aprobar la hora extra (requiere permiso overtime.approve)' })
  @IsOptional()
  @IsBoolean()
  auto_approve?: boolean;
}
