import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateWarehouseDto {
  @ApiPropertyOptional({ example: 'Almacén Principal' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre no puede estar vacío' })
  @IsOptional()
  name?: string;
}
