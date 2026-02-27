import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePackageDto {
  @ApiProperty({ description: 'ID de la copropiedad' })
  @IsString()
  condominium_id: string;

  @ApiProperty({ description: 'ID de la unidad destinataria' })
  @IsString()
  unit_id: string;

  @ApiPropertyOptional({ description: 'ID del tercero (residente) destinatario' })
  @IsOptional()
  @IsString()
  tercero_id?: string;

  @ApiProperty({ description: 'Descripción del paquete' })
  @IsString()
  description: string;

  @ApiPropertyOptional({ description: 'Empresa transportadora' })
  @IsOptional()
  @IsString()
  carrier?: string;

  @ApiPropertyOptional({ description: 'Número de guía / tracking' })
  @IsOptional()
  @IsString()
  tracking_number?: string;

  @ApiPropertyOptional({ description: 'Observaciones' })
  @IsOptional()
  @IsString()
  notes?: string;
}
