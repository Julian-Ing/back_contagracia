import { IsEmail, IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    description: 'Email del nuevo usuario',
    example: 'usuario@ejemplo.com',
  })
  @IsEmail({}, { message: 'Email inválido' })
  email: string;

  @ApiProperty({
    description: 'Contraseña (8-50 caracteres, debe incluir mayúscula, minúscula y número)',
    example: 'Usuario123',
    minLength: 8,
    maxLength: 50,
    format: 'password',
  })
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener mínimo 8 caracteres' })
  @MaxLength(50, { message: 'La contraseña debe tener máximo 50 caracteres' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]/,
    {
      message: 'La contraseña debe contener al menos una mayúscula, una minúscula y un número',
    },
  )
  password: string;

  @ApiProperty({
    description: 'Nombre completo del usuario',
    example: 'María González',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @MinLength(2, { message: 'El nombre debe tener mínimo 2 caracteres' })
  @MaxLength(100, { message: 'El nombre debe tener máximo 100 caracteres' })
  full_name: string;
}
