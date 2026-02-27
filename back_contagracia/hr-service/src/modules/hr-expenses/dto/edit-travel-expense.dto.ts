import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, Min, IsDateString } from 'class-validator';

export class EditTravelExpenseDto {
  @ApiProperty({ description: 'Categoria del viatico', required: false })
  @IsOptional()
  @IsString()
  expense_category?: string;

  @ApiProperty({ description: 'Motivo del viaje', required: false })
  @IsOptional()
  @IsString()
  travel_purpose?: string;

  @ApiProperty({ description: 'Destino del viaje', required: false })
  @IsOptional()
  @IsString()
  destination?: string;

  @ApiProperty({ description: 'Fecha de inicio (YYYY-MM-DD)', required: false })
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @ApiProperty({ description: 'Fecha de fin (YYYY-MM-DD)', required: false })
  @IsOptional()
  @IsDateString()
  end_date?: string;

  @ApiProperty({ description: 'Monto asignado (anticipo)', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  assigned_amount?: number;

  @ApiProperty({ description: 'ID del centro de costo', required: false })
  @IsOptional()
  @IsString()
  cost_center_id?: string;

  @ApiProperty({ description: 'Notas adicionales', required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ description: 'Notas del administrador', required: false })
  @IsOptional()
  @IsString()
  admin_notes?: string;
}

export class RejectTravelExpenseDto {
  @ApiProperty({ description: 'Razon del rechazo' })
  @IsString()
  rejection_reason: string;
}

export class ApproveTravelExpenseDto {
  @ApiProperty({ description: 'Notas del administrador', required: false })
  @IsOptional()
  @IsString()
  admin_notes?: string;
}
