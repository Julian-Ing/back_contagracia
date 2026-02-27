import { IsString, IsOptional, IsEnum } from 'class-validator';

export enum ActionType {
  OPEN = 'OPEN',
  CLOSE = 'CLOSE',
  REOPEN = 'REOPEN',
  ADJUST = 'ADJUST',
}

export class CreatePeriodActionDto {
  @IsEnum(ActionType)
  action: ActionType;

  @IsString()
  @IsOptional()
  reason?: string;
}
