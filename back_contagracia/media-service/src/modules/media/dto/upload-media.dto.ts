import { IsString, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { getValidCategories } from '../category-config';

export class UploadMediaDto {
  @ApiProperty({
    description: 'Categoría del archivo',
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
    example: 'company_logo',
  })
  @IsString()
  @IsIn(getValidCategories(), {
    message: `category debe ser una de: ${getValidCategories().join(', ')}`,
  })
  category: string;

  @ApiPropertyOptional({
    description:
      'Visibilidad del archivo. Si no se envía, se usa la visibilidad por defecto de la categoría.',
    enum: ['public', 'company', 'private'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['public', 'company', 'private'])
  visibility?: string;
}
