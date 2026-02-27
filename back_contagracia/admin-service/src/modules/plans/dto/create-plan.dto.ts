import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  Min,
} from 'class-validator';

export class CreatePlanDto {
  @ApiProperty({
    description: 'Nombre único del plan',
    example: 'Profesional',
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Descripción del plan',
    example: 'Plan para pequeñas y medianas empresas',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Precio mensual del plan',
    example: 99000,
  })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({
    description: 'Moneda del precio',
    example: 'COP',
    default: 'COP',
  })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({
    description: 'Máximo de usuarios permitidos',
    example: 5,
    default: 1,
  })
  @IsNumber()
  @Min(1)
  @IsOptional()
  max_users?: number;

  @ApiPropertyOptional({
    description: 'Máximo de facturas por mes (null = ilimitado)',
    example: 100,
  })
  @IsNumber()
  @Min(1)
  @IsOptional()
  max_invoices?: number;

  @ApiPropertyOptional({
    description: 'Máximo de productos (null = ilimitado)',
    example: 500,
  })
  @IsNumber()
  @Min(1)
  @IsOptional()
  max_products?: number;

  @ApiPropertyOptional({
    description: 'Módulos habilitados para este plan',
    example: ['invoicing', 'inventory', 'reports'],
    default: [],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  modules_enabled?: string[];

  @ApiPropertyOptional({
    description: 'Si el plan está activo',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
