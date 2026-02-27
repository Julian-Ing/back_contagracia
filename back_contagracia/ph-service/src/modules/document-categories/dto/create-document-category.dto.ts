import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsInt, MaxLength } from 'class-validator';

export class CreateDocumentCategoryDto {
  @ApiProperty({ description: 'Nombre de la categoría', example: 'Reglamento' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ description: 'Descripción de la categoría' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Color hex para badge en UI', example: '#3B82F6' })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiPropertyOptional({ description: 'Nombre del ícono (lucide)', example: 'FileText' })
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiPropertyOptional({ description: 'Orden de visualización', default: 0 })
  @IsInt()
  @IsOptional()
  sort_order?: number;
}
