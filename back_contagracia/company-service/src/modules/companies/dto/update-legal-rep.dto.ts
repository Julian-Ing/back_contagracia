import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail } from 'class-validator';

export class UpdateLegalRepDto {
  @ApiProperty({ description: 'Nombre del representante legal' })
  @IsString()
  legal_rep_name: string;

  @ApiProperty({ description: 'Identificación del representante legal' })
  @IsString()
  legal_rep_identification: string;

  @ApiProperty({ description: 'Teléfono del representante legal' })
  @IsString()
  legal_rep_phone: string;

  @ApiProperty({ description: 'Email del representante legal' })
  @IsEmail()
  legal_rep_email: string;
}
