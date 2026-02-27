import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsBoolean, Min, Max } from 'class-validator';

export class CreateTaxDto {
  @ApiProperty({ description: 'Nombre del impuesto', example: 'IVA 19%' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Tasa porcentual', example: 19 })
  @IsNumber()
  @Min(0)
  @Max(100)
  rate: number;

  @ApiPropertyOptional({ description: 'Monto fijo por unidad (solo INC Bolsas)', example: 75 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  per_unit_amount?: number;

  @ApiProperty({ description: 'ID del tipo de impuesto', example: 1 })
  @IsNumber()
  tax_type_id: number;

  @ApiPropertyOptional({ description: 'Descripción', example: 'Impuesto al valor agregado' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'IVA como mayor costo', example: false })
  @IsOptional()
  @IsBoolean()
  is_cost_tax?: boolean;

  // Cuentas contables (requiere permiso accounting.tax.accounts.assign)
  @ApiPropertyOptional({ description: 'Cuenta de impuesto en ventas', example: '240801' })
  @IsOptional()
  @IsString()
  tax_sales_account_code?: string;

  @ApiPropertyOptional({ description: 'Cuenta de impuesto en compras', example: '240802' })
  @IsOptional()
  @IsString()
  tax_purchases_account_code?: string;

  @ApiPropertyOptional({ description: 'Cuenta de impuesto en costos', example: '511595' })
  @IsOptional()
  @IsString()
  tax_cost_account_code?: string;

  @ApiPropertyOptional({ description: 'Cuenta de retención en ventas (a favor)', example: '135515' })
  @IsOptional()
  @IsString()
  withholding_sales_account_code?: string;

  @ApiPropertyOptional({ description: 'Cuenta de retención en compras (por pagar)', example: '236515' })
  @IsOptional()
  @IsString()
  withholding_purchases_account_code?: string;
}
