import { IsDateString, IsOptional } from 'class-validator';

export class QueryGeneralLedgerDto {
  @IsDateString()
  date_from: string;

  @IsDateString()
  date_to: string;

  @IsOptional()
  account_prefix?: string;
}
