import { IsString, IsOptional, IsDateString, IsArray, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class SingleAssignmentDto {
  @ApiProperty({ description: 'ID del empleado (ThirdParty)' })
  @IsString()
  third_party_id: string;

  @ApiProperty({ description: 'ID de la plantilla de turno' })
  @IsString()
  shift_template_id: string;

  @ApiProperty({ description: 'Fecha del turno', example: '2026-03-01' })
  @IsDateString()
  date: string;

  @ApiPropertyOptional({ description: 'Override hora inicio HH:mm' })
  @IsOptional()
  @IsString()
  custom_start_time?: string;

  @ApiPropertyOptional({ description: 'Override hora fin HH:mm' })
  @IsOptional()
  @IsString()
  custom_end_time?: string;

  @ApiPropertyOptional({ description: 'Notas' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateAssignmentDto extends SingleAssignmentDto {
  @ApiPropertyOptional({ description: 'ID de la programación' })
  @IsOptional()
  @IsString()
  schedule_id?: string;
}

export class BulkAssignmentDto {
  @ApiPropertyOptional({ description: 'ID de la programación' })
  @IsOptional()
  @IsString()
  schedule_id?: string;

  @ApiProperty({ description: 'Lista de asignaciones', type: [SingleAssignmentDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SingleAssignmentDto)
  assignments: SingleAssignmentDto[];
}
