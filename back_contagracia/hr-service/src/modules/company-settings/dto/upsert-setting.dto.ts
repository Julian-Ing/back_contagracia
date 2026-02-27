import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsEnum } from 'class-validator';

export enum SettingValueType {
  NUMBER = 'number',
  DECIMAL = 'decimal',
  BOOLEAN = 'boolean',
  STRING = 'string',
  TIME = 'time',
  JSON = 'json',
}

export enum SettingCategory {
  LEGAL_PARAMS = 'legal_params',
  SOCIAL_SECURITY = 'social_security',
  OVERTIME = 'overtime',
  WORK_SCHEDULE = 'work_schedule',
  WORK_HOURS = 'work_hours',
  TRANSPORTATION = 'transportation',
  PAYROLL_NUMBERING = 'payroll_numbering',
}

export class UpsertSettingDto {
  @ApiProperty({ description: 'Valor de la configuración (como string)' })
  @IsString()
  value: string;

  @ApiPropertyOptional({ description: 'Descripción de la configuración' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class BulkUpsertSettingsDto {
  @ApiProperty({
    description: 'Lista de configuraciones a actualizar',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        category: { type: 'string' },
        key: { type: 'string' },
        value: { type: 'string' },
      },
    },
  })
  settings: Array<{
    category: string;
    key: string;
    value: string;
  }>;
}
