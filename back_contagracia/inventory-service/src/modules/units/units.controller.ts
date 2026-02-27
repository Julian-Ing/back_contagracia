import { Controller, Get, Request } from '@nestjs/common';
import { UnitsService } from './units.service';

@Controller('units')
export class UnitsController {
  constructor(private readonly unitsService: UnitsService) {}

  @Get()
  findAll(@Request() req: any) {
    return this.unitsService.findAll(req.user.company_id);
  }
}
