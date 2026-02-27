import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsDateString } from 'class-validator';

export class EditAttendanceDto {
  @ApiPropertyOptional({ description: 'Hora de entrada (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  check_in?: string;

  @ApiPropertyOptional({ description: 'Hora de salida (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  check_out?: string;

  @ApiPropertyOptional({ description: 'Notas' })
  @IsOptional()
  @IsString()
  notes?: string;
}
