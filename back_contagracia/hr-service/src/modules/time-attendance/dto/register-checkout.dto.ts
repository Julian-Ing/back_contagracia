import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsOptional, IsString } from 'class-validator';

export class RegisterCheckoutDto {
  @ApiPropertyOptional({ description: 'ID del empleado (opcional, si no se envia se usa el del usuario autenticado)' })
  @IsOptional()
  @IsUUID()
  third_party_id?: string;

  @ApiPropertyOptional({ description: 'Notas opcionales' })
  @IsOptional()
  @IsString()
  notes?: string;
}
