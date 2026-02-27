import { IsString, IsOptional, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendWhatsappTemplateDto {
  @ApiProperty({ description: 'ID del contacto (ThirdParty)' })
  @IsString()
  third_party_id: string;

  @ApiProperty({ description: 'ID del template en la DB' })
  @IsString()
  template_id: string;

  @ApiProperty({ description: 'Variables manuales (override al mapping automático)', required: false })
  @IsObject()
  @IsOptional()
  variables?: Record<string, string>;

  @ApiProperty({ description: 'ID de la conversación existente (opcional)', required: false })
  @IsString()
  @IsOptional()
  conversation_id?: string;
}
