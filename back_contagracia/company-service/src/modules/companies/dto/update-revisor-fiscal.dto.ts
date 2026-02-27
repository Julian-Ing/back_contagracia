import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional } from 'class-validator';

export class UpdateRevisorFiscalDto {
  @ApiPropertyOptional({ description: 'Nombre del revisor fiscal' })
  @IsOptional()
  @IsString()
  revisor_fiscal_name?: string;

  @ApiPropertyOptional({ description: 'Identificación del revisor fiscal' })
  @IsOptional()
  @IsString()
  revisor_fiscal_identification?: string;

  @ApiPropertyOptional({ description: 'Teléfono del revisor fiscal' })
  @IsOptional()
  @IsString()
  revisor_fiscal_phone?: string;

  @ApiPropertyOptional({ description: 'Email del revisor fiscal' })
  @IsOptional()
  @IsEmail()
  revisor_fiscal_email?: string;
}
