import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';
import { CreateMaintenancePlanDto } from './create-maintenance-plan.dto';

export class UpdateMaintenancePlanDto extends PartialType(CreateMaintenancePlanDto) {
  @ApiPropertyOptional({ description: 'Estado: active, paused, completed' })
  @IsString()
  @IsOptional()
  status?: string;
}
