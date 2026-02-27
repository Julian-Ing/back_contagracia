import { IsArray, IsString, IsOptional, IsNotEmpty, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class BulkAttributeWithOptionsItem {
  @ApiProperty({ example: 'Color' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre es requerido' })
  name: string;

  @ApiPropertyOptional({ example: 'Color del producto' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ type: [String], example: ['Rojo', 'Azul'] })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true, message: 'El nombre de cada opción es requerido' })
  options: string[];
}

export class BulkCreateWithOptionsDto {
  @ApiProperty({ type: [BulkAttributeWithOptionsItem] })
  @IsArray()
  @ArrayMinSize(1, { message: 'Debe enviar al menos un atributo' })
  @ValidateNested({ each: true })
  @Type(() => BulkAttributeWithOptionsItem)
  attributes: BulkAttributeWithOptionsItem[];
}
