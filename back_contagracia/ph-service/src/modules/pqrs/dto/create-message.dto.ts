import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsIn, IsBoolean } from 'class-validator';

export class CreateMessageDto {
  @ApiProperty({ description: 'Contenido del mensaje (HTML)' })
  @IsString()
  content: string;

  @ApiPropertyOptional({
    description: 'Tipo de remitente: admin o resident',
    default: 'admin',
  })
  @IsIn(['admin', 'resident'])
  @IsOptional()
  sender_type?: string;

  @ApiPropertyOptional({
    description: 'Enviar email al destinatario',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  send_email?: boolean;
}
