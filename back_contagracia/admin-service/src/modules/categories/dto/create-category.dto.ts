import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({
    description: 'Nombre único de la categoría',
    example: 'Premium',
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Descripción de la categoría',
    example: 'Clientes con plan premium',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Color en formato hexadecimal',
    example: '#6366f1',
    default: '#6366f1',
  })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiPropertyOptional({
    description: 'Si la categoría está activa',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
