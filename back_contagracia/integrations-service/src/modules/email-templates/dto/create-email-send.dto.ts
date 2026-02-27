import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class CreateEmailSendDto {
  @ApiPropertyOptional({ description: 'ID de la plantilla' })
  @IsUUID()
  @IsOptional()
  template_id?: string;

  @ApiPropertyOptional({ description: 'ID del tercero (contacto)' })
  @IsUUID()
  @IsOptional()
  third_party_id?: string;

  @ApiPropertyOptional({ description: 'ID de la campaña' })
  @IsUUID()
  @IsOptional()
  campaign_id?: string;

  @ApiProperty({ description: 'Asunto del correo' })
  @IsString()
  @IsNotEmpty()
  subject: string;

  @ApiProperty({ description: 'Cuerpo HTML del correo' })
  @IsString()
  @IsNotEmpty()
  body_html: string;
}
