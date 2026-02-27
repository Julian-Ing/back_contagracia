import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSiteSettingDto {
  @ApiPropertyOptional({ description: 'Valor del setting (null para limpiar)' })
  @IsOptional()
  @IsString()
  value?: string | null;
}
