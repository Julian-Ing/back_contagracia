import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID, IsNumber, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateOpportunityDto {
  @ApiPropertyOptional({ description: 'Nombre de la oportunidad' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Valor esperado' })
  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  expected_value?: number;

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
