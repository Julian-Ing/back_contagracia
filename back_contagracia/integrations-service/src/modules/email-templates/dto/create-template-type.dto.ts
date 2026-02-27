import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateTemplateTypeDto {
  @ApiProperty({ description: 'Nombre del tipo de plantilla' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Clave del módulo asociado (ph, crm, etc.)' })
  @IsString()
  @IsOptional()
  module_key?: string;

  @ApiPropertyOptional({ description: 'Descripción del tipo' })
  @IsString()
  @IsOptional()
  description?: string;
}
