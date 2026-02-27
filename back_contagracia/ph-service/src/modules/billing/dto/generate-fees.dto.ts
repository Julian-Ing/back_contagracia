import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsString, IsNotEmpty, IsOptional, ArrayMinSize } from 'class-validator';

export class GenerateFeesDto {
  @ApiProperty({
    description: 'IDs de los conceptos de cobro a generar',
    type: [String],
    example: ['uuid-concept-1', 'uuid-concept-2'],
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  @IsNotEmpty({ each: true })
  fee_concept_ids: string[];

  @ApiPropertyOptional({ description: 'ID del condominio para filtrar unidades' })
  @IsString()
  @IsOptional()
  condominium_id?: string;
}
