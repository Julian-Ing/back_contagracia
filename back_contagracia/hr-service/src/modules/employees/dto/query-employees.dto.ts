import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsBoolean, IsNumber, IsEnum } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { EmployeeStatus } from './update-employee.dto';

export class QueryEmployeesDto {
  @ApiPropertyOptional({ description: 'Buscar por nombre o identificación' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filtrar por estado', enum: EmployeeStatus })
  @IsOptional()
  @IsEnum(EmployeeStatus)
  status?: EmployeeStatus;

  @ApiPropertyOptional({ description: 'Filtrar por activos/inactivos' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({ description: 'Filtrar por administrativos', default: undefined })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  is_administrative?: boolean;

  @ApiPropertyOptional({ description: 'Filtrar por tipo de contrato' })
  @IsOptional()
  @IsString()
  contract_type_id?: string;

  @ApiPropertyOptional({ description: 'Filtrar por tipo de trabajador' })
  @IsOptional()
  @IsString()
  worker_type_id?: string;

  @ApiPropertyOptional({ description: 'Filtrar por EPS' })
  @IsOptional()
  @IsString()
  eps_id?: string;

  @ApiPropertyOptional({ description: 'Filtrar por Fondo de Pensiones' })
  @IsOptional()
  @IsString()
  pension_fund_id?: string;

  @ApiPropertyOptional({ description: 'Filtrar por centro de costo' })
  @IsOptional()
  @IsString()
  cost_center_id?: string;

  @ApiPropertyOptional({ description: 'Página', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @ApiPropertyOptional({ description: 'Límite por página', default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;

  @ApiPropertyOptional({ description: 'Ordenar por campo', default: 'name' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ description: 'Orden ascendente/descendente', default: 'asc' })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';
}
