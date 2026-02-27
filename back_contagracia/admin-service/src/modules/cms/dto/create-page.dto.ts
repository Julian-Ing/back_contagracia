import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsObject,
  IsIn,
} from 'class-validator';

export class CreatePageDto {
  @ApiProperty({ description: 'Título de la página', example: 'Nosotros' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Slug único de la página', example: 'nosotros' })
  @IsString()
  slug: string;

  @ApiPropertyOptional({ description: 'Descripción de la página' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Tipo de página',
    enum: ['landing', 'static', 'blog_list', 'legal', 'custom'],
    default: 'static',
  })
  @IsString()
  @IsIn(['landing', 'static', 'blog_list', 'legal', 'custom'])
  @IsOptional()
  page_type?: string;

  @ApiPropertyOptional({ description: 'Layout de la página' })
  @IsString()
  @IsOptional()
  layout?: string;

  @ApiPropertyOptional({ description: 'Mostrar en header', default: false })
  @IsBoolean()
  @IsOptional()
  show_in_header?: boolean;

  @ApiPropertyOptional({ description: 'Mostrar en footer', default: false })
  @IsBoolean()
  @IsOptional()
  show_in_footer?: boolean;

  @ApiPropertyOptional({ description: 'Orden en header' })
  @IsInt()
  @IsOptional()
  header_order?: number;

  @ApiPropertyOptional({ description: 'Orden en footer' })
  @IsInt()
  @IsOptional()
  footer_order?: number;

  @ApiPropertyOptional({ description: 'Label en header' })
  @IsString()
  @IsOptional()
  header_label?: string;

  @ApiPropertyOptional({ description: 'Label en footer' })
  @IsString()
  @IsOptional()
  footer_label?: string;

  @ApiPropertyOptional({ description: 'Meta title para SEO' })
  @IsString()
  @IsOptional()
  meta_title?: string;

  @ApiPropertyOptional({ description: 'Meta description para SEO' })
  @IsString()
  @IsOptional()
  meta_description?: string;

  @ApiPropertyOptional({ description: 'OG title' })
  @IsString()
  @IsOptional()
  og_title?: string;

  @ApiPropertyOptional({ description: 'OG description' })
  @IsString()
  @IsOptional()
  og_description?: string;

  @ApiPropertyOptional({ description: 'OG image URL' })
  @IsString()
  @IsOptional()
  og_image?: string;

  @ApiPropertyOptional({ description: 'Configuraciones adicionales (JSON)' })
  @IsObject()
  @IsOptional()
  settings?: Record<string, any>;
}
