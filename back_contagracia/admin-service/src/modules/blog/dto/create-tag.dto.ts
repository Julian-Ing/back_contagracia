import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class CreateTagDto {
  @ApiProperty({ description: 'Nombre del tag', example: 'Facturación' })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Slug (se genera automáticamente si no se provee)',
    example: 'facturacion',
  })
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiPropertyOptional({ description: 'Descripción del tag' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Color hexadecimal',
    example: '#8B5CF6',
  })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiPropertyOptional({ description: 'Nombre del icono (Lucide)' })
  @IsString()
  @IsOptional()
  icon?: string;
}
