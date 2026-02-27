import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min, Max } from 'class-validator';

export class UpdateSettingsDto {
  @ApiProperty({ description: 'Decimales a mostrar en UI (0-4). BD siempre guarda 4.' })
  @IsInt()
  @Min(0)
  @Max(4)
  display_decimals: number;
}
