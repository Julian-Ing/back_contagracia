import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsDateString } from 'class-validator';

export class QueryTravelExpensesDto {
  @ApiProperty({ description: 'Filtrar por empleado', required: false })
  @IsOptional()
  @IsString()
  third_party_id?: string;

  @ApiProperty({
    description: 'Filtrar por estado (PENDING, APPROVED, REJECTED, IN_PROGRESS, PENDING_LEGALIZATION, LEGALIZED, CANCELLED)',
    required: false,
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({
    description: 'Filtrar por categoria de viatico',
    required: false,
  })
  @IsOptional()
  @IsString()
  expense_category?: string;

  @ApiProperty({ description: 'Fecha inicio del rango', required: false })
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @ApiProperty({ description: 'Fecha fin del rango', required: false })
  @IsOptional()
  @IsDateString()
  end_date?: string;

  @ApiProperty({ description: 'Registros a saltar', required: false })
  @IsOptional()
  @IsString()
  skip?: string;

  @ApiProperty({ description: 'Registros a tomar', required: false })
  @IsOptional()
  @IsString()
  take?: string;
}
