import { PartialType } from '@nestjs/swagger';
import { CreateAssemblyDto } from './create-assembly.dto';

export class UpdateAssemblyDto extends PartialType(CreateAssemblyDto) {}
