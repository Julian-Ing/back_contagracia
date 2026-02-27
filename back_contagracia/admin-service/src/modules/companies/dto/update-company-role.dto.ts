import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsIn } from 'class-validator';

export class UpdateCompanyRoleDto {
  @ApiProperty({
    description: 'Nuevo rol para el usuario owner de la compañía',
    enum: ['admin', 'user'],
    example: 'admin',
  })
  @IsString()
  @IsIn(['admin', 'user'])
  role: string;
}
