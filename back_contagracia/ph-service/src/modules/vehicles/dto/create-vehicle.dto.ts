import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsIn,
  Min,
} from 'class-validator';

export class CreateVehicleDto {
  @ApiProperty({ description: 'ID de la unidad' })
  @IsString()
  @IsNotEmpty()
  unit_id: string;

  @ApiPropertyOptional({ description: 'ID del residente propietario del vehículo' })
  @IsString()
  @IsOptional()
  resident_id?: string;

  @ApiProperty({
    description: 'Tipo de vehículo',
    enum: ['car', 'motorcycle', 'bicycle', 'other'],
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['car', 'motorcycle', 'bicycle', 'other'])
  vehicle_type: string;

  @ApiPropertyOptional({ description: 'Marca del vehículo' })
  @IsString()
  @IsOptional()
  brand?: string;

  @ApiPropertyOptional({ description: 'Modelo del vehículo' })
  @IsString()
  @IsOptional()
  model?: string;

  @ApiPropertyOptional({ description: 'Año del vehículo' })
  @IsInt()
  @Min(1900)
  @IsOptional()
  year?: number;

  @ApiPropertyOptional({ description: 'Color del vehículo' })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiPropertyOptional({ description: 'Placa del vehículo' })
  @IsString()
  @IsOptional()
  plate?: string;

  @ApiPropertyOptional({ description: 'Número de sticker asignado' })
  @IsString()
  @IsOptional()
  sticker_number?: string;

  @ApiPropertyOptional({ description: 'Espacio de parqueadero asignado' })
  @IsString()
  @IsOptional()
  parking_space?: string;

  @ApiPropertyOptional({ description: 'Notas adicionales' })
  @IsString()
  @IsOptional()
  notes?: string;
}
