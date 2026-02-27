import { IsInt, Min, Max, IsOptional, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class SyncCalendarDto {
  @ApiProperty({
    description: 'Año del calendario tributario a sincronizar',
    example: 2026,
    minimum: 2020,
    maximum: 2030,
  })
  @IsInt({ message: 'El año debe ser un número entero' })
  @Min(2020, { message: 'El año debe ser mayor o igual a 2020' })
  @Max(2030, { message: 'El año debe ser menor o igual a 2030' })
  @Type(() => Number)
  year: number;
}

export class SyncFromUrlDto {
  @ApiProperty({
    description: 'URL del PDF del calendario tributario',
    example: 'https://www.dian.gov.co/Calendarios/Calendario_Tributario_2026.pdf',
  })
  @IsUrl({}, { message: 'Debe ser una URL válida' })
  url: string;

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
}
