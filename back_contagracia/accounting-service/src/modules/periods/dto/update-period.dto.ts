import { IsString, IsDateString, IsInt, IsBoolean, IsOptional, Min } from 'class-validator';

export class UpdatePeriodDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsDateString()
  @IsOptional()
  start_date?: string;

  @IsDateString()
  @IsOptional()
  end_date?: string;

  @IsInt()
  @Min(2000)
  @IsOptional()
  year?: number;

  @IsBoolean()
  @IsOptional()
  is_annual?: boolean;

  @IsString()
  @IsOptional()
  description?: string;
}
