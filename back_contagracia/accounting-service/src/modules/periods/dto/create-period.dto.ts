import { IsString, IsDateString, IsInt, IsBoolean, IsOptional, Min, IsUUID } from 'class-validator';

export class CreatePeriodDto {
  @IsString()
  name: string;

  @IsDateString()
  start_date: string;

  @IsDateString()
  end_date: string;

  @IsInt()
  @Min(2000)
  year: number;

  @IsBoolean()
  @IsOptional()
  is_annual?: boolean;

  @IsUUID()
  @IsOptional()
  parent_period_id?: string;

  @IsString()
  @IsOptional()
  description?: string;
}
