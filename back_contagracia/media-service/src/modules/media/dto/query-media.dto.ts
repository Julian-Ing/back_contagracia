import { IsOptional, IsString, IsIn, IsInt, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { getValidCategories } from '../category-config';

export class QueryMediaDto {
  @ApiPropertyOptional({
    description: 'Filtrar por categoría',
    enum: [
      'company_logo',
      'company_signature',
      'employee_document',
      'cms_image',
      'blog_image',
      'site_asset',
      'certificate',
      'general',
    ],
  })
  @IsOptional()
  @IsString()
  @IsIn(getValidCategories())
  category?: string;

  @ApiPropertyOptional({ description: 'Filtrar por visibilidad' })
  @IsOptional()
  @IsString()
  @IsIn(['public', 'company', 'private'])
  visibility?: string;

  @ApiPropertyOptional({ description: 'Página', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Cantidad por página',
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
