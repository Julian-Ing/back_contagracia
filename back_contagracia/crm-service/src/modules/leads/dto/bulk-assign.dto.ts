import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class BulkAssignDto {
  @ApiProperty({ description: 'IDs de los leads a asignar', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  leadIds: string[];

  @ApiProperty({ description: 'ID del usuario a asignar' })
  @IsUUID()
  @IsNotEmpty()
  assignedTo: string;
}
