import { Controller, Get } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { InternalService } from './internal.service';

@ApiExcludeController()
@Controller('_internal')
export class InternalController {
  constructor(private readonly internalService: InternalService) {}

  @Get('puc')
  async getPuc(): Promise<any> {
    return this.internalService.getChartOfAccounts();
  }

  @Get('accounting-config')
  async getAccountingConfig(): Promise<any> {
    return this.internalService.getAccountingConfigs();
  }

  @Get('full')
  async getFull(): Promise<any> {
    return this.internalService.getFullView();
  }
}
