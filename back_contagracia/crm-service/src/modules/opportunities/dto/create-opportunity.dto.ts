import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsUUID, IsNumber, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateOpportunityDto {
  @ApiProperty({ description: 'Nombre de la oportunidad' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'ID de la etapa' })
  @IsUUID()
  @IsNotEmpty()
  stage_id: string;

  @ApiProperty({ description: 'Valor esperado' })
  @IsNumber()
  @Transform(({ value }) => parseFloat(value))
  expected_value: number;

  @ApiPropertyOptional({ description: 'ID del tercero (contacto)' })
  @IsUUID()
  @IsOptional()
  third_party_id?: string;

  @ApiPropertyOptional({ description: 'ID del lead' })
  @IsUUID()
  @IsOptional()
  lead_id?: string;

  @ApiPropertyOptional({ description: 'Probabilidad (0-100)' })
  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  probability?: number;

  @ApiPropertyOptional({ description: 'Fecha de cierre esperada' })
  @IsDateString()
  @IsOptional()
  close_date?: string;

  @ApiPropertyOptional({ description: 'ID del usuario asignado' })
  @IsUUID()
  @IsOptional()
  assigned_to?: string;

  @ApiPropertyOptional({ description: 'ID del centro de costos' })
  @IsUUID()
  @IsOptional()
  cost_center_id?: string;
}
