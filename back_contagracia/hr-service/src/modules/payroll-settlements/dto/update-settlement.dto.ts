import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsDateString,
  IsBoolean,
  IsInt,
  Min,
  Max,
} from 'class-validator';

export class UpdateSettlementDto {
  @ApiPropertyOptional({ description: 'Nombre de la liquidación' })
  @IsOptional()
  @IsString()
  settlement_name?: string;

  @ApiPropertyOptional({ description: 'Fecha inicio del periodo (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @ApiPropertyOptional({ description: 'Fecha fin del periodo (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  end_date?: string;

  @ApiPropertyOptional({ description: 'Fecha de pago (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  payment_date?: string;

  @ApiPropertyOptional({ description: 'Número de periodo en el mes' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(4)
  period_number?: number;

  @ApiPropertyOptional({ description: 'Liquidar prima de servicios' })
  @IsOptional()
  @IsBoolean()
  liquidate_prima?: boolean;

  @ApiPropertyOptional({ description: 'Liquidar cesantías' })
  @IsOptional()
  @IsBoolean()
  liquidate_cesantias?: boolean;

  @ApiPropertyOptional({ description: 'Liquidar intereses de cesantías' })
  @IsOptional()
  @IsBoolean()
  liquidate_cesantias_interest?: boolean;

  @ApiPropertyOptional({ description: 'Liquidar vacaciones' })
  @IsOptional()
  @IsBoolean()
  liquidate_vacaciones?: boolean;

  @ApiPropertyOptional({ description: 'Observaciones' })
  @IsOptional()
  @IsString()
  notes?: string;
}
