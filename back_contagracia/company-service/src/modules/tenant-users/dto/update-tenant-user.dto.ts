import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsOptional,
  MinLength,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PermissionDto } from './create-tenant-user.dto';

export class UpdateTenantUserDto {
  @ApiProperty({ description: 'Email del empleado', required: false })
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

  @ApiProperty({ description: 'Estado activo/inactivo', required: false })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiProperty({ description: 'ID del rol', required: false })
  @IsOptional()
  @IsUUID()
  role_id?: string;

  @ApiProperty({ description: 'ID del tercero asociado', required: false })
  @IsOptional()
  @IsString()
  tercero_id?: string;
}

export class UpdateTenantUserPermissionsDto {
  @ApiProperty({
    description: 'Lista de permisos a asignar (reemplaza los existentes)',
    type: [PermissionDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PermissionDto)
  permissions: PermissionDto[];
}
