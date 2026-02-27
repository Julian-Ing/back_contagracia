import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsDateString,
  IsUUID,
  IsEnum,
  IsEmail,
  MinLength,
  Min,
} from 'class-validator';

export enum BankAccountType {
  SAVINGS = 'SAVINGS',
  CHECKING = 'CHECKING',
}

export class CreateEmployeeDto {
  // ========== Datos de ThirdParty (Persona) ==========

  @ApiProperty({ description: 'Nombre completo del empleado' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Número de identificación (cédula/NIT)' })
  @IsString()
  identification_number: string;

  @ApiPropertyOptional({ description: 'Dígito de verificación' })
  @IsOptional()
  @IsString()
  dv?: string;

  @ApiPropertyOptional({ description: 'ID del tipo de organización (persona natural/jurídica)' })
  @IsOptional()
  @IsString()
  type_organization_id?: string;

  @ApiPropertyOptional({ description: 'ID del tipo de documento de identificación' })
  @IsOptional()
  @IsString()
  type_document_identification_id?: string;

  @ApiPropertyOptional({ description: 'Email del empleado' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ description: 'Teléfono del empleado' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Dirección del empleado' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'Primer nombre' })
  @IsOptional()
  @IsString()
  first_name?: string;

  @ApiPropertyOptional({ description: 'Segundo nombre' })
  @IsOptional()
  @IsString()
  second_name?: string;

  @ApiPropertyOptional({ description: 'Primer apellido' })
  @IsOptional()
  @IsString()
  first_surname?: string;

  @ApiPropertyOptional({ description: 'Segundo apellido' })
  @IsOptional()
  @IsString()
  second_surname?: string;

  @ApiPropertyOptional({ description: 'ID del departamento (ubicación)' })
  @IsOptional()
  @IsString()
  department_id?: string;

  @ApiPropertyOptional({ description: 'ID del municipio (ubicación)' })
  @IsOptional()
  @IsString()
  municipality_id?: string;

  // ========== Datos laborales del empleado ==========

  @ApiProperty({ description: 'Fecha de contratación (YYYY-MM-DD)' })
  @IsDateString()
  hire_date: string;

  @ApiPropertyOptional({ description: 'Si es personal administrativo', default: false })
  @IsOptional()
  @IsBoolean()
  is_administrative?: boolean;

  @ApiPropertyOptional({ description: 'ID del director/jefe directo' })
  @IsOptional()
  @IsUUID()
  director_id?: string;

  @ApiPropertyOptional({ description: 'ID del centro de costo' })
  @IsOptional()
  @IsUUID()
  cost_center_id?: string;

  @ApiPropertyOptional({ description: 'ID del método de pago' })
  @IsOptional()
  @IsUUID()
  payment_method_id?: string;

  // ========== Seguridad Social ==========

  @ApiPropertyOptional({ description: 'ID de la EPS (ThirdParty con rol EPS)' })
  @IsOptional()
  @IsUUID()
  eps_id?: string;

  @ApiPropertyOptional({ description: 'ID del Fondo de Pensiones' })
  @IsOptional()
  @IsUUID()
  pension_fund_id?: string;

  @ApiPropertyOptional({ description: 'ID de la ARL' })
  @IsOptional()
  @IsUUID()
  arl_id?: string;

  @ApiPropertyOptional({ description: 'ID del nivel de riesgo ARL' })
  @IsOptional()
  @IsString()
  arl_risk_id?: string;

  @ApiPropertyOptional({ description: 'ID de la Caja de Compensación' })
  @IsOptional()
  @IsUUID()
  compensation_fund_id?: string;

  @ApiPropertyOptional({ description: 'ID del Fondo de Cesantías' })
  @IsOptional()
  @IsUUID()
  severance_fund_id?: string;

  // ========== Datos Bancarios ==========

  @ApiPropertyOptional({ description: 'Nombre del banco' })
  @IsOptional()
  @IsString()
  bank_name?: string;

  @ApiPropertyOptional({ description: 'Tipo de cuenta bancaria', enum: BankAccountType })
  @IsOptional()
  @IsEnum(BankAccountType)
  bank_account_type?: BankAccountType;

  @ApiPropertyOptional({ description: 'Número de cuenta bancaria' })
  @IsOptional()
  @IsString()
  bank_account_number?: string;

  // ========== Contrato Inicial ==========

  @ApiPropertyOptional({ description: 'ID del tipo de contrato' })
  @IsOptional()
  @IsString()
  contract_type_id?: string;

  @ApiPropertyOptional({ description: 'ID del tipo de trabajador' })
  @IsOptional()
  @IsString()
  worker_type_id?: string;

  @ApiPropertyOptional({ description: 'ID del subtipo de trabajador' })
  @IsOptional()
  @IsString()
  worker_subtype_id?: string;

  @ApiPropertyOptional({ description: 'Cargo/función del empleado' })
  @IsOptional()
  @IsString()
  position?: string;

  @ApiPropertyOptional({ description: 'Días de periodo de prueba (0 = sin prueba)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  probation_days?: number;

  @ApiPropertyOptional({ description: 'Si el contrato estipula auxilio de transporte', default: true })
  @IsOptional()
  @IsBoolean()
  includes_transport?: boolean;

  @ApiPropertyOptional({ description: 'Fecha fin de contrato (YYYY-MM-DD), null = indefinido' })
  @IsOptional()
  @IsDateString()
  contract_end_date?: string;

  // ========== Salario Inicial ==========

  @ApiProperty({ description: 'Salario mensual', minimum: 0 })
  @IsNumber()
  @Min(0)
  salary: number;

  @ApiPropertyOptional({ description: 'Tipo de salario', enum: ['ORDINARIO', 'INTEGRAL'], default: 'ORDINARIO' })
  @IsOptional()
  @IsString()
  salary_type?: string;

  @ApiPropertyOptional({ description: 'Monto del auxilio de transporte (ej: 200000). 0 o null = no aplica' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  transportation_allowance?: number;

  @ApiPropertyOptional({ description: 'Si tiene salario variable (comisiones)', default: false })
  @IsOptional()
  @IsBoolean()
  variable_salary?: boolean;

  // ========== Cuenta de Usuario (opcional) ==========

  @ApiPropertyOptional({ description: 'Crear cuenta de acceso al sistema para este empleado', default: false })
  @IsOptional()
  @IsBoolean()
  create_system_account?: boolean;

  @ApiPropertyOptional({ description: 'Email para la cuenta de usuario (si create_system_account es true)' })
  @IsOptional()
  @IsEmail()
  system_email?: string;

  @ApiPropertyOptional({ description: 'Contraseña para la cuenta de usuario' })
  @IsOptional()
  @IsString()
  @MinLength(8)
  system_password?: string;

  @ApiPropertyOptional({ description: 'ID del rol para la cuenta de usuario' })
  @IsOptional()
  @IsUUID()
  system_role_id?: string;

  @ApiPropertyOptional({ description: 'ID de un TenantUser existente para vincular al empleado' })
  @IsOptional()
  @IsUUID()
  existing_user_id?: string;
}
