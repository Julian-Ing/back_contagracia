import { IsString, IsNotEmpty, IsUUID, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DenyPermissionDto {
  @ApiProperty({
    description: 'ID del usuario al que se le denegará el permiso',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID('4', { message: 'user_id debe ser un UUID válido' })
  @IsNotEmpty({ message: 'El ID del usuario es requerido' })
  user_id: string;

  @ApiProperty({
    description: 'Clave de la acción a denegar',
    example: 'invoices.send',
  })
  @IsString()
  @IsNotEmpty({ message: 'La clave de la acción es requerida' })
  action_key: string;

  @ApiPropertyOptional({
    description: 'Razón por la cual se deniega el permiso',
    example: 'Usuario en período de prueba',
  })
  @IsString()
  @IsOptional()
  reason?: string;
}
