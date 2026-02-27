import { IsEmail, IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'NIT de la empresa. Opcional para super admin.',
    example: '901234567',
    required: false,
  })
  @IsOptional()
  @IsString()
  nit?: string;

  @ApiProperty({
    description: 'Email del usuario',
    example: 'admin@distribuidoraabc.com',
  })
  @IsEmail({}, { message: 'Email inválido' })
  email: string;

  @ApiProperty({
    description: 'Contraseña del usuario',
    example: 'Admin123',
    format: 'password',
  })
  @IsString()
  password: string;
}
