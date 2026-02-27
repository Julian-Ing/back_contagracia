import { IsArray, IsUUID } from 'class-validator';

export class SetProductAttributesDto {
  @IsArray()
  @IsUUID('4', { each: true })
  attribute_ids: string[];
}
