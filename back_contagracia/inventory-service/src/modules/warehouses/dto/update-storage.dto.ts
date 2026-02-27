import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateStorageDto {
  @ApiPropertyOptional({ example: 'Bodega A' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre no puede estar vacío' })
  @IsOptional()
  name?: string;
}
