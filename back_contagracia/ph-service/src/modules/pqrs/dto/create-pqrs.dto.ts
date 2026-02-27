import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEmail, IsIn, IsUUID } from 'class-validator';

export class CreatePqrsDto {
  @ApiProperty({ description: 'ID de la copropiedad' })
  @IsUUID()
  condominium_id: string;

  @ApiPropertyOptional({ description: 'ID de la unidad' })
  @IsUUID()
  @IsOptional()
  unit_id?: string;

  @ApiPropertyOptional({ description: 'ID del tercero que reporta' })
  @IsUUID()
  @IsOptional()
  tercero_id?: string;

  @ApiProperty({ description: 'Título del PQRS' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Descripción detallada' })
  @IsString()
  description: string;

  @ApiPropertyOptional({
    description: 'Tipo: petition, complaint, claim, suggestion',
    default: 'petition',
  })
  @IsIn(['petition', 'complaint', 'claim', 'suggestion'])
  @IsOptional()
  type?: string;

  @ApiPropertyOptional({
    description: 'Prioridad: low, medium, high, urgent',
    default: 'medium',
  })
  @IsIn(['low', 'medium', 'high', 'urgent'])
  @IsOptional()
  priority?: string;

  @ApiPropertyOptional({ description: 'Nombre del contacto' })
  @IsString()
  @IsOptional()
  contact_name?: string;

  @ApiPropertyOptional({ description: 'Email del contacto' })
  @IsEmail()
  @IsOptional()
  contact_email?: string;

  @ApiPropertyOptional({ description: 'Teléfono del contacto' })
  @IsString()
  @IsOptional()
  contact_phone?: string;
}
