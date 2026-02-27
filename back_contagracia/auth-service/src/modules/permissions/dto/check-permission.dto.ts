import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CheckPermissionDto {
  @ApiProperty({
    description: 'Clave de la acción a verificar',
    example: 'invoices.create',
  })
  @IsString()
  @IsNotEmpty({ message: 'La clave de la acción es requerida' })
  action_key: string;
}
