import { IsString, IsOptional, IsNotEmpty } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateAttributeOptionDto {
  @ApiPropertyOptional({ example: 'Rojo' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre no puede estar vacío' })
  @IsOptional()
  name?: string;
}
