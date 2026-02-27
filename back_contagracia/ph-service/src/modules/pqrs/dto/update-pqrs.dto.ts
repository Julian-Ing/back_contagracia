import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEmail, IsIn, IsUUID } from 'class-validator';

export class UpdatePqrsDto {
  @ApiPropertyOptional({ description: 'ID de la unidad' })
  @IsUUID()
  @IsOptional()
  unit_id?: string;

  @ApiPropertyOptional({ description: 'ID del tercero' })
  @IsUUID()
  @IsOptional()
  tercero_id?: string;

  @ApiPropertyOptional({ description: 'Título' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ description: 'Descripción' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Tipo: petition, complaint, claim, suggestion' })
  @IsIn(['petition', 'complaint', 'claim', 'suggestion'])
  @IsOptional()
  type?: string;

  @ApiPropertyOptional({ description: 'Prioridad: low, medium, high, urgent' })
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
