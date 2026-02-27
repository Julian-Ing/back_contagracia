import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsInt, IsNumber, IsBoolean, IsOptional, Min, Max } from 'class-validator';

export class UpdateReadingSessionDto {
  @ApiProperty({ description: 'ID del visitante' })
  @IsString()
  visitor_id: string;

  @ApiProperty({ description: 'Tiempo de lectura en segundos' })
  @IsInt()
  @Min(0)
  reading_time_seconds: number;

  @ApiProperty({ description: 'Porcentaje de scroll (0-100)' })
  @IsNumber()
  @Min(0)
  @Max(100)
  scroll_percentage: number;

  @ApiPropertyOptional({ description: 'Si completó la lectura (>=80% scroll)' })
  @IsBoolean()
  @IsOptional()
  completed_reading?: boolean;
}
