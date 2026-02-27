import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class UpdateTagDto {
  @ApiPropertyOptional({ description: 'Nombre del tag' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Color del tag' })
  @IsString()
  @IsOptional()
  color?: string;
}
