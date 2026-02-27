import { PartialType } from '@nestjs/swagger';
import { CreateMaintenanceLogDto } from './create-maintenance-log.dto';

export class UpdateMaintenanceLogDto extends PartialType(CreateMaintenanceLogDto) {}
