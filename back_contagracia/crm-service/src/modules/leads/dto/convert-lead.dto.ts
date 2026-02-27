import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, Max, IsDateString } from 'class-validator';

export class ConvertLeadDto {
  @ApiProperty({ description: 'Nombre de la oportunidad' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Valor esperado de la oportunidad' })
  @IsNumber()
  @Min(0)
  expected_value: number;

  @ApiPropertyOptional({ description: 'ID de la etapa inicial' })
  @IsString()
  @IsOptional()
  stage_id?: string;

  @ApiPropertyOptional({ description: 'Fecha estimada de cierre' })
  @IsDateString()
  @IsOptional()
  close_date?: string;

  @ApiPropertyOptional({ description: 'Probabilidad de cierre (0-100)', default: 25 })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  probability?: number;

  @ApiPropertyOptional({ description: 'ID del usuario asignado' })
  @IsString()
  @IsOptional()
  assigned_to?: string;

  @ApiPropertyOptional({ description: 'ID del centro de costo' })
  @IsString()
  @IsOptional()
  cost_center_id?: string;
}
