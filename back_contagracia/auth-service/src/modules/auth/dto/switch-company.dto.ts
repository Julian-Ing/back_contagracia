import { IsUUID, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SwitchCompanyDto {
  @ApiProperty({
    description: 'ID de la empresa a la que se desea cambiar',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID('4', { message: 'company_id debe ser un UUID válido' })
  @IsNotEmpty({ message: 'El ID de la empresa es requerido' })
  company_id: string;
}
