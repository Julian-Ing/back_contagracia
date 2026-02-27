import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsIn } from 'class-validator';

export class UpdateCompanyStatusDto {
  @ApiProperty({
    description: 'Nuevo estado de la compañía',
    enum: ['active', 'inactive'],
    example: 'active',
  })
  @IsString()
  @IsIn(['active', 'inactive'])
  status: string;
}
