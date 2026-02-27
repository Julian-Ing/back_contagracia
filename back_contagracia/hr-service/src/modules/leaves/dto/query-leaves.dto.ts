import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsDateString } from 'class-validator';

export class QueryLeavesDto {
  @ApiProperty({ description: 'Filtrar por empleado', required: false })
  @IsOptional()
  @IsString()
  third_party_id?: string;

  @ApiProperty({
    description: 'Filtrar por estado (PENDING, APPROVED, REJECTED, CANCELLED)',
    required: false,
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({
    description: 'Filtrar por tipo de ausencia',
    required: false,
  })
  @IsOptional()
  @IsString()
  leave_type?: string;

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
