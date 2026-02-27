import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateDocumentCategoryDto } from './create-document-category.dto';

export class UpdateDocumentCategoryDto extends PartialType(CreateDocumentCategoryDto) {
  @ApiPropertyOptional({ description: 'Activa/desactiva la categoría' })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
