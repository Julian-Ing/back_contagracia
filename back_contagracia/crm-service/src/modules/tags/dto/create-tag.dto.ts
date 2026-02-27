import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateTagDto {
  @ApiProperty({ description: 'Nombre del tag' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Color del tag', default: '#3B82F6' })
  @IsString()
  @IsOptional()
  color?: string = '#3B82F6';
}
