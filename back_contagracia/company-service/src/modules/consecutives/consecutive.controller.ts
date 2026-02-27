import { Controller, Post, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard, CompanyId, Audit } from '@contagracia/shared-modules';
import { ConsecutiveService } from './consecutive.service';

@ApiTags('Consecutives')

@UseGuards(JwtAuthGuard)
@Controller('api/consecutives')
export class ConsecutiveController {
  constructor(private readonly consecutiveService: ConsecutiveService) {}

  @Post(':type/next')
  @Audit('consecutive.next_generated', 'consecutive')
  @ApiOperation({ summary: 'Obtener siguiente consecutivo (incrementa)' })
  async getNext(
    @CompanyId() companyId: string,
    @Param('type') type: string,
  ) {
    const consecutive = await this.consecutiveService.getNext(companyId, type);
    return { consecutive };
  }

  @Get(':type/current')
  @ApiOperation({ summary: 'Obtener consecutivo actual (sin incrementar)' })
  async getCurrent(
    @CompanyId() companyId: string,
    @Param('type') type: string,
  ) {
    const consecutive = await this.consecutiveService.getCurrent(companyId, type);
    return { consecutive };
  }
}
