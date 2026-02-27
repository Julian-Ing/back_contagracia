import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class UpdateTemplateTypeDto {
  @ApiPropertyOptional({ description: 'Nombre del tipo de plantilla' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Clave del módulo asociado (ph, crm, etc.)' })
  @IsString()
  @IsOptional()
  module_key?: string;

  @ApiPropertyOptional({ description: 'Descripción del tipo' })
  @IsString()
  @IsOptional()
  description?: string;
}
