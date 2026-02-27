import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';

@ApiTags('PH Dashboard')
@ApiBearerAuth('JWT-auth')
@Controller('companies/:companyId/ph/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  /**
   * Permission: ph.dashboard.view
   * Obtiene estadísticas generales del módulo PH
   */
  @Get('stats')
  @ApiOperation({ summary: 'Obtener estadísticas generales del módulo PH' })
  @ApiQuery({ name: 'condominium_id', required: false, description: 'Filtrar por condominio específico' })
  async getStats(
    @Param('companyId') companyId: string,
    @Query('condominium_id') condominiumId?: string,
  ) {
    return this.dashboardService.getStats(companyId, condominiumId);
  }
}
