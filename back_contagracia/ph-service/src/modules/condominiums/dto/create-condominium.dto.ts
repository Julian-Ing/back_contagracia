import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsEmail } from 'class-validator';

export class CreateCondominiumDto {
  @ApiProperty({ description: 'Nombre del condominio' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'NIT del condominio' })
  @IsString()
  @IsOptional()
  nit?: string;

  @ApiPropertyOptional({ description: 'Direccion del condominio' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ description: 'ID del departamento' })
  @IsString()
  @IsOptional()
  department_id?: string;

  @ApiPropertyOptional({ description: 'ID del municipio' })
  @IsString()
  @IsOptional()
  municipality_id?: string;

  @ApiPropertyOptional({ description: 'Telefono del condominio' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ description: 'Email del condominio' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: 'ID de la empresa administradora' })
  @IsString()
  @IsOptional()
  admin_company_id?: string;

  @ApiPropertyOptional({ description: 'Total de unidades del condominio' })
  @IsNumber()
  @IsOptional()
  total_units?: number;

  @ApiPropertyOptional({ description: 'Precio por metro cuadrado' })
  @IsNumber()
  @IsOptional()
  price_per_m2?: number;

  @ApiPropertyOptional({ description: 'URL del logo de la copropiedad' })
  @IsString()
  @IsOptional()
  logo_url?: string;
}
