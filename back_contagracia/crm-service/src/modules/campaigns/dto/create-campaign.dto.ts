import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsDateString,
  IsNumber,
  IsObject,
} from 'class-validator';
import { Transform } from 'class-transformer';

export enum CampaignChannel {
  EMAIL = 'EMAIL',
  SOCIAL = 'SOCIAL',
  ADS = 'ADS',
  MANUAL = 'MANUAL',
  WEB = 'WEB',
  WHATSAPP = 'WHATSAPP',
}

export enum CampaignStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  FINISHED = 'FINISHED',
}

export class CreateCampaignDto {
  @ApiProperty({ description: 'Nombre de la campaña' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Canal de la campaña', enum: CampaignChannel })
  @IsEnum(CampaignChannel)
  channel: CampaignChannel;

  @ApiProperty({ description: 'Fecha de inicio' })
  @IsDateString()
  start_date: string;

  @ApiPropertyOptional({ description: 'Descripción de la campaña' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Fecha de fin' })
  @IsDateString()
  @IsOptional()
  end_date?: string;

  @ApiPropertyOptional({ description: 'Presupuesto' })
  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  budget?: number;

  @ApiPropertyOptional({ description: 'Audiencia objetivo' })
  @IsObject()
  @IsOptional()
  target_audience?: any;

  @ApiPropertyOptional({ description: 'Estado de la campaña', enum: CampaignStatus })
  @IsEnum(CampaignStatus)
  @IsOptional()
  status?: CampaignStatus;

  @ApiPropertyOptional({ description: 'SID de template de WhatsApp' })
  @IsString()
  @IsOptional()
  whatsapp_template_sid?: string;

  @ApiPropertyOptional({ description: 'Parámetros del template de WhatsApp' })
  @IsObject()
  @IsOptional()
  whatsapp_template_params?: any;
}
