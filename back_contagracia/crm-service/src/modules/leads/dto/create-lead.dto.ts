import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsUUID } from 'class-validator';

export enum LeadSource {
  WEB = 'WEB',
  SOCIAL = 'SOCIAL',
  REFERRAL = 'REFERRAL',
  ADS = 'ADS',
  MANUAL = 'MANUAL',
  WHATSAPP = 'WHATSAPP',
  EMAIL = 'EMAIL',
  FORM = 'FORM',
  IMPORT = 'IMPORT',
  OTHER = 'OTHER',
}

export enum LeadStage {
  NEW = 'NEW',
  CONTACTED = 'CONTACTED',
  QUALIFIED = 'QUALIFIED',
  LOST = 'LOST',
  CONVERTED = 'CONVERTED',
}

export class CreateLeadDto {
  @ApiProperty({ description: 'ID del tercero (contacto) asociado' })
  @IsUUID()
  @IsNotEmpty()
  third_party_id: string;

  @ApiProperty({ description: 'Fuente del lead', enum: LeadSource })
  @IsEnum(LeadSource)
  @IsNotEmpty()
  source: LeadSource;

  @ApiPropertyOptional({ description: 'ID de la campana' })
  @IsUUID()
  @IsOptional()
  campaign_id?: string;

  @ApiPropertyOptional({ description: 'ID del usuario asignado' })
  @IsUUID()
  @IsOptional()
  assigned_to?: string;

  @ApiPropertyOptional({ description: 'Etapa del lead', enum: LeadStage, default: LeadStage.NEW })
  @IsEnum(LeadStage)
  @IsOptional()
  stage?: LeadStage;
}
