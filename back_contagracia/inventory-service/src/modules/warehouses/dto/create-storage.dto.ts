import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateStorageDto {
  @ApiProperty({ example: 'Bodega A' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre es requerido' })
  name: string;
}
