import { IsOptional, IsString, IsDateString, IsEnum, IsInt, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class QueryAssignmentsDto {
  @ApiPropertyOptional({ description: 'Filtrar por empleado' })
  @IsOptional()
  @IsString()
  third_party_id?: string;

  @ApiPropertyOptional({ description: 'Filtrar por plantilla de turno' })
  @IsOptional()
  @IsString()
  shift_template_id?: string;

  @ApiPropertyOptional({ description: 'Filtrar por programación' })
  @IsOptional()
  @IsString()
  schedule_id?: string;

  @ApiPropertyOptional({ description: 'Fecha inicio rango' })
  @IsOptional()
  @IsDateString()
  date_from?: string;

  @ApiPropertyOptional({ description: 'Fecha fin rango' })
  @IsOptional()
  @IsDateString()
  date_to?: string;

  @ApiPropertyOptional({ description: 'Estado', enum: ['ASSIGNED', 'CONFIRMED', 'SWAP_REQUESTED', 'SWAPPED', 'CANCELLED'] })
  @IsOptional()
  @IsEnum(['ASSIGNED', 'CONFIRMED', 'SWAP_REQUESTED', 'SWAPPED', 'CANCELLED'])
  status?: string;

  @ApiPropertyOptional({ description: 'Página', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Items por página', default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}

export class QuerySwapsDto {
  @ApiPropertyOptional({ description: 'Estado', enum: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'] })
  @IsOptional()
  @IsEnum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'])
  status?: string;

  @ApiPropertyOptional({ description: 'Filtrar por empleado solicitante' })
  @IsOptional()
  @IsString()
  requester_id?: string;

  @ApiPropertyOptional({ description: 'Página', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Items por página', default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
