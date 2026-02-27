import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty } from 'class-validator';

export class UpdateStatusDto {
  @ApiProperty({ description: 'Estado activo/inactivo del usuario' })
  @IsBoolean()
  @IsNotEmpty()
  is_active: boolean;
}
