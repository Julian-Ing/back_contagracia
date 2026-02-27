import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsDateString, Min } from 'class-validator';

export class CreateMaintenancePlanDto {
  @ApiProperty({ description: 'ID de la copropiedad' })
  @IsString()
  condominium_id: string;

  @ApiPropertyOptional({ description: 'ID del tercero proveedor de mantenimiento' })
  @IsString()
  @IsOptional()
  provider_third_party_id?: string;

  @ApiProperty({ example: 'Mantenimiento ascensor Torre A' })
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'ascensores' })
  @IsString()
  category: string;

  @ApiProperty({ example: 'trimestral' })
  @IsString()
  frequency: string;

  @ApiPropertyOptional({ example: 500000 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  estimated_cost?: number;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  last_maintenance_date?: string;

  @ApiProperty({ example: '2026-04-01' })
  @IsDateString()
  next_maintenance_date: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  document_url?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}
