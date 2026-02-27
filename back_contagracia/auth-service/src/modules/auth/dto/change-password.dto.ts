import { IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({
    description: 'Contraseña actual del usuario',
    example: 'OldPassword123',
    format: 'password',
  })
  @IsString()
  current_password: string;

  @ApiProperty({
    description: 'Nueva contraseña (8-50 caracteres, debe incluir mayúscula, minúscula y número)',
    example: 'NewPassword456',
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
