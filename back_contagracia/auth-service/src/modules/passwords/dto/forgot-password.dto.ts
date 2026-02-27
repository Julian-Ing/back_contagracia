import { IsEmail, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({
    description: 'Email del usuario que olvidó su contraseña',
    example: 'usuario@ejemplo.com',
  })
  @IsEmail({}, { message: 'Email inválido' })
  email: string;

  @ApiPropertyOptional({
    description: 'NIT de la empresa (opcional, para usuarios de empresa)',
    example: '900123456',
  })
  @IsOptional()
  @IsString()
  nit?: string;
}
