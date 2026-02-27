import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional } from 'class-validator';

export class UpdateContadorDto {
  @ApiPropertyOptional({ description: 'Nombre del contador' })
  @IsOptional()
  @IsString()
  contador_name?: string;

  @ApiPropertyOptional({ description: 'Identificación del contador' })
  @IsOptional()
  @IsString()
  contador_identification?: string;

  @ApiPropertyOptional({ description: 'Teléfono del contador' })
  @IsOptional()
  @IsString()
  contador_phone?: string;

  @ApiPropertyOptional({ description: 'Email del contador' })
  @IsOptional()
  @IsEmail()
  contador_email?: string;
}
