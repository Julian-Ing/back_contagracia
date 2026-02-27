import { IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateTemplateMappingDto {
  @ApiProperty({
    description: 'Mapeo de variables: {"1": {"source": "contact_field", "field": "first_name"}, ...}',
    example: {
      '1': { source: 'contact_field', field: 'first_name' },
      '2': { source: 'fixed', value: 'Bienvenido' },
    },
  })
  @IsObject()
  variable_mapping: Record<string, { source: string; field?: string; value?: string }>;
}
