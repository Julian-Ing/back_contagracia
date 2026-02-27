import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  IsDateString,
} from 'class-validator';

export class CreatePostDto {
  @ApiProperty({ description: 'Título del post', example: 'Mi primer post' })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Slug URL-friendly',
    example: 'mi-primer-post',
  })
  @IsString()
  slug: string;

  @ApiPropertyOptional({ description: 'Contenido HTML del post' })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiPropertyOptional({ description: 'Resumen/excerpt del post' })
  @IsString()
  @IsOptional()
  excerpt?: string;

  @ApiPropertyOptional({ description: 'URL de la imagen destacada' })
  @IsString()
  @IsOptional()
  featured_image?: string;

  @ApiPropertyOptional({
    description: 'Fecha de publicación (null = borrador)',
  })
  @IsDateString()
  @IsOptional()
  published_at?: string | null;

  @ApiPropertyOptional({
    description: 'IDs de tags a asignar',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tag_ids?: string[];
}
