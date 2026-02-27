import { IsString, IsOptional, IsNotEmpty, IsEnum, IsArray, ValidateNested, IsNumber, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

class ProjectionItemDto {
  @ApiProperty({ example: 'income' })
  @IsString()
  @IsNotEmpty()
  type_key: string;

  @ApiProperty({ example: 5000000 })
  @IsNumber()
  amount: number;
}

export class CreateProjectionDto {
  @ApiProperty({ example: 'Presupuesto Anual 2026' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre es requerido' })
  name: string;

  @ApiPropertyOptional({ example: 'Proyección de ingresos y gastos' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: ['GLOBAL', 'COST_CENTER'] })
  @IsEnum(['GLOBAL', 'COST_CENTER'], { message: 'scope debe ser GLOBAL o COST_CENTER' })
  scope: 'GLOBAL' | 'COST_CENTER';

  @ApiPropertyOptional({ example: 'uuid-centro-costos' })
  @IsString()
  @IsOptional()
  cost_center_id?: string;

  @ApiPropertyOptional({ example: false, description: 'Incluir subcentros (solo scope COST_CENTER)' })
  @IsBoolean()
  @IsOptional()
  include_sub_centers?: boolean;

  @ApiPropertyOptional({ example: 'uuid-padre' })
  @IsString()
  @IsOptional()
  parent_id?: string;

  @ApiProperty({ example: '2026-01-01' })
  @IsString()
  @IsNotEmpty({ message: 'La fecha de inicio es requerida' })
  start_date: string;

  @ApiProperty({ example: '2026-12-31' })
  @IsString()
  @IsNotEmpty({ message: 'La fecha de fin es requerida' })
  end_date: string;

  @ApiPropertyOptional({ type: [ProjectionItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProjectionItemDto)
  @IsOptional()
  items?: ProjectionItemDto[];
}
