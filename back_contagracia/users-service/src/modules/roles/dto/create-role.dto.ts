import { IsString, IsNotEmpty, IsOptional, IsArray, ValidateNested, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PermissionDto {
  @ApiProperty({ description: 'Action key del permiso', example: 'users.view' })
  @IsString()
  @IsNotEmpty()
  action_key: string;

  @ApiPropertyOptional({ description: 'Si el permiso está otorgado', default: true })
  @IsBoolean()
  @IsOptional()
  granted?: boolean;
}

export class CreateRoleDto {
  @ApiProperty({ description: 'Clave única del rol', example: 'supervisor' })
  @IsString()
  @IsNotEmpty()
  role_key: string;

  @ApiProperty({ description: 'Nombre del rol', example: 'Supervisor' })
  @IsString()
  @IsNotEmpty()
  role_name: string;

  @ApiPropertyOptional({ description: 'Descripción del rol' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Permisos del rol', type: [PermissionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PermissionDto)
  @IsOptional()
  permissions?: PermissionDto[];
}
