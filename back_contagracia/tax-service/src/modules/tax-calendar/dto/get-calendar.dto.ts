import { IsInt, Min, Max, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class GetCalendarDto {
  @ApiProperty({
    description: 'Año del calendario tributario',
    example: 2026,
    minimum: 2020,
    maximum: 2030,
  })
  @IsInt({ message: 'El año debe ser un número entero' })
  @Min(2020, { message: 'El año debe ser mayor o igual a 2020' })
  @Max(2030, { message: 'El año debe ser menor o igual a 2030' })
  @Type(() => Number)
  year: number;

  @ApiPropertyOptional({
    description: 'Mes del calendario (1-12). Si no se especifica, se devuelve todo el año',
    example: 3,
    minimum: 1,
    maximum: 12,
  })
  @IsOptional()
  @IsInt({ message: 'El mes debe ser un número entero' })
  @Min(1, { message: 'El mes debe estar entre 1 y 12' })
  @Max(12, { message: 'El mes debe estar entre 1 y 12' })
  @Type(() => Number)
  month?: number;
}
