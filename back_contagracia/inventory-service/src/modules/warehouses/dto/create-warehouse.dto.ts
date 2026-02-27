import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWarehouseDto {
  @ApiProperty({ example: 'Almacén Principal' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre es requerido' })
  name: string;
}
