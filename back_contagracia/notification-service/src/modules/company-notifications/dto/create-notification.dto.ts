import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateNotificationDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  company_id: string;

  @ApiProperty({ example: 'tax_reminder' })
  @IsString()
  type: string;

  @ApiProperty({ example: '📅 Recordatorio tributario' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'IVA vence en 5 días' })
  @IsString()
  message: string;

  @ApiPropertyOptional({ example: '/dashboard/tax-calendar' })
  @IsString()
  @IsOptional()
  action_url?: string;

  @ApiPropertyOptional({ description: 'ID del usuario que NO debe ver esta notificación (evita auto-notificaciones)' })
  @IsString()
  @IsOptional()
  exclude_user_id?: string;
}
