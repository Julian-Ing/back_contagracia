import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateSystemActionDto } from './create-system-action.dto';

export class UpdateSystemActionDto extends PartialType(
  OmitType(CreateSystemActionDto, ['action_key'] as const),
) {}
