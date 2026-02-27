import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsBoolean, Min, Max } from 'class-validator';

export class UpdateTaxDto {
  @ApiPropertyOptional({ description: 'Nombre del impuesto' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Tasa porcentual' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  rate?: number;

  @ApiPropertyOptional({ description: 'Monto fijo por unidad (solo INC Bolsas)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  per_unit_amount?: number | null;

  @ApiPropertyOptional({ description: 'Descripción' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'IVA como mayor costo' })
  @IsOptional()
  @IsBoolean()
  is_cost_tax?: boolean;

  @ApiPropertyOptional({ description: 'Estado activo/inactivo' })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  // Cuentas contables (requiere permiso accounting.tax.accounts.assign)
  @ApiPropertyOptional({ description: 'Cuenta de impuesto en ventas' })
  @IsOptional()
  @IsString()
  tax_sales_account_code?: string | null;

  @ApiPropertyOptional({ description: 'Cuenta de impuesto en compras' })
  @IsOptional()
  @IsString()
  tax_purchases_account_code?: string | null;

  @ApiPropertyOptional({ description: 'Cuenta de impuesto en costos' })
  @IsOptional()
  @IsString()
  tax_cost_account_code?: string | null;

  @ApiPropertyOptional({ description: 'Cuenta de retención en ventas (a favor)' })
  @IsOptional()
  @IsString()
  withholding_sales_account_code?: string | null;

  @ApiPropertyOptional({ description: 'Cuenta de retención en compras (por pagar)' })
  @IsOptional()
  @IsString()
  withholding_purchases_account_code?: string | null;
}
