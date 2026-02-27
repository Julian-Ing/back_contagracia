import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsArray,
  IsIn,
  Min,
  IsDateString,
} from 'class-validator';

export class UpdateBillingConfigDto {
  @ApiPropertyOptional({ description: 'Nombre' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Descripcion' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Tipo de valor',
    enum: ['percentage', 'fixed_amount'],
  })
  @IsString()
  @IsIn(['percentage', 'fixed_amount'])
  @IsOptional()
  value_type?: string;

  @ApiPropertyOptional({ description: 'Valor' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  value?: number;

  @ApiPropertyOptional({
    description: 'Periodo de calculo',
    enum: ['daily', 'monthly', 'annual'],
  })
  @IsString()
  @IsIn(['daily', 'monthly', 'annual'])
  @IsOptional()
  calculation_period?: string;

  @ApiPropertyOptional({ description: 'Dias de gracia' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  grace_days?: number;

  @ApiPropertyOptional({ description: 'Es interes compuesto' })
  @IsBoolean()
  @IsOptional()
  is_compound?: boolean;

  @ApiPropertyOptional({ description: 'Porcentaje maximo' })
  @IsNumber()
  @IsOptional()
  max_percentage?: number;

  @ApiPropertyOptional({ description: 'Monto maximo' })
  @IsNumber()
  @IsOptional()
  max_amount?: number;

  @ApiPropertyOptional({ description: 'Fecha de inicio de vigencia' })
  @IsDateString()
  @IsOptional()
  effective_from?: string;

  @ApiPropertyOptional({ description: 'Fecha de fin de vigencia' })
  @IsDateString()
  @IsOptional()
  effective_to?: string;

  @ApiPropertyOptional({ description: 'Aplica a todos los conceptos' })
  @IsBoolean()
  @IsOptional()
  applies_to_all_concepts?: boolean;

  @ApiPropertyOptional({
    description: 'IDs de conceptos asociados (reemplaza los existentes)',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  fee_concept_ids?: string[];

  @ApiPropertyOptional({ description: 'Activo' })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
