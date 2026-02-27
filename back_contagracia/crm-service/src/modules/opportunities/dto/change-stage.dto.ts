import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class ChangeOpportunityStageDto {
  @ApiProperty({ description: 'ID de la nueva etapa' })
  @IsUUID()
  @IsNotEmpty()
  stage_id: string;

  @ApiPropertyOptional({ description: 'Razon de perdida (requerido si la etapa es de tipo perdida)' })
  @IsString()
  @IsOptional()
  lost_reason?: string;
}
