import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class CreateFeeDto {
  @ApiProperty({ description: 'ID del periodo de facturacion' })
  @IsString()
  @IsNotEmpty()
  billing_period_id: string;

  @ApiProperty({ description: 'ID de la unidad' })
  @IsString()
  @IsNotEmpty()
  unit_id: string;

  @ApiProperty({ description: 'ID del concepto de cobro' })
  @IsString()
  @IsNotEmpty()
  fee_concept_id: string;

  @ApiPropertyOptional({ description: 'ID del residente' })
  @IsString()
  @IsOptional()
  resident_id?: string;

  @ApiProperty({ description: 'Monto del cobro', example: 150000 })
  @IsNumber()
  amount: number;

  @ApiPropertyOptional({ description: 'Fecha limite de pago' })
  @IsString()
  @IsOptional()
  due_date?: string;

  @ApiPropertyOptional({ description: 'Tipo de cobro', default: 'regular' })
  @IsString()
  @IsOptional()
  fee_type?: string;

  @ApiPropertyOptional({ description: 'Notas adicionales' })
  @IsString()
  @IsOptional()
  notes?: string;
}
