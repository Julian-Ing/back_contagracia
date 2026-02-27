import { IsString, IsOptional, IsArray, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ThirdPartyRole {
  CLIENT = 'CLIENT',
  SUPPLIER = 'SUPPLIER',
  EMPLOYEE = 'EMPLOYEE',
  CONTACT = 'CONTACT',
  EPS = 'EPS',
  PENSION_FUND = 'PENSION_FUND',
  ARL = 'ARL',
  COMPENSATION_FUND = 'COMPENSATION_FUND',
  SEVERANCE_FUND = 'SEVERANCE_FUND',
  SENA = 'SENA',
  ICBF = 'ICBF',
  CO_OWNER = 'CO_OWNER',
  TENANT = 'TENANT',
  OTHER = 'OTHER',
}

export class CreateThirdPartyDto {
  @ApiProperty({ description: 'Nombre o razón social' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Número de identificación' })
  @IsOptional()
  @IsString()
  identification_number?: string;

  @ApiPropertyOptional({ description: 'Dígito de verificación' })
  @IsOptional()
  @IsString()
  dv?: string;

  @ApiPropertyOptional({ description: 'ID tipo de documento' })
  @IsOptional()
  @IsString()
  type_document_identification_id?: string;

  @ApiPropertyOptional({ description: 'ID tipo de organización' })
  @IsOptional()
  @IsString()
  type_organization_id?: string;

  @ApiPropertyOptional({ description: 'ID tipo de régimen' })
  @IsOptional()
  @IsString()
  type_regime_id?: string;

  @ApiPropertyOptional({ description: 'ID tipo de responsabilidad' })
  @IsOptional()
  @IsString()
  type_liability_id?: string;

  @ApiProperty({ description: 'Roles del tercero', type: [String], enum: ThirdPartyRole })
  @IsArray()
  @IsEnum(ThirdPartyRole, { each: true })
  roles: ThirdPartyRole[];

  @ApiPropertyOptional({ description: 'ID departamento' })
  @IsOptional()
  @IsString()
  department_id?: string;

  @ApiPropertyOptional({ description: 'ID municipio' })
  @IsOptional()
  @IsString()
  municipality_id?: string;

  @ApiPropertyOptional({ description: 'Correo electrónico' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ description: 'Teléfono' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Dirección' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'Primer nombre (persona natural)' })
  @IsOptional()
  @IsString()
  first_name?: string;

  @ApiPropertyOptional({ description: 'Segundo nombre (persona natural)' })
  @IsOptional()
  @IsString()
  second_name?: string;

  @ApiPropertyOptional({ description: 'Primer apellido (persona natural)' })
  @IsOptional()
  @IsString()
  first_surname?: string;

  @ApiPropertyOptional({ description: 'Segundo apellido (persona natural)' })
  @IsOptional()
  @IsString()
  second_surname?: string;

  @ApiPropertyOptional({ description: 'Código cuenta CxC' })
  @IsOptional()
  @IsString()
  cxc_account_code?: string;

  @ApiPropertyOptional({ description: 'Código cuenta CxP' })
  @IsOptional()
  @IsString()
  cxp_account_code?: string;
}

export class UpdateThirdPartyDto {
  @ApiPropertyOptional({ description: 'Nombre o razón social' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Número de identificación' })
  @IsOptional()
  @IsString()
  identification_number?: string;

  @ApiPropertyOptional({ description: 'Dígito de verificación' })
  @IsOptional()
  @IsString()
  dv?: string;

  @ApiPropertyOptional({ description: 'ID tipo de documento' })
  @IsOptional()
  @IsString()
  type_document_identification_id?: string;

  @ApiPropertyOptional({ description: 'ID tipo de organización' })
  @IsOptional()
  @IsString()
  type_organization_id?: string;

  @ApiPropertyOptional({ description: 'ID tipo de régimen' })
  @IsOptional()
  @IsString()
  type_regime_id?: string;

  @ApiPropertyOptional({ description: 'ID tipo de responsabilidad' })
  @IsOptional()
  @IsString()
  type_liability_id?: string;

  @ApiPropertyOptional({ description: 'Roles del tercero', type: [String], enum: ThirdPartyRole })
  @IsOptional()
  @IsArray()
  @IsEnum(ThirdPartyRole, { each: true })
  roles?: ThirdPartyRole[];

  @ApiPropertyOptional({ description: 'ID departamento' })
  @IsOptional()
  @IsString()
  department_id?: string;

  @ApiPropertyOptional({ description: 'ID municipio' })
  @IsOptional()
  @IsString()
  municipality_id?: string;

  @ApiPropertyOptional({ description: 'Correo electrónico' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ description: 'Teléfono' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Dirección' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'Primer nombre (persona natural)' })
  @IsOptional()
  @IsString()
  first_name?: string;

  @ApiPropertyOptional({ description: 'Segundo nombre (persona natural)' })
  @IsOptional()
  @IsString()
  second_name?: string;

  @ApiPropertyOptional({ description: 'Primer apellido (persona natural)' })
  @IsOptional()
  @IsString()
  first_surname?: string;

  @ApiPropertyOptional({ description: 'Segundo apellido (persona natural)' })
  @IsOptional()
  @IsString()
  second_surname?: string;

  @ApiPropertyOptional({ description: 'Código cuenta CxC' })
  @IsOptional()
  @IsString()
  cxc_account_code?: string;

  @ApiPropertyOptional({ description: 'Código cuenta CxP' })
  @IsOptional()
  @IsString()
  cxp_account_code?: string;
}
