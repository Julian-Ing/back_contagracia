import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ValidateNested, IsString, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

class SectionOrderItem {
  @ApiProperty({ description: 'ID de la sección' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Nuevo orden de visualización' })
  @IsInt()
  display_order: number;
}

export class ReorderSectionsDto {
  @ApiProperty({
    description: 'Array de secciones con su nuevo orden',
    type: [SectionOrderItem],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SectionOrderItem)
  sections: SectionOrderItem[];
}
