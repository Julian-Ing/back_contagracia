import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';

export class CreateEmailTemplateDto {
  @ApiProperty({ description: 'Nombre de la plantilla' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Asunto del correo' })
  @IsString()
  @IsNotEmpty()
  subject: string;

  @ApiProperty({ description: 'Cuerpo HTML del correo' })
  @IsString()
  @IsNotEmpty()
  body_html: string;

  @ApiPropertyOptional({ description: 'Variables de la plantilla' })
  @IsObject()
  @IsOptional()
  variables?: any;
}
