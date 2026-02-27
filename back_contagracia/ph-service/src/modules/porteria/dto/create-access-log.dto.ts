import { IsString, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAccessLogDto {
  @ApiProperty({ description: 'ID de la copropiedad' })
  @IsString()
  condominium_id: string;

  @ApiProperty({
    description: 'Tipo de visita',
    enum: ['visitor', 'provider', 'resident', 'delivery'],
  })
  @IsString()
  visit_type: string;

  @ApiProperty({ description: 'Nombre del visitante' })
  @IsString()
  visitor_name: string;

  @ApiPropertyOptional({ description: 'Documento de identidad' })
  @IsOptional()
  @IsString()
  visitor_doc?: string;

  @ApiPropertyOptional({ description: 'Empresa / razón social' })
  @IsOptional()
  @IsString()
  visitor_company?: string;

  @ApiPropertyOptional({ description: 'ID de la unidad destino' })
  @IsOptional()
  @IsString()
  destination_unit_id?: string;

  @ApiPropertyOptional({ description: 'Motivo de la visita' })
  @IsOptional()
  @IsString()
  purpose?: string;

  @ApiPropertyOptional({ description: 'Observaciones' })
  @IsOptional()
  @IsString()
  notes?: string;
}
