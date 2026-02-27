import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject, IsBoolean } from 'class-validator';

export class UpdateAutomationDto {
  @ApiPropertyOptional({ description: 'Evento disparador' })
  @IsString()
  @IsOptional()
  trigger_event?: string;

  @ApiPropertyOptional({ description: 'Tipo de acción' })
  @IsString()
  @IsOptional()
  action_type?: string;

  @ApiPropertyOptional({ description: 'Configuración de la acción' })
  @IsObject()
  @IsOptional()
  action_config?: any;

  @ApiPropertyOptional({ description: 'Está activa' })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
