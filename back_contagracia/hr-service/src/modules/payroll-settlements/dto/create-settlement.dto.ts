import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsDateString,
  IsEnum,
  IsBoolean,
  IsInt,
  IsArray,
  IsUUID,
  Min,
  Max,
} from 'class-validator';

export class CreateSettlementDto {
  @ApiProperty({ description: 'Nombre de la liquidación' })
  @IsString()
  settlement_name: string;

  @ApiPropertyOptional({
    description: 'Tipo de liquidación',
    enum: ['REGULAR', 'PRIMA', 'CESANTIAS', 'VACACIONES', 'TERMINACION'],
    default: 'REGULAR',
  })
  @IsOptional()
  @IsEnum(['REGULAR', 'PRIMA', 'CESANTIAS', 'VACACIONES', 'TERMINACION'] as const)
  settlement_type?: string;

  @ApiProperty({ description: 'Fecha inicio del periodo (YYYY-MM-DD)' })
  @IsDateString()
  start_date: string;

  @ApiProperty({ description: 'Fecha fin del periodo (YYYY-MM-DD)' })
  @IsDateString()
  end_date: string;

  @ApiPropertyOptional({ description: 'Fecha de pago (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  payment_date?: string;

  @ApiPropertyOptional({ description: 'Número de periodo en el mes (1 = primera quincena, 2 = segunda)', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(4)
  period_number?: number;

  @ApiPropertyOptional({ description: 'Liquidar prima de servicios', default: false })
  @IsOptional()
  @IsBoolean()
  liquidate_prima?: boolean;

  @ApiPropertyOptional({ description: 'Liquidar cesantías', default: false })
  @IsOptional()
  @IsBoolean()
  liquidate_cesantias?: boolean;

  @ApiPropertyOptional({ description: 'Liquidar intereses de cesantías', default: false })
  @IsOptional()
  @IsBoolean()
  liquidate_cesantias_interest?: boolean;

  @ApiPropertyOptional({ description: 'Liquidar vacaciones', default: false })
  @IsOptional()
  @IsBoolean()
  liquidate_vacaciones?: boolean;

  @ApiPropertyOptional({ description: 'IDs de empleados a incluir (si no se envía, se agregan después)' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  employee_ids?: string[];

  @ApiPropertyOptional({
    description: 'Razón de terminación (solo para liquidaciones tipo TERMINACION)',
    enum: ['SIN_JUSTA_CAUSA', 'JUSTA_CAUSA', 'MUTUO_ACUERDO', 'RENUNCIA', 'VENCIMIENTO_CONTRATO'],
  })
  @IsOptional()
  @IsEnum(['SIN_JUSTA_CAUSA', 'JUSTA_CAUSA', 'MUTUO_ACUERDO', 'RENUNCIA', 'VENCIMIENTO_CONTRATO'] as const)
  termination_reason?: string;

  @ApiPropertyOptional({ description: 'Observaciones' })
  @IsOptional()
  @IsString()
  notes?: string;
}
