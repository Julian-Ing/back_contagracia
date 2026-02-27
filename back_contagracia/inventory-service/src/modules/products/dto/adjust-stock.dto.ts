import { IsString, IsOptional, IsNotEmpty, IsNumber, IsIn, Min, IsDateString, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class AdjustStockDto {
  @ApiPropertyOptional({ example: 'uuid-storage' })
  @IsString()
  @IsOptional()
  storage_id?: string;

  @ApiProperty({ enum: ['IN', 'OUT'], example: 'IN' })
  @IsString()
  @IsIn(['IN', 'OUT'], { message: 'La dirección debe ser IN o OUT' })
  direction: 'IN' | 'OUT';

  @ApiProperty({ example: 10 })
  @IsNumber()
  @Type(() => Number)
  @Min(0.0001, { message: 'La cantidad debe ser mayor a 0' })
  quantity: number;

  @ApiProperty({ example: 'Ajuste por inventario físico' })
  @IsString()
  @IsNotEmpty({ message: 'El motivo es requerido' })
  reason: string;

  @ApiPropertyOptional({ example: '2026-02-23', description: 'Fecha del ajuste (default: hoy)' })
  @IsDateString({}, { message: 'La fecha debe tener formato válido (yyyy-MM-dd)' })
  @IsOptional()
  date?: string;

  @ApiPropertyOptional({ example: '529540', description: 'Cuenta contable contrapartida para el asiento' })
  @IsString()
  @IsOptional()
  counterpart_account_code?: string;

  @ApiPropertyOptional({ example: 'uuid-cost-center', description: 'Centro de costos' })
  @IsString()
  @IsOptional()
  cost_center_id?: string;

  @ApiPropertyOptional({ description: 'Ruta del centro de costos (path de IDs)' })
  @IsArray()
  @IsOptional()
  cost_center_path?: string[];
}
