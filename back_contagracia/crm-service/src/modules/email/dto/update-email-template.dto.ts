import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject } from 'class-validator';

export class UpdateEmailTemplateDto {
  @ApiPropertyOptional({ description: 'Nombre de la plantilla' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Asunto del correo' })
  @IsString()
  @IsOptional()
  subject?: string;

  @ApiPropertyOptional({ description: 'Cuerpo HTML del correo' })
  @IsString()
  @IsOptional()
  body_html?: string;

  @ApiPropertyOptional({ description: 'Variables de la plantilla' })
  @IsObject()
  @IsOptional()
  variables?: any;
}
