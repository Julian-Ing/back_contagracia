import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsDateString, IsNotEmpty, IsIn } from 'class-validator';

export class CreateBankMovementDto {
  @ApiProperty({ description: 'ID de la cuenta bancaria' })
  @IsString()
  @IsNotEmpty()
  bank_account_id: string;

  @ApiProperty({ description: 'Fecha de la transacción (YYYY-MM-DD)' })
  @IsDateString()
  transaction_date: string;

  @ApiProperty({ description: 'Monto (siempre positivo)' })
  @IsNumber()
  amount: number;

  @ApiProperty({ description: 'Dirección del movimiento', enum: ['INCOME', 'EXPENSE'] })
  @IsString()
  @IsIn(['INCOME', 'EXPENSE'])
  direction: 'INCOME' | 'EXPENSE';

  @ApiProperty({ description: 'Tipo de movimiento' })
  @IsString()
  @IsNotEmpty()
  type_key: string;

  @ApiPropertyOptional({ description: 'Descripción del movimiento' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'ID del documento de referencia' })
  @IsString()
  @IsOptional()
  reference_id?: string;

  @ApiPropertyOptional({ description: 'Tipo del documento de referencia' })
  @IsString()
  @IsOptional()
  reference_type?: string;

  @ApiPropertyOptional({ description: 'Consecutivo del documento de referencia' })
  @IsString()
  @IsOptional()
  reference_consecutive?: string;
}
