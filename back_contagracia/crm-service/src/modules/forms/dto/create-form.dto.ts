import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsUUID,
  IsArray,
  ValidateNested,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateFormFieldDto {
  @ApiProperty({ description: 'Nombre del campo' })
  @IsString()
  @IsNotEmpty()
  field_name: string;

  @ApiProperty({ description: 'Tipo del campo (text, email, phone, select, etc.)' })
  @IsString()
  @IsNotEmpty()
  field_type: string;

  @ApiProperty({ description: 'Es requerido' })
  @IsBoolean()
  is_required: boolean;

  @ApiProperty({ description: 'Posición del campo' })
  @IsInt()
  @Min(0)
  position: number;

  @ApiPropertyOptional({ description: 'Opciones del campo (para select, radio, etc.)' })
  @IsOptional()
  options?: any;
}

export class CreateFormDto {
  @ApiProperty({ description: 'Nombre del formulario' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Slug único del formulario' })
  @IsString()
  @IsNotEmpty()
  slug: string;

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

  @ApiProperty({ description: 'Campos del formulario', type: [CreateFormFieldDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateFormFieldDto)
  fields: CreateFormFieldDto[];
}
