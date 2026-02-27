import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  MaxLength,
} from 'class-validator';

export class SendBroadcastDto {
  @ApiProperty({ example: 'Nueva funcionalidad disponible' })
  @IsString()
  @MaxLength(100)
  title: string;

  @ApiProperty({ example: 'Hemos implementado una nueva función...' })
  @IsString()
  @MaxLength(500)
  message: string;

  @ApiProperty({ example: 'admin_announcement' })
  @IsString()
  type: string;

  @ApiPropertyOptional({ example: '/dashboard/settings' })
  @IsString()
  @IsOptional()
  action_url?: string;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  send_to_all?: boolean;

  @ApiPropertyOptional({ example: ['uuid-1', 'uuid-2'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  company_ids?: string[];
}
