import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsDateString, IsString } from 'class-validator';

export class QueryAnalysisDto {
  @ApiPropertyOptional({ description: 'Fecha inicio del periodo a analizar (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  date_from?: string;

  @ApiPropertyOptional({ description: 'Fecha fin del periodo a analizar (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  date_to?: string;

  @ApiPropertyOptional({ description: 'Periodo predefinido', enum: ['1m', '3m', '6m', '1y'] })
  @IsOptional()
  @IsString()
  period?: string;
}
