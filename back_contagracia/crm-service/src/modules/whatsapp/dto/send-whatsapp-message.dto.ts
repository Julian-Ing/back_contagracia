import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendWhatsappMessageDto {
  @ApiProperty({ description: 'ID del contacto (ThirdParty)' })
  @IsString()
  third_party_id: string;

  @ApiProperty({ description: 'ID de la conversación existente (opcional)', required: false })
  @IsString()
  @IsOptional()
  conversation_id?: string;

  @ApiProperty({ description: 'Cuerpo del mensaje', required: false })
  @IsString()
  @IsOptional()
  body?: string;

  @ApiProperty({ description: 'URL del media adjunto', required: false })
  @IsString()
  @IsOptional()
  media_url?: string;

  @ApiProperty({ description: 'Content type del media', required: false })
  @IsString()
  @IsOptional()
  media_content_type?: string;
}
