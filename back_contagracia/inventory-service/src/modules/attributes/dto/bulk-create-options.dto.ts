import { IsArray, IsString, IsNotEmpty, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BulkCreateOptionsDto {
  @ApiProperty({ type: [String], example: ['Rojo', 'Azul', 'Verde'] })
  @IsArray()
  @ArrayMinSize(1, { message: 'Debe enviar al menos una opción' })
  @IsString({ each: true })
  @IsNotEmpty({ each: true, message: 'El nombre de cada opción es requerido' })
  names: string[];
}
