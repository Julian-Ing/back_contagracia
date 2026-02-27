import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class UpdateBrandDto {
  @ApiPropertyOptional({ description: 'URL del logo desde media-service (/api/media/{id}), null para eliminar' })
  @IsOptional()
  @IsString()
  logo_url?: string | null;

  @ApiPropertyOptional({ description: 'URL de la firma desde media-service (/api/media/{id}), null para eliminar' })
  @IsOptional()
  @IsString()
  legal_rep_signature_url?: string | null;

  @ApiPropertyOptional({ description: 'URL de la firma del contador (/api/media/{id}), null para eliminar' })
  @IsOptional()
  @IsString()
  contador_signature_url?: string | null;

  @ApiPropertyOptional({ description: 'URL de la firma del revisor fiscal (/api/media/{id}), null para eliminar' })
  @IsOptional()
  @IsString()
  revisor_fiscal_signature_url?: string | null;
}
