import { IsString, IsNotEmpty, IsDateString, IsInt, IsOptional, IsBoolean, Min, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateResolutionDto {
  @IsString()
  @IsNotEmpty()
  type_document_id: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  prefix: string;

  @IsString()
  @IsNotEmpty()
  resolution_number: string;

  @IsDateString()
  @IsNotEmpty()
  resolution_date: string;

  @IsString()
  @IsOptional()
  technical_key?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  range_from: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  range_to: number;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  @Min(0)
  last_external_consecutive?: number;

  @IsDateString()
  @IsNotEmpty()
  date_from: string;

  @IsDateString()
  @IsNotEmpty()
  date_to: string;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
