import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsUUID } from 'class-validator';
import { LeadSource } from './create-lead.dto';

export class UpdateLeadDto {
  @ApiPropertyOptional({ description: 'Fuente del lead', enum: LeadSource })
  @IsEnum(LeadSource)
  @IsOptional()
  source?: LeadSource;

  @ApiPropertyOptional({ description: 'ID de la campana' })
  @IsUUID()
  @IsOptional()
  campaign_id?: string;

  @ApiPropertyOptional({ description: 'ID del usuario asignado' })
  @IsUUID()
  @IsOptional()
  assigned_to?: string;
}
