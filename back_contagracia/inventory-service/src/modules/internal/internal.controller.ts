import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Public } from '@contagracia/shared-modules';
import { WarehousesService } from '../warehouses/warehouses.service';

@ApiExcludeController()
@Controller('internal')
export class InternalController {
  constructor(private readonly warehousesService: WarehousesService) {}

  @Public()
  @Post('ensure-principal')
  @HttpCode(HttpStatus.OK)
  async ensurePrincipal(@Body() body: { company_id: string }) {
    return this.warehousesService.ensurePrincipal(body.company_id);
  }
}
