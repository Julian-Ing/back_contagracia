import { PartialType } from '@nestjs/swagger';
import { CreateInsurancePolicyDto } from './create-insurance-policy.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class UpdateInsurancePolicyDto extends PartialType(CreateInsurancePolicyDto) {
  @ApiPropertyOptional({ description: 'Estado: active, expired, cancelled' })
  @IsString()
  @IsOptional()
  status?: string;
}
