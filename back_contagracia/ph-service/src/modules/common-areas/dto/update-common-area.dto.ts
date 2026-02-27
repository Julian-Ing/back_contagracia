import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  Min,
} from 'class-validator';

export class UpdateCommonAreaDto {
  @ApiProperty({ description: 'Nombre del area comun', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: 'Descripcion del area comun', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Capacidad maxima de personas', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  capacity?: number;

  @ApiProperty({ description: 'Tarifa de alquiler', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  rental_fee?: number;

  @ApiProperty({ description: 'Requiere deposito', required: false })
  @IsOptional()
  @IsBoolean()
  requires_deposit?: boolean;

  @ApiProperty({ description: 'Monto del deposito', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  deposit_amount?: number;

  @ApiProperty({ description: 'Requiere aprobacion para reservar', required: false })
  @IsOptional()
  @IsBoolean()
  requires_approval?: boolean;

  @ApiProperty({ description: 'Horas minimas de reserva', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  min_hours?: number;

  @ApiProperty({ description: 'Horas maximas de reserva', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  max_hours?: number;

  @ApiProperty({ description: 'Hora de apertura (ej: "08:00")', required: false })
  @IsOptional()
  @IsString()
  available_from?: string;

  @ApiProperty({ description: 'Hora de cierre (ej: "22:00")', required: false })
  @IsOptional()
  @IsString()
  available_to?: string;

  @ApiProperty({
    description: 'Dias disponibles (0=Domingo, 1=Lunes, ... 6=Sabado)',
    required: false,
    type: [Number],
    example: [1, 2, 3, 4, 5],
  })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  available_days?: number[];

  @ApiProperty({ description: 'Estado activo/inactivo', required: false })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
