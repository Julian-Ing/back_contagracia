import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray } from 'class-validator';

export class CreateVoteDto {
  @ApiProperty({ description: 'Título del tema de votación', example: 'Aprobación del presupuesto 2026' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Descripción del tema' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Tipo: yes_no, multiple_choice',
    example: 'yes_no',
    default: 'yes_no',
  })
  @IsString()
  @IsOptional()
  vote_type?: string;

  @ApiPropertyOptional({
    description: 'Opciones para multiple_choice (array JSON)',
    example: ['Opción A', 'Opción B', 'Opción C'],
  })
  @IsArray()
  @IsOptional()
  options?: string[];
}
