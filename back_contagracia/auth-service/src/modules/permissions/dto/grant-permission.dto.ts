import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsOptional,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GrantPermissionDto {
  @ApiProperty({
    description: 'ID del usuario al que se le otorgará el permiso',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID('4', { message: 'user_id debe ser un UUID válido' })
  @IsNotEmpty({ message: 'El ID del usuario es requerido' })
  user_id: string;

  @ApiProperty({
    description: 'Clave de la acción a otorgar',
    example: 'invoices.delete',
  })
  @IsString()
  @IsNotEmpty({ message: 'La clave de la acción es requerida' })
  action_key: string;

  @ApiPropertyOptional({
    description: 'Fecha de expiración del permiso (opcional)',
    type: String,
    format: 'date-time',
    example: '2024-12-31T23:59:59.000Z',
  })
  @IsDateString(
    {},
    { message: 'expires_at debe ser una fecha válida en formato ISO 8601' },
  )
  @IsOptional()
  expires_at?: string;

  @ApiPropertyOptional({
    description: 'Razón por la cual se otorga el permiso',
    example: 'Permiso temporal para auditoría',
  })
  @IsString()
  @IsOptional()
  reason?: string;
}
