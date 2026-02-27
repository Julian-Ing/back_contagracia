import { IsString, IsInt, IsOptional, Min, Max, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryPeriodActionDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  action?: string; // OPEN, CLOSE, REOPEN, ADJUST

  @IsDateString()
  @IsOptional()
  from_date?: string;

  @IsDateString()
  @IsOptional()
  to_date?: string;

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
