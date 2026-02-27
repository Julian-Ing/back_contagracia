import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsArray,
  IsIn,
  Min,
  IsDateString,
} from 'class-validator';

export class CreateBillingConfigDto {
  @ApiProperty({ description: 'ID del condominio' })
  @IsString()
  @IsNotEmpty()
  condominium_id: string;

  @ApiProperty({
    description: 'Tipo de configuracion',
    enum: ['interest', 'discount', 'surcharge'],
  })
  @IsString()
  @IsIn(['interest', 'discount', 'surcharge'])
  config_type: string;

  @ApiProperty({ description: 'Nombre de la configuracion' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Descripcion' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Tipo de valor',
    enum: ['percentage', 'fixed_amount'],
  })
  @IsString()
  @IsIn(['percentage', 'fixed_amount'])
  value_type: string;

  @ApiProperty({ description: 'Valor', example: 1.5 })
  @IsNumber()
  @Min(0)
  value: number;

  @ApiPropertyOptional({
    description: 'Periodo de calculo (solo para interes)',
    enum: ['daily', 'monthly', 'annual'],
  })
  @IsString()
  @IsOptional()
  @IsIn(['daily', 'monthly', 'annual'])
  calculation_period?: string;

  @ApiPropertyOptional({ description: 'Dias de gracia', default: 0 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  grace_days?: number;

  @ApiPropertyOptional({
    description: 'Es interes compuesto',
    default: false,
  })
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

  @ApiProperty({ description: 'Fecha de inicio de vigencia' })
  @IsDateString()
  effective_from: string;

  @ApiPropertyOptional({
    description: 'Fecha de fin de vigencia (null = indefinida)',
  })
  @IsDateString()
  @IsOptional()
  effective_to?: string;

  @ApiPropertyOptional({
    description: 'Aplica a todos los conceptos',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  applies_to_all_concepts?: boolean;

  @ApiPropertyOptional({
    description: 'IDs de conceptos de cobro asociados',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  fee_concept_ids?: string[];

  @ApiPropertyOptional({ description: 'Activo', default: true })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
