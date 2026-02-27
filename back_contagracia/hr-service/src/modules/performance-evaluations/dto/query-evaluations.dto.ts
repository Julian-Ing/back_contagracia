import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsDateString, IsNumberString, IsString, IsEnum } from 'class-validator';

export class QueryEvaluationsDto {
  @ApiPropertyOptional({ description: 'Filtrar por empleado (third_party_id)' })
  @IsOptional()
  @IsUUID()
  third_party_id?: string;

  @ApiPropertyOptional({ description: 'Filtrar por periodo (ej: 2026-Q1)' })
  @IsOptional()
  @IsString()
  evaluation_period?: string;

  @ApiPropertyOptional({ description: 'Buscar por nombre o documento del empleado' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Estado', enum: ['DRAFT', 'COMPLETED', 'APPROVED'] })
  @IsOptional()
  @IsEnum(['DRAFT', 'COMPLETED', 'APPROVED'])
  status?: string;

  @ApiPropertyOptional({ description: 'Fecha desde (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  date_from?: string;

  @ApiPropertyOptional({ description: 'Fecha hasta (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  date_to?: string;

  @ApiPropertyOptional({ description: 'Pagina', default: '1' })
  @IsOptional()
  @IsNumberString()
  page?: string;

  @ApiPropertyOptional({ description: 'Registros por pagina', default: '20' })
  @IsOptional()
  @IsNumberString()
  limit?: string;

  @ApiPropertyOptional({ description: 'Ordenar por campo', default: 'evaluation_date' })
  @IsOptional()
  @IsString()
  sort_by?: string;

  @ApiPropertyOptional({ description: 'Orden', enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sort_order?: string;
}
