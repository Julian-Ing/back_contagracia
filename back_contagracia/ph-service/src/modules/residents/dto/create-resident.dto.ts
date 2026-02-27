import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsIn, IsDateString } from 'class-validator';

export class CreateResidentDto {
  @ApiProperty({ description: 'ID de la unidad' })
  @IsString()
  @IsNotEmpty()
  unit_id: string;

  @ApiProperty({ description: 'ID del tercero (residente)' })
  @IsString()
  @IsNotEmpty()
  tercero_id: string;

  @ApiProperty({ description: 'Tipo de residente', enum: ['owner', 'tenant'] })
  @IsString()
  @IsNotEmpty()
  @IsIn(['owner', 'tenant'])
  resident_type: string;

  @ApiPropertyOptional({ description: 'Es residente principal' })
  @IsBoolean()
  @IsOptional()
  is_primary?: boolean;

  @ApiPropertyOptional({ description: 'Fecha de ingreso (ISO 8601)' })
  @IsDateString()
  @IsOptional()
  move_in_date?: string;

  @ApiPropertyOptional({ description: 'Notas adicionales' })
  @IsString()
  @IsOptional()
  notes?: string;
}
