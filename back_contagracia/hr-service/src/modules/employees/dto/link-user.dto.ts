import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsBoolean,
  IsEmail,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

export class LinkUserDto {
  @ApiPropertyOptional({ description: 'Crear cuenta nueva para el empleado', default: false })
  @IsOptional()
  @IsBoolean()
  create_system_account?: boolean;

  @ApiPropertyOptional({ description: 'Email para la cuenta de usuario' })
  @IsOptional()
  @IsEmail()
  system_email?: string;

  @ApiPropertyOptional({ description: 'Contraseña para la cuenta de usuario' })
  @IsOptional()
  @IsString()
  @MinLength(8)
  system_password?: string;

  @ApiPropertyOptional({ description: 'ID del rol para la cuenta de usuario' })
  @IsOptional()
  @IsUUID()
  system_role_id?: string;

  @ApiPropertyOptional({ description: 'ID de un TenantUser existente para vincular' })
  @IsOptional()
  @IsUUID()
  existing_user_id?: string;
}
