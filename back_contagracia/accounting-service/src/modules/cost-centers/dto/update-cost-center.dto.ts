import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCostCenterDto {
  @ApiPropertyOptional({ example: 'Construcción Edificio Norte' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'Centro actualizado' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'uuid-del-padre', description: 'null = mover a raíz' })
  @IsString()
  @IsOptional()
  parent_id?: string | null;
}
