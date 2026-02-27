import { IsString, IsOptional, IsEnum, IsBoolean, IsInt, Min, Matches, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateShiftTemplateDto {
  @ApiProperty({ description: 'Nombre del turno', example: 'Turno Mañana' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Código del turno', example: 'TM-01' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({ description: 'Tipo de turno', enum: ['MORNING', 'AFTERNOON', 'NIGHT', 'SPLIT', 'CUSTOM'] })
  @IsEnum(['MORNING', 'AFTERNOON', 'NIGHT', 'SPLIT', 'CUSTOM'])
  shift_type: string;

  @ApiProperty({ description: 'Hora inicio HH:mm', example: '06:00' })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'start_time debe ser formato HH:mm' })
  start_time: string;

  @ApiProperty({ description: 'Hora fin HH:mm', example: '14:00' })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'end_time debe ser formato HH:mm' })
  end_time: string;

  @ApiPropertyOptional({ description: 'Hora inicio descanso HH:mm' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  break_start?: string;

  @ApiPropertyOptional({ description: 'Hora fin descanso HH:mm' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  break_end?: string;

  @ApiPropertyOptional({ description: 'Minutos de descanso', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  break_minutes?: number;

  @ApiProperty({ description: 'Horas netas de trabajo', example: 8 })
  @IsNumber()
  total_hours: number;

  @ApiPropertyOptional({ description: 'Color hex para UI', example: '#3B82F6' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ description: 'Descripción' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Turno cruza medianoche', default: false })
  @IsOptional()
  @IsBoolean()
  is_overnight?: boolean;
}
