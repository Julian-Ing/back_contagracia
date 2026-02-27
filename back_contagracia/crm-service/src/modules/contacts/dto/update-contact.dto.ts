import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsDateString } from 'class-validator';

export class UpdateContactDto {
  @ApiPropertyOptional({ description: 'Nombre completo del contacto' })
  @IsString()
  @IsOptional()
  full_name?: string;

  @ApiPropertyOptional({ description: 'Email del contacto' })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: 'Teléfono del contacto' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ description: 'Nombre de la empresa' })
  @IsString()
  @IsOptional()
  company_name?: string;

  @ApiPropertyOptional({ description: 'Número de WhatsApp' })
  @IsString()
  @IsOptional()
  whatsapp_number?: string;

  @ApiPropertyOptional({ description: 'Notas sobre el contacto' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: 'Fecha de nacimiento' })
  @IsDateString()
  @IsOptional()
  birth_date?: string;

  @ApiPropertyOptional({ description: 'Segmento del contacto' })
  @IsString()
  @IsOptional()
  segment?: string;
}
