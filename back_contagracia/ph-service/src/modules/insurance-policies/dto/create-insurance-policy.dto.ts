import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  Min,
} from 'class-validator';

export class CreateInsurancePolicyDto {
  @ApiProperty({ description: 'ID de la copropiedad' })
  @IsString()
  condominium_id: string;

  @ApiPropertyOptional({ description: 'ID del tercero (SUPPLIER) aseguradora' })
  @IsString()
  @IsOptional()
  insurance_third_party_id?: string;

  @ApiProperty({ description: 'Numero de poliza', example: 'POL-2026-001' })
  @IsString()
  policy_number: string;

  @ApiProperty({ description: 'Nombre de la aseguradora (referencia)', example: 'Seguros Bolivar' })
  @IsString()
  insurance_company: string;

  @ApiProperty({
    description: 'Tipo de poliza (todo_riesgo, incendio, terremoto, responsabilidad_civil, otro)',
    example: 'todo_riesgo',
  })
  @IsString()
  policy_type: string;

  @ApiPropertyOptional({ description: 'Monto de cobertura', example: 500000000 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  coverage_amount?: number;

  @ApiPropertyOptional({ description: 'Prima del seguro', example: 5000000 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  premium?: number;

  @ApiProperty({ description: 'Fecha de inicio (ISO)', example: '2026-01-01' })
  @IsDateString()
  start_date: string;

  @ApiProperty({ description: 'Fecha de vencimiento (ISO)', example: '2027-01-01' })
  @IsDateString()
  end_date: string;

  @ApiPropertyOptional({ description: 'Fecha de renovacion (ISO)' })
  @IsDateString()
  @IsOptional()
  renewal_date?: string;

  @ApiPropertyOptional({ description: 'URL del documento de la poliza' })
  @IsString()
  @IsOptional()
  document_url?: string;

  @ApiPropertyOptional({ description: 'Notas adicionales' })
  @IsString()
  @IsOptional()
  notes?: string;
}
