import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsUUID, IsDateString, IsOptional } from 'class-validator';

export class CreateRentalDto {
  @ApiProperty({ description: 'ID de la unidad que se alquila (ej. parqueadero)' })
  @IsUUID()
  @IsNotEmpty()
  unit_id: string;

  @ApiProperty({ description: 'ID de la unidad que arrienda (inquilino)' })
  @IsUUID()
  @IsNotEmpty()
  renter_unit_id: string;

  @ApiProperty({ description: 'ID del condominio' })
  @IsUUID()
  @IsNotEmpty()
  condominium_id: string;

  @ApiProperty({ description: 'Fecha y hora de inicio del alquiler (ISO 8601)' })
  @IsDateString()
  @IsNotEmpty()
  start_time: string;

  @ApiPropertyOptional({ description: 'Notas adicionales' })
  @IsOptional()
  @IsString()
  notes?: string;
}
