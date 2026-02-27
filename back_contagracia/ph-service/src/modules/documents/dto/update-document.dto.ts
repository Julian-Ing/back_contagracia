import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';
import { CreateDocumentDto } from './create-document.dto';

export class UpdateDocumentDto extends PartialType(CreateDocumentDto) {
  @ApiPropertyOptional({ description: 'Estado: active, archived' })
  @IsString()
  @IsOptional()
  status?: string;
}
