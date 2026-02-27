import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsIn, IsDateString } from 'class-validator';

export class UpdateResidentDto {
  @ApiPropertyOptional({ description: 'ID de la unidad' })
  @IsString()
  @IsOptional()
  unit_id?: string;

  @ApiPropertyOptional({ description: 'ID del tercero (residente)' })
  @IsString()
  @IsOptional()
  tercero_id?: string;

  @ApiPropertyOptional({ description: 'Tipo de residente', enum: ['owner', 'tenant'] })
  @IsString()
  @IsOptional()
  @IsIn(['owner', 'tenant'])
  resident_type?: string;

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
