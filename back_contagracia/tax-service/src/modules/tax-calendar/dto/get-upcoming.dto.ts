import { IsInt, Min, Max, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class GetUpcomingDto {
  @ApiPropertyOptional({
    description: 'Días hacia adelante para buscar obligaciones próximas',
    example: 30,
    minimum: 1,
    maximum: 365,
    default: 30,
  })
  @IsOptional()
  @IsInt({ message: 'Los días deben ser un número entero' })
  @Min(1, { message: 'Debe ser al menos 1 día' })
  @Max(365, { message: 'Máximo 365 días' })
  @Type(() => Number)
  daysAhead?: number = 30;
}
