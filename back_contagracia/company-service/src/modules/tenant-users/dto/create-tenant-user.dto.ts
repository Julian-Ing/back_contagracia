import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsOptional,
  MinLength,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  IsBoolean,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PermissionDto {
  @ApiProperty({
    description: 'Clave de acción (ej: invoicing.create, inventory.view)',
  })
  @IsString()
  @IsNotEmpty()
  action_key: string;

  @ApiProperty({ description: 'Si el permiso está otorgado', default: true })
  @IsOptional()
  @IsBoolean()
  granted?: boolean;
}

export class CreateTenantUserDto {
  @ApiProperty({ description: 'Email del empleado' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'Contraseña inicial' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ description: 'Nombre completo del empleado' })
  @IsString()
  @IsNotEmpty()
  full_name: string;

  @ApiProperty({ description: 'Teléfono del empleado', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    description: 'ID del rol a asignar (opcional, por defecto employee)',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  role_id?: string;

  @ApiProperty({
    description: 'ID del tercero asociado (proveedor, cliente, etc)',
    required: false,
  })
  @IsOptional()
  @IsString()
  third_party_id?: string;

  @ApiProperty({
    description: 'Permisos asignados al usuario',
    type: [PermissionDto],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PermissionDto)
  permissions?: PermissionDto[];
}
