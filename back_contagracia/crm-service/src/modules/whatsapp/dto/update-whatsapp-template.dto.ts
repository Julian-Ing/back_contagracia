import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject } from 'class-validator';

export class UpdateWhatsappTemplateDto {
  @ApiPropertyOptional({ description: 'Nombre de la plantilla' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'SID de la plantilla' })
  @IsString()
  @IsOptional()
  template_sid?: string;

  @ApiPropertyOptional({ description: 'Idioma' })
  @IsString()
  @IsOptional()
  language?: string;

  @ApiPropertyOptional({ description: 'Cuerpo de la plantilla' })
  @IsString()
  @IsOptional()
  body_template?: string;

  @ApiPropertyOptional({ description: 'Variables' })
  @IsObject()
  @IsOptional()
  variables?: any;

  @ApiPropertyOptional({ description: 'Estado' })
  @IsString()
  @IsOptional()
  status?: string;
}
