import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';

export class CreateWhatsappTemplateDto {
  @ApiProperty({ description: 'Nombre de la plantilla' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'SID de la plantilla en el proveedor' })
  @IsString()
  @IsNotEmpty()
  template_sid: string;

  @ApiProperty({ description: 'Idioma de la plantilla' })
  @IsString()
  @IsNotEmpty()
  language: string;

  @ApiProperty({ description: 'Cuerpo de la plantilla' })
  @IsString()
  @IsNotEmpty()
  body_template: string;

  @ApiPropertyOptional({ description: 'Variables de la plantilla' })
  @IsObject()
  @IsOptional()
  variables?: any;

  @ApiPropertyOptional({ description: 'Estado de la plantilla' })
  @IsString()
  @IsOptional()
  status?: string;
}
