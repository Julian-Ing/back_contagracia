import { IsInt, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ParsePdfDto {
  @ApiProperty({
    description: 'Archivo PDF del calendario tributario DIAN',
    type: 'string',
    format: 'binary',
  })
  file: Express.Multer.File;

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
