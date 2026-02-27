import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsUUID, IsObject } from 'class-validator';

export class CreateWhatsappMessageDto {
  @ApiPropertyOptional({ description: 'ID de la conversación' })
  @IsUUID()
  @IsOptional()
  conversation_id?: string;

  @ApiPropertyOptional({ description: 'ID del tercero (contacto)' })
  @IsUUID()
  @IsOptional()
  third_party_id?: string;

  @ApiPropertyOptional({ description: 'ID del lead' })
  @IsUUID()
  @IsOptional()
  lead_id?: string;

  @ApiPropertyOptional({ description: 'ID de la oportunidad' })
  @IsUUID()
  @IsOptional()
  opportunity_id?: string;

  @ApiPropertyOptional({ description: 'ID de la campaña' })
  @IsUUID()
  @IsOptional()
  campaign_id?: string;

  @ApiProperty({ description: 'Dirección del mensaje (INBOUND, OUTBOUND)' })
  @IsString()
  @IsNotEmpty()
  direction: string;

  @ApiProperty({ description: 'Número de teléfono' })
  @IsString()
  @IsNotEmpty()
  phone_number: string;

  @ApiProperty({ description: 'Tipo de mensaje (text, image, template, etc.)' })
  @IsString()
  @IsNotEmpty()
  message_type: string;

  @ApiProperty({ description: 'Contenido del mensaje' })
  @IsString()
  @IsNotEmpty()
  message_content: string;

  @ApiPropertyOptional({ description: 'Nombre de la plantilla' })
  @IsString()
  @IsOptional()
  template_name?: string;

  @ApiPropertyOptional({ description: 'Parámetros de la plantilla' })
  @IsObject()
  @IsOptional()
  template_params?: any;

  @ApiPropertyOptional({ description: 'ID del usuario' })
  @IsUUID()
  @IsOptional()
  user_id?: string;

  @ApiPropertyOptional({ description: 'URL del media' })
  @IsString()
  @IsOptional()
  media_url?: string;
}
