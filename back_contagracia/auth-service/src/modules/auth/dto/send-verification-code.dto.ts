import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

export class SendVerificationCodeDto {
  @ApiProperty({
    description: 'Email a verificar',
    example: 'usuario@ejemplo.com',
  })
  @IsEmail({}, { message: 'Debe ser un email válido' })
  @IsNotEmpty({ message: 'El email es requerido' })
  email: string;

  @ApiPropertyOptional({
    description: 'Propósito: "registration" valida que no exista, "company_email_change" omite esa validación.',
    enum: ['registration', 'company_email_change'],
    default: 'registration',
  })
  @IsOptional()
  @IsIn(['registration', 'company_email_change'])
  purpose?: 'registration' | 'company_email_change';
}
