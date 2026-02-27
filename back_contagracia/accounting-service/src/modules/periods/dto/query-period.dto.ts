import { IsString, IsInt, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryPeriodDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsInt()
  @Min(2000)
  @IsOptional()
  @Type(() => Number)
  year?: number;

  @IsString()
  @IsOptional()
  status?: string; // OPEN, CLOSED, REOPENED

  @IsString()
  @IsOptional()
  is_annual?: string; // 'true' o 'false'

  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  limit?: number;
}
