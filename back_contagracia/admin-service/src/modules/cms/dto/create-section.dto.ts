import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsObject,
  IsIn,
} from 'class-validator';

export class CreateSectionDto {
  @ApiProperty({
    description: 'Clave única de la sección dentro de la página',
    example: 'hero',
  })
  @IsString()
  section_key: string;

  @ApiProperty({
    description: 'Tipo de sección',
    enum: [
      'hero',
      'feature_grid',
      'benefits',
      'pricing',
      'blog_section',
      'cta',
      'container',
      'flex-container',
    ],
    example: 'hero',
  })
  @IsString()
  @IsIn([
    'hero',
    'feature_grid',
    'benefits',
    'pricing',
    'blog_section',
    'cta',
    'container',
    'flex-container',
  ])
  section_type: string;

  @ApiPropertyOptional({ description: 'Título de la sección' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ description: 'Subtítulo de la sección' })
  @IsString()
  @IsOptional()
  subtitle?: string;

  @ApiPropertyOptional({
    description: 'Contenido dinámico (JSONB)',
    example: {},
  })
  @IsObject()
  @IsOptional()
  content?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Sección activa', default: true })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @ApiPropertyOptional({
    description: 'Orden de visualización',
    default: 0,
  })
  @IsInt()
  @IsOptional()
  display_order?: number;
}
