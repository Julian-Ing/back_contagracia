import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsDateString, IsNumberString, IsString, IsEnum } from 'class-validator';

export class QueryObservationsDto {
  @ApiPropertyOptional({ description: 'Filtrar por tercero (empleado)' })
  @IsOptional()
  @IsUUID()
  third_party_id?: string;

  @ApiPropertyOptional({ description: 'Buscar por nombre o documento del empleado' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Tipo de observacion', enum: ['RECOGNITION', 'FEEDBACK', 'INCIDENT', 'WARNING', 'ACHIEVEMENT', 'CONCERN'] })
  @IsOptional()
  @IsEnum(['RECOGNITION', 'FEEDBACK', 'INCIDENT', 'WARNING', 'ACHIEVEMENT', 'CONCERN'])
  observation_type?: string;

  @ApiPropertyOptional({ description: 'Severidad', enum: ['LOW', 'MEDIUM', 'HIGH'] })
  @IsOptional()
  @IsEnum(['LOW', 'MEDIUM', 'HIGH'])
  severity?: string;

  @ApiPropertyOptional({ description: 'Estado', enum: ['ACTIVE', 'RESOLVED', 'ARCHIVED'] })
  @IsOptional()
  @IsEnum(['ACTIVE', 'RESOLVED', 'ARCHIVED'])
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

  @ApiPropertyOptional({ description: 'Ordenar por campo', default: 'observation_date' })
  @IsOptional()
  @IsString()
  sort_by?: string;

  @ApiPropertyOptional({ description: 'Orden', enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sort_order?: string;
}
