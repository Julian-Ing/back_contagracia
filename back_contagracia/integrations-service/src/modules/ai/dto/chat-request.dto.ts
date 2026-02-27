import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChatRequestDto {
  @ApiProperty({ description: 'ID de la sesión de chat' })
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @ApiProperty({ description: 'Pregunta del usuario' })
  @IsString()
  @IsNotEmpty()
  prompt: string;

  @ApiPropertyOptional({ description: 'ID del módulo (general, crm, etc.)' })
  @IsString()
  @IsOptional()
  moduleId?: string;

  @ApiPropertyOptional({ description: 'Ruta actual del dashboard' })
  @IsString()
  @IsOptional()
  route?: string;
}
