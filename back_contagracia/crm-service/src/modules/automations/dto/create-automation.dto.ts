import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsUUID, IsObject } from 'class-validator';

export class CreateAutomationDto {
  @ApiProperty({ description: 'Evento disparador' })
  @IsString()
  @IsNotEmpty()
  trigger_event: string;

  @ApiProperty({ description: 'Tipo de acción' })
  @IsString()
  @IsNotEmpty()
  action_type: string;

  @ApiProperty({ description: 'Configuración de la acción' })
  @IsObject()
  @IsNotEmpty()
  action_config: any;

  @ApiPropertyOptional({ description: 'ID del formulario (solo para automatizaciones de formulario)' })
  @IsUUID()
  @IsOptional()
  form_id?: string;
}
