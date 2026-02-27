import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEmail, IsInt, Min, Max } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({ description: 'Nombre del autor', example: 'Juan Pérez' })
  @IsString()
  author_name: string;

  @ApiProperty({
    description: 'Email del autor',
    example: 'juan@example.com',
  })
  @IsEmail()
  author_email: string;

  @ApiProperty({ description: 'Contenido del comentario' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ description: 'ID del comentario padre (para replies)' })
  @IsString()
  @IsOptional()
  parent_id?: string;

  @ApiPropertyOptional({
    description: 'Rating 1-5 (solo comentarios raíz)',
    minimum: 1,
    maximum: 5,
  })
  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  rating?: number;
}
