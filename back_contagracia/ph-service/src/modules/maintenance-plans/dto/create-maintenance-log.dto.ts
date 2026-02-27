import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsDateString, IsArray, Min } from 'class-validator';

export class CreateMaintenanceLogDto {
  @ApiPropertyOptional({ description: 'IDs de las unidades donde se realizo (vacio = area comun)', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  unit_ids?: string[];

  @ApiProperty({ description: 'Fecha en que se realizo el mantenimiento' })
  @IsDateString()
  performed_date: string;

  @ApiPropertyOptional({ description: 'Nombre o referencia de quien ejecuto' })
  @IsString()
  @IsOptional()
  performed_by?: string;

  @ApiPropertyOptional({ description: 'ID del tercero proveedor que ejecuto' })
  @IsString()
  @IsOptional()
  provider_third_party_id?: string;

  @ApiPropertyOptional({ example: 450000 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  actual_cost?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  observations?: string;

  @ApiPropertyOptional({ description: 'URL del documento soporte (factura, fotos)' })
  @IsString()
  @IsOptional()
  document_url?: string;
}
