import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsInt, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class QuerySettlementsDto {
  @ApiPropertyOptional({
    description: 'Filtrar por estado',
    enum: ['DRAFT', 'CALCULATED', 'APPROVED', 'PAID', 'CANCELLED'],
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por tipo de liquidación',
    enum: ['REGULAR', 'PRIMA', 'CESANTIAS', 'VACACIONES', 'TERMINACION'],
  })
  @IsOptional()
  @IsString()
  settlement_type?: string;

  @ApiPropertyOptional({ description: 'Filtrar por año' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  year?: number;

  @ApiPropertyOptional({ description: 'Filtrar por mes' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  month?: number;

  @ApiPropertyOptional({ description: 'Página', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Registros por página', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({ description: 'Campo de ordenamiento', default: 'created_at' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ description: 'Dirección de ordenamiento', enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsString()
  sortOrder?: string;
}
