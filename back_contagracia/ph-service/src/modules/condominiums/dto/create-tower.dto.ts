import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

export class CreateTowerDto {
  @ApiProperty({ description: 'Nombre de la torre' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Codigo de la torre' })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiPropertyOptional({ description: 'Total de pisos de la torre' })
  @IsNumber()
  @IsOptional()
  total_floors?: number;
}
