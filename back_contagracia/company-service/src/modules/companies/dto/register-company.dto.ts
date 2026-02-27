import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsOptional,
  MinLength,
  MaxLength,
  Matches,
  IsNotEmpty,
} from 'class-validator';

export class RegisterCompanyDto {
  // === Datos de la empresa ===

  @ApiProperty({ description: 'Nombre de la empresa' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(200)
  company_name: string;

  @ApiProperty({ description: 'NIT de la empresa (sin DV)' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4,15}$/, { message: 'NIT debe ser de 4 a 15 dígitos' })
  nit: string;

  @ApiProperty({ description: 'Dígito de verificación', required: false })
  @IsOptional()
  @IsString()
  @Matches(/^\d{1}$/, { message: 'DV debe ser un solo dígito' })
  dv?: string;

  @ApiProperty({ description: 'Email de la empresa', required: false })
  @IsOptional()
  @IsEmail()
  company_email?: string;

  @ApiProperty({ description: 'Teléfono de la empresa', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ description: 'Dirección de la empresa', required: false })
  @IsOptional()
  @IsString()
  address?: string;

  // === Datos paramétricos (IDs de tablas de referencia) ===

  @ApiProperty({ description: 'Sector / tipo de organización', required: false })
  @IsOptional()
  @IsString()
  type_organization_id?: string;

  @ApiProperty({ description: 'Tipo de documento de identificación', required: false })
  @IsOptional()
  @IsString()
  type_document_identification_id?: string;

  @ApiProperty({ description: 'Régimen tributario', required: false })
  @IsOptional()
  @IsString()
  type_regime_id?: string;

  @ApiProperty({ description: 'Responsabilidad fiscal', required: false })
  @IsOptional()
  @IsString()
  type_liability_id?: string;

  @ApiProperty({ description: 'País', required: false })
  @IsOptional()
  @IsString()
  country_id?: string;

  @ApiProperty({ description: 'Departamento', required: false })
  @IsOptional()
  @IsString()
  department_id?: string;

  @ApiProperty({ description: 'Municipio / ciudad', required: false })
  @IsOptional()
  @IsString()
  municipality_id?: string;

  // === Datos del administrador ===

  @ApiProperty({ description: 'Email del administrador' })
  @IsEmail()
  @IsNotEmpty()
  admin_email: string;

  @ApiProperty({ description: 'Contraseña del administrador' })
  @IsString()
  @MinLength(8)
  admin_password: string;

  @ApiProperty({ description: 'Nombre completo del administrador' })
  @IsString()
  @IsNotEmpty()
  admin_full_name: string;

  @ApiProperty({ description: 'Teléfono del administrador', required: false })
  @IsOptional()
  @IsString()
  admin_phone?: string;

  // === Plan ===

  @ApiProperty({ description: 'ID del plan', required: false })
  @IsOptional()
  @IsString()
  plan_id?: string;

  // === Token de verificación de email ===

  @ApiProperty({ description: 'Token de registro (obtenido tras verificar email)', required: false })
  @IsOptional()
  @IsString()
  registration_token?: string;
}
