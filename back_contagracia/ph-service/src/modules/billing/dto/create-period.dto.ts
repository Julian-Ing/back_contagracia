import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsOptional, Min, Max } from 'class-validator';

export class CreatePeriodDto {
  @ApiProperty({ description: 'ID del condominio' })
  @IsString()
  @IsNotEmpty()
  condominium_id: string;

  @ApiProperty({ description: 'Nombre del periodo (ej: "Enero 2025")' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Ano del periodo', example: 2025 })
  @IsNumber()
  year: number;

  @ApiProperty({ description: 'Mes del periodo (1-12)', example: 1 })
  @IsNumber()
  @Min(1)
  @Max(12)
  month: number;

  @ApiPropertyOptional({ description: 'Fecha limite de pago' })
  @IsString()
  @IsOptional()
  due_date?: string;

  @ApiPropertyOptional({ description: 'Notas adicionales del periodo' })
  @IsString()
  @IsOptional()
  notes?: string;
}
