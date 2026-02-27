import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsInt, Min, Max } from 'class-validator';

export class UpdateStageDto {
  @ApiPropertyOptional({ description: 'Valor/slug único de la etapa' })
  @IsString()
  @IsOptional()
  value?: string;

  @ApiPropertyOptional({ description: 'Nombre de la etapa' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Color de la etapa' })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiPropertyOptional({ description: 'Probabilidad de cierre (0-100)' })
  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  probability?: number;

  @ApiPropertyOptional({ description: 'Indica si es etapa ganada' })
  @IsBoolean()
  @IsOptional()
  is_won?: boolean;

  @ApiPropertyOptional({ description: 'Indica si es etapa perdida' })
  @IsBoolean()
  @IsOptional()
  is_lost?: boolean;

  @ApiPropertyOptional({ description: 'Indica si es etapa de cotización' })
  @IsBoolean()
  @IsOptional()
  is_quoting_stage?: boolean;

  @ApiPropertyOptional({ description: 'Indica si es etapa inicial' })
  @IsBoolean()
  @IsOptional()
  is_initial_stage?: boolean;

  @ApiPropertyOptional({ description: 'Indica si la etapa está activa' })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
