import { IsString, IsOptional, IsNotEmpty, IsArray, ValidateNested, IsEnum, IsNumber, Min, ArrayMinSize, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export enum ItemDirection {
  IN = 'IN',
  OUT = 'OUT',
}

export class StorageTransferItemDto {
  @IsString()
  product_id: string;

  @IsString()
  storage_id: string;

  @IsEnum(ItemDirection)
  direction: ItemDirection;

  @IsNumber()
  @Min(0.0001)
  quantity: number;
}

export class CreateStorageTransferDto {
  @IsString()
  @IsNotEmpty({ message: 'La razón es requerida' })
  reason: string;

  @IsDateString({}, { message: 'La fecha debe tener formato válido (yyyy-MM-dd)' })
  @IsOptional()
  date?: string;

  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => StorageTransferItemDto)
  items: StorageTransferItemDto[];
}
