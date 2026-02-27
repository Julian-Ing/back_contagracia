import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsDateString, IsOptional } from 'class-validator';

export class GenerateEvaluationsDto {
  @ApiProperty({ description: 'Periodo de evaluacion (ej: 2026-Q1, 2026-01)' })
  @IsString()
  @IsNotEmpty()
  evaluation_period: string;

  @ApiPropertyOptional({ description: 'Fecha inicio del periodo a analizar (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  date_from?: string;

  @ApiPropertyOptional({ description: 'Fecha fin del periodo a analizar (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  date_to?: string;
}
