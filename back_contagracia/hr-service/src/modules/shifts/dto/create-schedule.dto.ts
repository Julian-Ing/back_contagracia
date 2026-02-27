import { IsString, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateScheduleDto {
  @ApiProperty({ description: 'Nombre de la programación', example: 'Programación Marzo 2026' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Inicio del periodo', example: '2026-03-01' })
  @IsDateString()
  period_start: string;

  @ApiProperty({ description: 'Fin del periodo', example: '2026-03-31' })
  @IsDateString()
  period_end: string;

  @ApiPropertyOptional({ description: 'Notas' })
  @IsOptional()
  @IsString()
  notes?: string;
}
