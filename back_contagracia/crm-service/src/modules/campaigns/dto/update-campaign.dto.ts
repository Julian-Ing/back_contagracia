import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsNumber,
  IsObject,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { CampaignChannel, CampaignStatus } from './create-campaign.dto';

export class UpdateCampaignDto {
  @ApiPropertyOptional({ description: 'Nombre de la campaña' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Descripción de la campaña' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Canal de la campaña', enum: CampaignChannel })
  @IsEnum(CampaignChannel)
  @IsOptional()
  channel?: CampaignChannel;

  @ApiPropertyOptional({ description: 'Fecha de inicio' })
  @IsDateString()
  @IsOptional()
  start_date?: string;

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
