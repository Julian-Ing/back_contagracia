import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateUnitDto {
  @ApiPropertyOptional({ description: 'ID del condominio al que pertenece la unidad' })
  @IsString()
  @IsOptional()
  condominium_id?: string;

  @ApiPropertyOptional({ description: 'ID de la torre' })
  @IsString()
  @IsOptional()
  tower_id?: string;

  @ApiPropertyOptional({ description: 'ID del tipo de unidad' })
  @IsString()
  @IsOptional()
  unit_type_id?: string;

  @ApiPropertyOptional({ description: 'Numero de la unidad' })
  @IsString()
  @IsOptional()
  unit_number?: string;

  @ApiPropertyOptional({ description: 'Piso de la unidad' })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  floor?: number;

  @ApiPropertyOptional({ description: 'Area en metros cuadrados' })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  area_m2?: number;

  @ApiPropertyOptional({ description: 'Coeficiente de copropiedad' })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  coefficient?: number;

  @ApiPropertyOptional({ description: 'ID de la unidad padre (para sub-unidades)' })
  @IsString()
  @IsOptional()
  parent_unit_id?: string;

  @ApiPropertyOptional({ description: 'Notas adicionales' })
  @IsString()
  @IsOptional()
  notes?: string;
}
