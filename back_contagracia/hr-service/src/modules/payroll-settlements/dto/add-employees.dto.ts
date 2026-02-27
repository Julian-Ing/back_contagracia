import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID, ArrayMinSize } from 'class-validator';

export class AddEmployeesDto {
  @ApiProperty({ description: 'IDs de empleados (ThirdParty IDs) a agregar a la liquidación' })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  employee_ids: string[];
}
