import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsIn,
} from 'class-validator';

export class UpdateUnitTypeDto {
  @ApiPropertyOptional({ description: 'Nombre del tipo de unidad' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Código del tipo de unidad' })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiPropertyOptional({ description: 'Descripción del tipo de unidad' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Si el tipo de unidad es arrendable' })
  @IsBoolean()
  @IsOptional()
  is_rentable?: boolean;

  @ApiPropertyOptional({ description: 'Si el tipo de unidad es parqueadero' })
  @IsBoolean()
  @IsOptional()
  is_parking?: boolean;

  @ApiPropertyOptional({ description: 'Minutos libres incluidos' })
  @IsNumber()
  @IsOptional()
  free_minutes?: number;

  @ApiPropertyOptional({ description: 'Tarifa de arriendo' })
  @IsNumber()
  @IsOptional()
  rental_fee?: number;

  @ApiPropertyOptional({
    description: 'Tipo de tarifa de arriendo',
    enum: ['fixed', 'per_hour', 'per_day'],
  })
  @IsString()
  @IsIn(['fixed', 'per_hour', 'per_day'])
  @IsOptional()
  rental_fee_type?: string;

  @ApiPropertyOptional({ description: 'ID del concepto de cobro asociado' })
  @IsString()
  @IsOptional()
  fee_concept_id?: string;
}
