import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMinutaEntryDto {
  @ApiProperty({ description: 'ID de la copropiedad' })
  @IsString()
  condominium_id: string;

  @ApiProperty({
    description: 'Tipo de entrada',
    enum: ['novedad', 'observacion', 'incidente', 'mantenimiento'],
  })
  @IsString()
  entry_type: string;

  @ApiProperty({ description: 'Título de la novedad' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Descripción detallada' })
  @IsString()
  body: string;

  @ApiPropertyOptional({
    description: 'Turno',
    enum: ['mañana', 'tarde', 'noche'],
  })
  @IsOptional()
  @IsString()
  shift?: string;
}

export class UpdateMinutaEntryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  entry_type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  body?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shift?: string;
}
