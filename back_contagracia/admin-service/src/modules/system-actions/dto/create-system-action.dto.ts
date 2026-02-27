import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  Matches,
  IsUUID,
} from 'class-validator';

export class CreateSystemActionDto {
  @ApiProperty({
    description: 'Clave única de la acción (formato: module.action)',
    example: 'invoices.create',
  })
  @IsString()
  @Matches(/^[a-z_]+\.[a-z_]+$/, {
    message: 'action_key debe tener formato module.action (ej: invoices.create)',
  })
  action_key: string;

  @ApiProperty({
    description: 'ID del módulo al que pertenece',
    example: 'uuid-del-modulo',
  })
  @IsUUID()
  module_id: string;

  @ApiProperty({
    description: 'Nombre legible de la acción',
    example: 'Crear Factura',
  })
  @IsString()
  action_name: string;

  @ApiPropertyOptional({
    description: 'Descripción de la acción',
    example: 'Permite crear facturas de venta',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Si la acción está activa',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
