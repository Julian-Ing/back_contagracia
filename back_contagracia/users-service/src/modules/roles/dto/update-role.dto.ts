import { IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PermissionDto } from './create-role.dto';

export class UpdateRoleDto {
  @ApiPropertyOptional({ description: 'Nombre del rol', example: 'Supervisor' })
  @IsString()
  @IsOptional()
  role_name?: string;

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
