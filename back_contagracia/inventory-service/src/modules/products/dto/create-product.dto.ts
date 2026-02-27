import { IsString, IsOptional, IsNotEmpty, IsBoolean, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @ApiProperty({ example: 'Camisa Polo' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre es requerido' })
  name: string;

  @ApiPropertyOptional({ example: 'Camisa de algodón' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'CAM-POLO-001' })
  @IsString()
  @IsNotEmpty({ message: 'El código de barras es requerido' })
  barcode: string;

  @ApiProperty({ example: 'uuid-category' })
  @IsString()
  @IsNotEmpty({ message: 'La categoría es requerida' })
  category_id: string;

  @ApiPropertyOptional({ example: '70' })
  @IsString()
  @IsOptional()
  unit_id?: string;

  @ApiProperty({ example: 'uuid-tax' })
  @IsString()
  @IsNotEmpty({ message: 'El impuesto es requerido' })
  tax_id: string;

  @ApiProperty({ example: 50000 })
  @IsNumber()
  @Type(() => Number)
  price: number;

  @ApiProperty({ example: 30000 })
  @IsNumber()
  @Type(() => Number)
  cost: number;

  @ApiProperty({ example: false })
  @IsBoolean()
  tax_included: boolean;

  @ApiProperty({ enum: ['LAST_PURCHASE', 'AVERAGE'], example: 'LAST_PURCHASE' })
  @IsString()
  @IsNotEmpty({ message: 'El tipo de costeo es requerido' })
  costing_type: string;

  @ApiProperty({ example: false })
  @IsBoolean()
  is_service: boolean;

  @ApiPropertyOptional({ example: '/api/media/uuid' })
  @IsString()
  @IsOptional()
  image_path?: string | null;

  // Cuentas contables — requeridas si la empresa tiene módulo contabilidad (se valida en service)
  @ApiPropertyOptional({ example: '143505' })
  @IsString()
  @IsOptional()
  asset_account_code?: string;

  @ApiPropertyOptional({ example: '613505' })
  @IsString()
  @IsOptional()
  cogs_account_code?: string;

  @ApiPropertyOptional({ example: '413505' })
  @IsString()
  @IsOptional()
  revenue_account_code?: string;
}
