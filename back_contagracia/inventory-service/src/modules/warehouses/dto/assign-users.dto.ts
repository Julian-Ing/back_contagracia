import { IsArray, IsString, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignUsersDto {
  @ApiProperty({ example: ['user-uuid-1', 'user-uuid-2'] })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1, { message: 'Debe seleccionar al menos un usuario' })
  tenant_user_ids: string[];
}
