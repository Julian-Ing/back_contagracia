import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';

export class UpdateUserStatusDto {
  @ApiProperty({ example: 'active', enum: ['active', 'inactive'] })
  @IsString()
  @IsIn(['active', 'inactive'])
  status: 'active' | 'inactive';
}
