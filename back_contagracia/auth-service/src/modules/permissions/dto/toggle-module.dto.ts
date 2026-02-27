import { IsString, IsNotEmpty, IsUUID, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ToggleModuleDto {
  @ApiProperty({
    description: 'ID del usuario para el cual se habilitará/deshabilitará el módulo',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID('4', { message: 'user_id debe ser un UUID válido' })
  @IsNotEmpty({ message: 'El ID del usuario es requerido' })
  user_id: string;

  @ApiProperty({
    description: 'Clave del módulo a habilitar/deshabilitar',
    example: 'invoicing',
  })
  @IsString()
  @IsNotEmpty({ message: 'La clave del módulo es requerida' })
  module_key: string;

  @ApiProperty({
    description: 'Estado del módulo (true = habilitado, false = deshabilitado)',
    example: true,
  })
  @IsBoolean({ message: 'enabled debe ser un valor booleano' })
  enabled: boolean;
}
