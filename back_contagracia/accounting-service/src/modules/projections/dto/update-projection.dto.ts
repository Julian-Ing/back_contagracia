import { IsString, IsOptional, IsArray, ValidateNested, IsNumber, IsNotEmpty, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

class ProjectionItemDto {
  @IsString()
  @IsNotEmpty()
  type_key: string;

  @IsNumber()
  amount: number;
}

export class UpdateProjectionDto {
  @ApiPropertyOptional({ example: 'Presupuesto Anual 2026 v2' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'Descripción actualizada' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsString()
  @IsOptional()
  start_date?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsString()
  @IsOptional()
  end_date?: string;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  include_sub_centers?: boolean;

  @ApiPropertyOptional({ type: [ProjectionItemDto], description: 'Reemplaza todos los items' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProjectionItemDto)
  @IsOptional()
  items?: ProjectionItemDto[];
}
