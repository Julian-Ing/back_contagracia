import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, MaxLength } from 'class-validator';

export class CreateDocumentDto {
  @ApiProperty({ description: 'ID de la copropiedad' })
  @IsString()
  condominium_id: string;

  @ApiProperty({ example: 'Reglamento de Propiedad Horizontal 2026' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'ID de la categoría de documento' })
  @IsString()
  @IsOptional()
  category_id?: string;

  @ApiPropertyOptional({ description: 'URL del media-service (/api/media/{id})' })
  @IsString()
  @IsOptional()
  file_url?: string;

  @ApiPropertyOptional({ description: 'Nombre original del archivo' })
  @IsString()
  @IsOptional()
  file_name?: string;

  @ApiPropertyOptional({ description: 'Tamano del archivo en bytes' })
  @IsInt()
  @IsOptional()
  file_size?: number;

  @ApiPropertyOptional({ description: 'Tipo MIME del archivo' })
  @IsString()
  @IsOptional()
  mime_type?: string;

  @ApiPropertyOptional({ description: 'URL externa (Google Drive, OneDrive, etc.)' })
  @IsString()
  @IsOptional()
  external_url?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}
