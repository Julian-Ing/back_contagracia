import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsIn,
} from 'class-validator';

export class UpdateFeeConceptDto {
  @ApiPropertyOptional({ description: 'Nombre del concepto de cobro' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Código del concepto de cobro' })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiPropertyOptional({ description: 'Descripción del concepto de cobro' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Monto por defecto' })
  @IsNumber()
  @IsOptional()
  default_amount?: number;

  @ApiPropertyOptional({ description: 'Si el concepto es recurrente' })
  @IsBoolean()
  @IsOptional()
  is_recurring?: boolean;

  @ApiPropertyOptional({
    description: 'Tipo de cálculo',
    enum: ['fixed', 'per_m2', 'coefficient'],
  })
  @IsString()
  @IsIn(['fixed', 'per_m2', 'coefficient'])
  @IsOptional()
  calculation_type?: string;
}
