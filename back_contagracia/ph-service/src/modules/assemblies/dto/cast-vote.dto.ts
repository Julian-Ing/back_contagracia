import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class CastVoteDto {
  @ApiProperty({ description: 'Opción seleccionada (yes/no/abstain o la opción elegida)', example: 'yes' })
  @IsString()
  selected_option: string;

  @ApiPropertyOptional({ description: 'ID del tercero que vota' })
  @IsString()
  @IsOptional()
  tercero_id?: string;

  @ApiPropertyOptional({ description: 'ID de la unidad' })
  @IsString()
  @IsOptional()
  unit_id?: string;

  @ApiPropertyOptional({ description: 'Nombre del residente' })
  @IsString()
  @IsOptional()
  resident_name?: string;

  @ApiPropertyOptional({ description: 'Etiqueta de la unidad' })
  @IsString()
  @IsOptional()
  unit_label?: string;
}
