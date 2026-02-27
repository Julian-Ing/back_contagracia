import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsUUID, IsDateString, IsOptional, IsInt, Min, Max, IsNumber } from 'class-validator';

export class CreateEvaluationDto {
  @ApiProperty({ description: 'ID del tercero (empleado)' })
  @IsUUID()
  @IsNotEmpty()
  third_party_id: string;

  @ApiProperty({ description: 'Periodo de evaluacion (ej: 2026-Q1, 2026-01)' })
  @IsString()
  @IsNotEmpty()
  evaluation_period: string;

  @ApiProperty({ description: 'Fecha de la evaluacion (YYYY-MM-DD)' })
  @IsDateString()
  @IsNotEmpty()
  evaluation_date: string;

  @ApiPropertyOptional({ description: 'Puntaje de asistencia (1-5)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  attendance_score?: number;

  @ApiPropertyOptional({ description: 'Puntaje de desempeno (1-5)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  performance_score?: number;

  @ApiPropertyOptional({ description: 'Puntaje de actitud (1-5)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  attitude_score?: number;

  @ApiPropertyOptional({ description: 'Puntaje general (promedio ponderado)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  overall_score?: number;

  @ApiPropertyOptional({ description: 'Fortalezas' })
  @IsOptional()
  @IsString()
  strengths?: string;

  @ApiPropertyOptional({ description: 'Areas de mejora' })
  @IsOptional()
  @IsString()
  areas_for_improvement?: string;

  @ApiPropertyOptional({ description: 'Objetivos para el proximo periodo' })
  @IsOptional()
  @IsString()
  goals_next_period?: string;

  @ApiPropertyOptional({ description: 'Comentarios del evaluador' })
  @IsOptional()
  @IsString()
  evaluator_comments?: string;

  @ApiPropertyOptional({ description: 'Comentarios del empleado' })
  @IsOptional()
  @IsString()
  employee_comments?: string;
}
