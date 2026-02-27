import { IsString, IsOptional, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCostCenterDto {
  @ApiProperty({ example: 'Construcción Edificio' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre es requerido' })
  name: string;

  @ApiPropertyOptional({ example: 'Centro de costos para obra principal' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'uuid-del-padre', description: 'null = raíz, set = sub-centro' })
  @IsString()
  @IsOptional()
  parent_id?: string;
}
