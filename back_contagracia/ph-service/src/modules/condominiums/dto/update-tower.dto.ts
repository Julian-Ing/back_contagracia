import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber } from 'class-validator';

export class UpdateTowerDto {
  @ApiPropertyOptional({ description: 'Nombre de la torre' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Codigo de la torre' })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiPropertyOptional({ description: 'Total de pisos de la torre' })
  @IsNumber()
  @IsOptional()
  total_floors?: number;
}
