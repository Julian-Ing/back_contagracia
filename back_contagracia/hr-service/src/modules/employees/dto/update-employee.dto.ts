import { ApiPropertyOptional, PartialType, OmitType } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsDateString } from 'class-validator';
import { CreateEmployeeDto } from './create-employee.dto';

export enum EmployeeStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ON_LEAVE = 'ON_LEAVE',
  TERMINATED = 'TERMINATED',
}

export enum TerminationType {
  MUTUO_ACUERDO = 'MUTUO_ACUERDO',
  JUSTA_CAUSA_EMPLEADOR = 'JUSTA_CAUSA_EMPLEADOR',
  JUSTA_CAUSA_TRABAJADOR = 'JUSTA_CAUSA_TRABAJADOR',
  SIN_JUSTA_CAUSA = 'SIN_JUSTA_CAUSA',
  EXPIRACION_PLAZO = 'EXPIRACION_PLAZO',
  OBRA_COMPLETADA = 'OBRA_COMPLETADA',
  RENUNCIA = 'RENUNCIA',
}

export class UpdateEmployeeDto extends PartialType(
  OmitType(CreateEmployeeDto, [
    'identification_number',
    'salary',
    'salary_type',
    'transportation_allowance',
    'variable_salary',
    'contract_type_id',
    'worker_type_id',
    'worker_subtype_id',
    'contract_end_date',
    'position',
    'probation_days',
    'includes_transport',
    'create_system_account',
    'system_email',
    'system_password',
    'system_role_id',
    'existing_user_id',
  ] as const),
) {}

export class UpdateEmployeeStatusDto {
  @ApiPropertyOptional({
    description: 'Nuevo estado del empleado',
    enum: EmployeeStatus,
  })
  @IsEnum(EmployeeStatus)
  status: EmployeeStatus;
}

export class TerminateEmployeeDto {
  @ApiPropertyOptional({ description: 'Tipo de terminación', enum: TerminationType })
  @IsOptional()
  @IsEnum(TerminationType)
  termination_type?: TerminationType;

  @ApiPropertyOptional({ description: 'Fecha de terminación (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  termination_date?: string;

  @ApiPropertyOptional({ description: 'Motivo de terminación' })
  @IsOptional()
  @IsString()
  termination_reason?: string;
}
