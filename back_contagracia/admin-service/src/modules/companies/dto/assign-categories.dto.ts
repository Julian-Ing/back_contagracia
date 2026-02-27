import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';

export class AssignCategoriesDto {
  @ApiProperty({
    description: 'Lista de IDs de categorías a asignar (reemplaza las existentes)',
    example: ['uuid-cat-1', 'uuid-cat-2'],
  })
  @IsArray()
  @IsString({ each: true })
  category_ids: string[];
}
