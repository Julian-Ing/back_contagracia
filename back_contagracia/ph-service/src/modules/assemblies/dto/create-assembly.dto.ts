import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  Min,
  Max,
} from 'class-validator';

export class CreateAssemblyDto {
  @ApiProperty({ description: 'ID de la copropiedad' })
  @IsString()
  condominium_id: string;

  @ApiProperty({ description: 'Título de la asamblea', example: 'Asamblea Ordinaria 2026' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Descripción' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Fecha de la asamblea (ISO)', example: '2026-03-15' })
  @IsDateString()
  assembly_date: string;

  @ApiProperty({ description: 'Hora de inicio (HH:MM)', example: '14:00' })
  @IsString()
  start_time: string;

  @ApiPropertyOptional({ description: 'Hora de fin (HH:MM)', example: '17:00' })
  @IsString()
  @IsOptional()
  end_time?: string;

  @ApiPropertyOptional({ description: 'Lugar de la asamblea', example: 'Salón Comunal Piso 1' })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiPropertyOptional({
    description: 'Tipo: ordinary, extraordinary',
    example: 'ordinary',
    default: 'ordinary',
  })
  @IsString()
  @IsOptional()
  assembly_type?: string;

  @ApiPropertyOptional({ description: 'Porcentaje de quórum requerido (0-100)', example: 51.5 })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  quorum_required?: number;

  @ApiPropertyOptional({ description: 'Notas adicionales' })
  @IsString()
  @IsOptional()
  notes?: string;
}
