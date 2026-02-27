import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsDateString, IsEnum, IsInt, Min, Max, IsNumber } from 'class-validator';

export class UpdateEvaluationDto {
  @ApiPropertyOptional({ description: 'Periodo de evaluacion' })
  @IsOptional()
  @IsString()
  evaluation_period?: string;

  @ApiPropertyOptional({ description: 'Fecha de la evaluacion (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  evaluation_date?: string;

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
