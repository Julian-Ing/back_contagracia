import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  IsDateString,
  IsUUID,
} from 'class-validator';

export class CreateLeaveDto {
  @ApiProperty({ description: 'ID del perfil de empleado' })
  @IsUUID()
  @IsNotEmpty()
  third_party_id: string;

  @ApiProperty({
    description: 'Tipo de ausencia',
    enum: [
      'SICK_LEAVE',
      'VACATION',
      'VACATION_MONETIZED',
      'PERSONAL_LEAVE',
      'COMPENSATORY_TIME',
      'UNPAID_LEAVE',
      'MATERNITY_LEAVE',
      'PATERNITY_LEAVE',
    ],
  })
  @IsString()
  @IsNotEmpty()
  leave_type: string;

  @ApiProperty({ description: 'Fecha de inicio (YYYY-MM-DD)' })
  @IsDateString()
  @IsNotEmpty()
  start_date: string;

  @ApiProperty({ description: 'Fecha de fin (YYYY-MM-DD)' })
  @IsDateString()
  @IsNotEmpty()
  end_date: string;

  @ApiProperty({ description: 'Dias solicitados' })
  @IsInt()
  @Min(1)
  days_requested: number;

  @ApiProperty({ description: 'Razon o motivo', required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class RequestLeaveDto {
  @ApiProperty({
    description: 'Tipo de ausencia',
    enum: [
      'SICK_LEAVE',
      'VACATION',
      'VACATION_MONETIZED',
      'PERSONAL_LEAVE',
      'COMPENSATORY_TIME',
      'UNPAID_LEAVE',
      'MATERNITY_LEAVE',
      'PATERNITY_LEAVE',
    ],
  })
  @IsString()
  @IsNotEmpty()
  leave_type: string;

  @ApiProperty({ description: 'Fecha de inicio (YYYY-MM-DD)' })
  @IsDateString()
  @IsNotEmpty()
  start_date: string;

  @ApiProperty({ description: 'Fecha de fin (YYYY-MM-DD)' })
  @IsDateString()
  @IsNotEmpty()
  end_date: string;

  @ApiProperty({ description: 'Dias solicitados' })
  @IsInt()
  @Min(1)
  days_requested: number;

  @ApiProperty({ description: 'Razon o motivo', required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}
