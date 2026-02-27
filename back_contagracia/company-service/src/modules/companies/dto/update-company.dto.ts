import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsInt, Min, Max, MaxLength, Matches, IsNumber } from 'class-validator';

export class UpdateCompanyDto {
  @ApiProperty({ description: 'NIT de la empresa (solo dígitos)' })
  @IsString()
  @Matches(/^\d{1,15}$/, { message: 'El NIT debe contener solo dígitos' })
  nit: string;

  @ApiProperty({ description: 'Dígito de verificación del NIT (calculado automáticamente)' })
  @IsString()
  dv: string;

  @ApiProperty({ description: 'ID del tipo de documento de identificación' })
  @IsString()
  type_document_identification_id: string;

  @ApiProperty({ description: 'ID del tipo de organización (persona jurídica/natural)' })
  @IsString()
  type_organization_id: string;

  @ApiProperty({ description: 'Nombre de la empresa' })
  @IsString()
  @MaxLength(200)
  company_name: string;

  @ApiProperty({ description: 'Email de la empresa' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Teléfono de la empresa' })
  @IsString()
  phone: string;

  @ApiProperty({ description: 'Dirección de la empresa' })
  @IsString()
  address: string;

  @ApiProperty({ description: 'ID del departamento' })
  @IsString()
  department_id: string;

  @ApiProperty({ description: 'ID del municipio' })
  @IsString()
  municipality_id: string;

  @ApiProperty({ description: 'ID del régimen tributario' })
  @IsString()
  type_regime_id: string;

  @ApiProperty({ description: 'ID de la responsabilidad fiscal' })
  @IsString()
  type_liability_id: string;

  @ApiProperty({ description: 'Nombre del representante legal' })
  @IsString()
  legal_rep_name: string;

  @ApiProperty({ description: 'Identificación del representante legal' })
  @IsString()
  legal_rep_identification: string;

  @ApiProperty({ description: 'Teléfono del representante legal' })
  @IsString()
  legal_rep_phone: string;

  @ApiProperty({ description: 'Email del representante legal' })
  @IsEmail()
  legal_rep_email: string;

  @ApiProperty({ description: 'Decimales a mostrar en UI (0-4). BD siempre guarda 4.' })
  @IsInt()
  @Min(0)
  @Max(4)
  display_decimals: number;

  @ApiProperty({ description: 'URL del logo (gestionada por endpoint de logo)', required: false })
  logo_url?: string;
}
