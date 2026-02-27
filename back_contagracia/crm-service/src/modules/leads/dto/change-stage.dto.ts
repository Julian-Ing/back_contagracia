import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { LeadStage } from './create-lead.dto';

export class ChangeLeadStageDto {
  @ApiProperty({ description: 'Nueva etapa del lead', enum: LeadStage })
  @IsEnum(LeadStage)
  @IsNotEmpty()
  stage: LeadStage;
}
