import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsIn,
} from 'class-validator';

export class CreateFeeConceptDto {
  @ApiProperty({ description: 'Nombre del concepto de cobro' })
  @IsString()
  @IsNotEmpty()
  name: string;

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

  @ApiPropertyOptional({ description: 'Si el concepto es recurrente', default: false })
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
