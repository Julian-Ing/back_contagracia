import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, Min, Max } from 'class-validator';

export class UpdatePeriodDto {
  @ApiPropertyOptional({ description: 'Nombre del periodo' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Ano del periodo' })
  @IsNumber()
  @IsOptional()
  year?: number;

  @ApiPropertyOptional({ description: 'Mes del periodo (1-12)' })
  @IsNumber()
  @Min(1)
  @Max(12)
  @IsOptional()
  month?: number;

  @ApiPropertyOptional({ description: 'Fecha limite de pago' })
  @IsString()
  @IsOptional()
  due_date?: string;

  @ApiPropertyOptional({ description: 'Notas adicionales del periodo' })
  @IsString()
  @IsOptional()
  notes?: string;
}
