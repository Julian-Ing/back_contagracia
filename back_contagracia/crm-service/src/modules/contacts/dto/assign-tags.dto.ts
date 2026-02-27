import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';

export class AssignTagsDto {
  @ApiProperty({ description: 'Lista de IDs de tags a asignar', type: [String] })
  @IsArray()
  @IsString({ each: true })
  tagIds: string[];
}
