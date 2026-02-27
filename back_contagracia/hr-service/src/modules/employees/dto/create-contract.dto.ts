import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsDateString, IsInt, IsBoolean, IsNumber, Min } from 'class-validator';

export class CreateContractDto {
  @ApiPropertyOptional({ description: 'ID del tipo de contrato' })
  @IsOptional()
  @IsString()
  contract_type_id?: string;

  @ApiPropertyOptional({ description: 'ID del tipo de trabajador' })
  @IsOptional()
  @IsString()
  worker_type_id?: string;

  @ApiPropertyOptional({ description: 'ID del subtipo de trabajador' })
  @IsOptional()
  @IsString()
  worker_subtype_id?: string;

  @ApiPropertyOptional({ description: 'Cargo/función del empleado' })
  @IsOptional()
  @IsString()
  position?: string;

  @ApiPropertyOptional({ description: 'Días de periodo de prueba (0 = sin prueba)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  probation_days?: number;

  @ApiPropertyOptional({ description: 'Si el contrato estipula pago de auxilio de transporte', default: true })
  @IsOptional()
  @IsBoolean()
  includes_transport?: boolean;

  @ApiProperty({ description: 'Fecha de inicio del contrato (YYYY-MM-DD)' })
  @IsDateString()
  start_date: string;

  @ApiPropertyOptional({ description: 'Fecha fin del contrato (YYYY-MM-DD), null = indefinido' })
  @IsOptional()
  @IsDateString()
  end_date?: string;

  @ApiPropertyOptional({ description: 'Observaciones del contrato' })
  @IsOptional()
  @IsString()
  observations?: string;

  // ========== Salario inicial del nuevo contrato (opcional) ==========

  @ApiPropertyOptional({ description: 'Salario mensual del nuevo contrato. Si se omite, se mantiene el salario actual.' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  salary?: number;

  @ApiPropertyOptional({ description: 'Tipo de salario', enum: ['ORDINARIO', 'INTEGRAL'] })
  @IsOptional()
  @IsString()
  salary_type?: string;

  @ApiPropertyOptional({ description: 'Monto del auxilio de transporte' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  transportation_allowance?: number;

  @ApiPropertyOptional({ description: 'Si tiene salario variable (comisiones)', default: false })
  @IsOptional()
  @IsBoolean()
  variable_salary?: boolean;
}

export class RenewContractDto {
  @ApiProperty({ description: 'Nueva fecha de inicio (YYYY-MM-DD)' })
  @IsDateString()
  start_date: string;

  @ApiPropertyOptional({ description: 'Nueva fecha fin (YYYY-MM-DD), null = indefinido' })
  @IsOptional()
  @IsDateString()
  end_date?: string;

  @ApiPropertyOptional({ description: 'Observaciones de la renovación' })
  @IsOptional()
  @IsString()
  observations?: string;
}
