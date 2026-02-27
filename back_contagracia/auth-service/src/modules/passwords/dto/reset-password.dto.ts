import { IsString, MinLength, MaxLength, Matches, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Token de recuperación enviado por email',
    example: 'xyz789abc456def123',
  })
  @IsString()
  @IsNotEmpty({ message: 'El token es requerido' })
  token: string;

  @ApiProperty({
    description: 'Nueva contraseña (8-50 caracteres, debe incluir mayúscula, minúscula y número)',
    example: 'NewPassword789',
    minLength: 8,
    maxLength: 50,
    format: 'password',
  })
  @IsString()
  @MinLength(8, { message: 'La nueva contraseña debe tener mínimo 8 caracteres' })
  @MaxLength(50, { message: 'La nueva contraseña debe tener máximo 50 caracteres' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]/,
    {
      message: 'La nueva contraseña debe contener al menos una mayúscula, una minúscula y un número',
    },
  )
  new_password: string;
}
