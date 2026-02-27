import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyEmailDto {
  @ApiProperty({
    description: 'Token de verificación enviado por email',
    example: 'abc123def456ghi789',
  })
  @IsString()
  @IsNotEmpty({ message: 'El token de verificación es requerido' })
  token: string;
}
