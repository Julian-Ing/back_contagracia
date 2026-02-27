import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsDateString,
} from 'class-validator';

export class UpdateReservationDto {
  @ApiProperty({ description: 'ID de la unidad que reserva', required: false })
  @IsOptional()
  @IsString()
  unit_id?: string;

  @ApiProperty({ description: 'ID del tercero que reserva', required: false })
  @IsOptional()
  @IsString()
  tercero_id?: string;

  @ApiProperty({ description: 'Fecha de la reserva (YYYY-MM-DD)', required: false })
  @IsOptional()
  @IsDateString()
  reservation_date?: string;

  @ApiProperty({ description: 'Hora de inicio (ej: "14:00")', required: false })
  @IsOptional()
  @IsString()
  start_time?: string;

  @ApiProperty({ description: 'Hora de fin (ej: "18:00")', required: false })
  @IsOptional()
  @IsString()
  end_time?: string;

  @ApiProperty({ description: 'Notas adicionales', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
