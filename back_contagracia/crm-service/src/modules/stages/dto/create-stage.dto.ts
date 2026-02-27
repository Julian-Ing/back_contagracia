import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsInt, Min, Max } from 'class-validator';

export class CreateStageDto {
  @ApiPropertyOptional({ description: 'Valor/slug único de la etapa (se genera automáticamente si no se proporciona)' })
  @IsString()
  @IsOptional()
  value?: string;

  @ApiProperty({ description: 'Nombre de la etapa' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Color de la etapa', default: '#3B82F6' })
  @IsString()
  @IsOptional()
  color?: string = '#3B82F6';

  @ApiPropertyOptional({ description: 'Probabilidad de cierre (0-100)', default: 0 })
  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  probability?: number = 0;

  @ApiPropertyOptional({ description: 'Indica si es etapa ganada', default: false })
  @IsBoolean()
  @IsOptional()
  is_won?: boolean = false;

  @ApiPropertyOptional({ description: 'Indica si es etapa perdida', default: false })
  @IsBoolean()
  @IsOptional()
  is_lost?: boolean = false;

  @ApiPropertyOptional({ description: 'Indica si es etapa de cotización', default: false })
  @IsBoolean()
  @IsOptional()
  is_quoting_stage?: boolean = false;

  @ApiPropertyOptional({ description: 'Indica si es etapa inicial', default: false })
  @IsBoolean()
  @IsOptional()
  is_initial_stage?: boolean = false;

  @ApiPropertyOptional({ description: 'Indica si la etapa está activa', default: true })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean = true;
}
