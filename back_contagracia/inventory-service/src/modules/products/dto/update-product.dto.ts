import { IsString, IsOptional, IsBoolean, IsNumber, IsArray, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UpdateProductDto {
  @ApiPropertyOptional({ example: 'Camisa Polo Actualizada' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'Camisa de algodón actualizada' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'CAM-POLO-002' })
  @IsString()
  @IsOptional()
  barcode?: string;

  @ApiPropertyOptional({ example: 'uuid-category' })
  @IsString()
  @IsOptional()
  category_id?: string;

  @ApiPropertyOptional({ example: 'uuid-unit' })
  @IsString()
  @IsOptional()
  unit_id?: string;

  @ApiPropertyOptional({ example: 'uuid-tax' })
  @IsString()
  @IsOptional()
  tax_id?: string;

  @ApiPropertyOptional({ example: 55000 })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  price?: number;

  @ApiPropertyOptional({ example: 32000 })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  cost?: number;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  tax_included?: boolean;

  @ApiPropertyOptional({ enum: ['LAST_PURCHASE', 'AVERAGE'] })
  @IsString()
  @IsOptional()
  costing_type?: string;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  is_service?: boolean;

  @ApiPropertyOptional({ example: '/api/media/uuid' })
  @IsString()
  @IsOptional()
  image_path?: string | null;

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

  @ApiPropertyOptional({ description: 'IDs de opciones de atributo (solo combinaciones)', type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  attribute_option_ids?: string[];
}
