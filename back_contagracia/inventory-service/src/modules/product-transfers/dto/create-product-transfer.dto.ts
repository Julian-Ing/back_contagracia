import { IsString, IsOptional, IsArray, ValidateNested, IsEnum, IsNumber, Min, ArrayMinSize, IsNotEmpty, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export enum ItemDirection {
  IN = 'IN',
  OUT = 'OUT',
}

export class ProductTransferItemDto {
  @IsString()
  product_id: string;

  @IsEnum(ItemDirection)
  direction: ItemDirection;

  @IsNumber()
  @Min(0.0001)
  quantity: number;

  @IsOptional()
  @IsString()
  storage_id?: string;
}

export class CreateProductTransferDto {
  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsDateString({}, { message: 'La fecha debe tener formato válido (yyyy-MM-dd)' })
  @IsOptional()
  date?: string;

  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => ProductTransferItemDto)
  items: ProductTransferItemDto[];
}
