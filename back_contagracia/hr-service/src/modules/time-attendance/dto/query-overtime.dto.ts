import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsDateString, IsEnum, IsNumberString } from 'class-validator';

enum OvertimeStatusFilter {
  REQUESTED = 'REQUESTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  AUTO_APPROVED = 'AUTO_APPROVED',
}

enum OvertimeTypeFilter {
  HED = 'HED',
  HEN = 'HEN',
  HEDDF = 'HEDDF',
  HENDF = 'HENDF',
  HRN = 'HRN',
  HRDDF = 'HRDDF',
  HRNDF = 'HRNDF',
}

export class QueryOvertimeDto {
  @ApiPropertyOptional({ description: 'Filtrar por empleado' })
  @IsOptional()
  @IsUUID()
  third_party_id?: string;

  @ApiPropertyOptional({ description: 'Fecha desde (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  date_from?: string;

  @ApiPropertyOptional({ description: 'Fecha hasta (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  date_to?: string;

  @ApiPropertyOptional({ description: 'Filtrar por estado', enum: OvertimeStatusFilter })
  @IsOptional()
  @IsEnum(OvertimeStatusFilter)
  status?: OvertimeStatusFilter;

  @ApiPropertyOptional({ description: 'Filtrar por tipo de hora extra', enum: OvertimeTypeFilter })
  @IsOptional()
  @IsEnum(OvertimeTypeFilter)
  overtime_type?: OvertimeTypeFilter;

  @ApiPropertyOptional({ description: 'Pagina', default: '1' })
  @IsOptional()
  @IsNumberString()
  page?: string;

  @ApiPropertyOptional({ description: 'Registros por pagina', default: '20' })
  @IsOptional()
  @IsNumberString()
  limit?: string;
}
