import { IsString, IsOptional, IsNotEmpty } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCategoryDto {
  @ApiPropertyOptional({ example: 'Materiales de Construcción' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre no puede estar vacío' })
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'Materiales usados en obras' })
  @IsString()
  @IsOptional()
  description?: string;
}
