import { IsString, IsOptional, IsNotEmpty } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateAttributeDto {
  @ApiPropertyOptional({ example: 'Color' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre no puede estar vacío' })
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'Color del producto' })
  @IsString()
  @IsOptional()
  description?: string;
}
