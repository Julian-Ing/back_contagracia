import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, IsArray, ArrayNotEmpty, IsIn } from 'class-validator';

export class CreateComunicadoDto {
  @ApiProperty({ description: 'ID de la copropiedad' })
  @IsUUID()
  condominium_id: string;

  @ApiProperty({ description: 'Título del comunicado' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Cuerpo del comunicado' })
  @IsString()
  body: string;

  @ApiProperty({
    description: 'Roles destinatarios',
    example: ['owner', 'tenant'],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsIn(['owner', 'tenant'], { each: true })
  target_roles: string[];
}
