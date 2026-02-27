import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreatePaymentDto {
  @ApiProperty({ description: 'Monto del abono', example: 50000 })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiPropertyOptional({ description: 'Método de pago (efectivo, transferencia, consignación)' })
  @IsString()
  @IsOptional()
  payment_method?: string;

  @ApiPropertyOptional({ description: 'Referencia o número de comprobante' })
  @IsString()
  @IsOptional()
  reference?: string;

  @ApiPropertyOptional({ description: 'Notas adicionales' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: 'URL del soporte/comprobante' })
  @IsString()
  @IsOptional()
  receipt_url?: string;
}
