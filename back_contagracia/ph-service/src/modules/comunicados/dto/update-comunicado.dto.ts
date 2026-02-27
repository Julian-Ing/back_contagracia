import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsArray, IsIn, IsOptional } from 'class-validator';

export class UpdateComunicadoDto {
  @ApiPropertyOptional({ description: 'Título del comunicado' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ description: 'Cuerpo del comunicado' })
  @IsString()
  @IsOptional()
  body?: string;

  @ApiPropertyOptional({
    description: 'Roles destinatarios',
    example: ['owner', 'tenant'],
  })
  @IsArray()
  @IsIn(['owner', 'tenant'], { each: true })
  @IsOptional()
  target_roles?: string[];
}
