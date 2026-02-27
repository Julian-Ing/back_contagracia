import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  IsDateString,
  IsUUID,
} from 'class-validator';

export class CreateTravelExpenseDto {
  @ApiProperty({ description: 'ID del perfil de empleado' })
  @IsUUID()
  @IsNotEmpty()
  third_party_id: string;

  @ApiProperty({
    description: 'Categoria del viatico',
    enum: [
      'BUSINESS_TRIP',
      'TRAINING',
      'CLIENT_MEETING',
      'CONFERENCE',
      'PROJECT_VISIT',
      'AUDIT',
      'RECRUITMENT',
      'MAINTENANCE',
      'SALES_VISIT',
      'OTHER',
    ],
  })
  @IsString()
  @IsNotEmpty()
  expense_category: string;

  @ApiProperty({ description: 'Motivo del viaje' })
  @IsString()
  @IsNotEmpty()
  travel_purpose: string;

  @ApiProperty({ description: 'Destino del viaje' })
  @IsString()
  @IsNotEmpty()
  destination: string;

  @ApiProperty({ description: 'Fecha de inicio (YYYY-MM-DD)' })
  @IsDateString()
  @IsNotEmpty()
  start_date: string;

  @ApiProperty({ description: 'Fecha de fin (YYYY-MM-DD)' })
  @IsDateString()
  @IsNotEmpty()
  end_date: string;

  @ApiProperty({ description: 'Monto asignado (anticipo)' })
  @IsNumber()
  @Min(0.01)
  assigned_amount: number;

  @ApiProperty({ description: 'ID del centro de costo', required: false })
  @IsOptional()
  @IsUUID()
  cost_center_id?: string;

  @ApiProperty({ description: 'Notas adicionales', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class RequestTravelExpenseDto {
  @ApiProperty({
    description: 'Categoria del viatico',
    enum: [
      'BUSINESS_TRIP',
      'TRAINING',
      'CLIENT_MEETING',
      'CONFERENCE',
      'PROJECT_VISIT',
      'AUDIT',
      'RECRUITMENT',
      'MAINTENANCE',
      'SALES_VISIT',
      'OTHER',
    ],
  })
  @IsString()
  @IsNotEmpty()
  expense_category: string;

  @ApiProperty({ description: 'Motivo del viaje' })
  @IsString()
  @IsNotEmpty()
  travel_purpose: string;

  @ApiProperty({ description: 'Destino del viaje' })
  @IsString()
  @IsNotEmpty()
  destination: string;

  @ApiProperty({ description: 'Fecha de inicio (YYYY-MM-DD)' })
  @IsDateString()
  @IsNotEmpty()
  start_date: string;

  @ApiProperty({ description: 'Fecha de fin (YYYY-MM-DD)' })
  @IsDateString()
  @IsNotEmpty()
  end_date: string;

  @ApiProperty({ description: 'Monto asignado (anticipo)' })
  @IsNumber()
  @Min(0.01)
  assigned_amount: number;

  @ApiProperty({ description: 'ID del centro de costo', required: false })
  @IsOptional()
  @IsUUID()
  cost_center_id?: string;

  @ApiProperty({ description: 'Notas adicionales', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
