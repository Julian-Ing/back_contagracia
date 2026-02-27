import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsOptional,
  MinLength,
  IsUUID,
} from 'class-validator';

export class UpdateUserDto {
  @ApiProperty({ description: 'Email del usuario', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ description: 'Nueva contraseña', required: false })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @ApiProperty({ description: 'Nombre completo', required: false })
  @IsOptional()
  @IsString()
  full_name?: string;

  @ApiProperty({ description: 'Teléfono', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ description: 'ID del rol', required: false })
  @IsOptional()
  @IsUUID()
  role_id?: string;
}
