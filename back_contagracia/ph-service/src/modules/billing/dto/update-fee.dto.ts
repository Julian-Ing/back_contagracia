import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional } from 'class-validator';

export class UpdateFeeDto {
  @ApiPropertyOptional({ description: 'Monto del cobro' })
  @IsNumber()
  @IsOptional()
  amount?: number;

  @ApiPropertyOptional({ description: 'Estado del cobro (pending, paid, partial, overdue, cancelled)' })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: 'Notas adicionales' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: 'Fecha limite de pago' })
  @IsString()
  @IsOptional()
  due_date?: string;

  @ApiPropertyOptional({ description: 'Fecha de pago' })
  @IsString()
  @IsOptional()
  paid_at?: string;
}
