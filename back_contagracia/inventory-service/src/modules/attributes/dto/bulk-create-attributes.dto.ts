import { IsArray, IsString, IsOptional, IsNotEmpty, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class BulkAttributeItem {
  @ApiProperty({ example: 'Color' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre es requerido' })
  name: string;

  @ApiPropertyOptional({ example: 'Color del producto' })
  @IsString()
  @IsOptional()
  description?: string;
}

export class BulkCreateAttributesDto {
  @ApiProperty({ type: [BulkAttributeItem] })
  @IsArray()
  @ArrayMinSize(1, { message: 'Debe enviar al menos un atributo' })
  @ValidateNested({ each: true })
  @Type(() => BulkAttributeItem)
  attributes: BulkAttributeItem[];
}
