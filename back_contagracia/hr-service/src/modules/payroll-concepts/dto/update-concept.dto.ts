import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateConceptDto {
  @ApiPropertyOptional({ description: 'Código cuenta contable débito operativo' })
  @IsOptional()
  @IsString()
  debit_account_code?: string;

  @ApiPropertyOptional({ description: 'Código cuenta contable débito administrativo' })
  @IsOptional()
  @IsString()
  administrative_debit_account_code?: string;

  @ApiPropertyOptional({ description: 'Código cuenta contable crédito' })
  @IsOptional()
  @IsString()
  credit_account_code?: string;

  @ApiPropertyOptional({ description: 'Valor por defecto' })
  @IsOptional()
  @IsString()
  default_value?: string;

  @ApiPropertyOptional({ description: 'Porcentaje por defecto' })
  @IsOptional()
  @IsString()
  default_percentage?: string;
}
