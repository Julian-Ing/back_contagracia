import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsUUID,
  IsArray,
  ValidateNested,
  IsBoolean,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateFormFieldDto {
  @ApiPropertyOptional({ description: 'Nombre del campo' })
  @IsString()
  @IsOptional()
  field_name?: string;

  @ApiPropertyOptional({ description: 'Tipo del campo' })
  @IsString()
  @IsOptional()
  field_type?: string;

  @ApiPropertyOptional({ description: 'Es requerido' })
  @IsBoolean()
  @IsOptional()
  is_required?: boolean;

  @ApiPropertyOptional({ description: 'Posición del campo' })
  @IsInt()
  @Min(0)
  @IsOptional()
  position?: number;

  @ApiPropertyOptional({ description: 'Opciones del campo' })
  @IsOptional()
  options?: any;
}

export class UpdateFormDto {
  @ApiPropertyOptional({ description: 'Nombre del formulario' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Slug único del formulario' })
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiPropertyOptional({ description: 'Descripción del formulario' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'URL de redirección después del envío' })
  @IsString()
  @IsOptional()
  redirect_url?: string;

  @ApiPropertyOptional({ description: 'ID de la campaña asociada' })
  @IsUUID()
  @IsOptional()
  campaign_id?: string;

  @ApiPropertyOptional({ description: 'Campos del formulario', type: [UpdateFormFieldDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateFormFieldDto)
  @IsOptional()
  fields?: UpdateFormFieldDto[];

  @ApiPropertyOptional({ description: 'Estado activo del formulario' })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
