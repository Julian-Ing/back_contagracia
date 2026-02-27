import { IsString, IsNotEmpty, IsNumber, IsArray, ArrayMinSize, ValidateNested, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CombinationItemDto {
  @ApiProperty({ example: 'Camisa Polo Roja M' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre de la combinación es requerido' })
  name: string;

  @ApiProperty({ example: 'CAM-POLO-ROJA-M' })
  @IsString()
  @IsNotEmpty({ message: 'El código de barras es requerido' })
  barcode: string;

  @ApiProperty({ example: 50000 })
  @IsNumber()
  @Type(() => Number)
  price: number;

  @ApiProperty({ example: 30000 })
  @IsNumber()
  @Type(() => Number)
  cost: number;

  @ApiProperty({ example: ['uuid-option-rojo', 'uuid-option-m'], description: 'IDs de opciones de atributo' })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  attribute_option_ids: string[];

  @ApiPropertyOptional({ example: '/api/media/uuid' })
  @IsString()
  @IsOptional()
  image_path?: string | null;

  // Campos opcionales — si no se envían, se heredan del padre
  @ApiPropertyOptional({ example: 'Camisa polo color rojo talla M' })
  @IsString()
  @IsOptional()
  description?: string;

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

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  tax_included?: boolean;

  @ApiPropertyOptional({ enum: ['LAST_PURCHASE', 'AVERAGE'], example: 'LAST_PURCHASE' })
  @IsString()
  @IsOptional()
  costing_type?: string;

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

export class CreateCombinationsDto {
  @ApiProperty({ type: [CombinationItemDto], minItems: 1 })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CombinationItemDto)
  combinations: CombinationItemDto[];
}
