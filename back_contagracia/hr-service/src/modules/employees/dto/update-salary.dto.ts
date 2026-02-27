import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsBoolean,
  IsString,
  IsDateString,
  IsEnum,
  Min,
} from 'class-validator';

export enum SalaryType {
  ORDINARIO = 'ORDINARIO',
  INTEGRAL = 'INTEGRAL',
}

export class UpdateSalaryDto {
  @ApiProperty({ description: 'Salario mensual total', minimum: 0 })
  @IsNumber()
  @Min(0)
  salary: number;

  @ApiPropertyOptional({ description: 'Tipo de salario', enum: SalaryType, default: SalaryType.ORDINARIO })
  @IsOptional()
  @IsEnum(SalaryType)
  salary_type?: SalaryType;

  @ApiPropertyOptional({ description: 'Monto del auxilio de transporte (ej: 200000). null/0 = no aplica' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  transportation_allowance?: number;

  @ApiPropertyOptional({ description: 'Si tiene componente de salario variable (comisiones)', default: false })
  @IsOptional()
  @IsBoolean()
  variable_salary?: boolean;

  @ApiPropertyOptional({ description: 'Fecha efectiva del cambio (YYYY-MM-DD), default = hoy' })
  @IsOptional()
  @IsDateString()
  effective_date?: string;

  @ApiPropertyOptional({ description: 'Motivo del cambio de salario' })
  @IsOptional()
  @IsString()
  reason?: string;
}
