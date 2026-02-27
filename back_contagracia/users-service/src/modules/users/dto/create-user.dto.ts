import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsOptional,
  MinLength,
  IsNotEmpty,
  IsUUID,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ description: 'Email del usuario' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'Contraseña inicial (mínimo 8 caracteres)' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ description: 'Nombre completo del usuario' })
  @IsString()
  @IsNotEmpty()
  full_name: string;

  @ApiProperty({ description: 'Teléfono del usuario', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    description: 'ID del rol a asignar (por defecto: employee)',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  role_id?: string;

  @ApiProperty({
    description: 'ID del tercero a vincular (opcional)',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  third_party_id?: string;
}
