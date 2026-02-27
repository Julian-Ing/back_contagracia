import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAttributeOptionDto {
  @ApiProperty({ example: 'Rojo' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre es requerido' })
  name: string;
}
