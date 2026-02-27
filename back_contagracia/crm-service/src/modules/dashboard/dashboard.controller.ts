import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard, RequirePermissions } from '@contagracia/shared-modules';
import { DashboardService } from './dashboard.service';

@ApiTags('CRM Dashboard')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('companies/:companyId/crm/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @RequirePermissions('crm.dashboard.view')
  @ApiOperation({ summary: 'Obtener estadísticas generales del CRM' })
  async getStats(@Param('companyId') companyId: string) {
    return this.dashboardService.getStats(companyId);
  }

  @Get('pipeline')
  @RequirePermissions('crm.dashboard.view')
  @ApiOperation({ summary: 'Obtener pipeline de oportunidades por etapa' })
  async getPipeline(@Param('companyId') companyId: string) {
    return this.dashboardService.getPipeline(companyId);
  }

  @Get('leads-by-source')
  @RequirePermissions('crm.dashboard.view')
  @ApiOperation({ summary: 'Obtener leads agrupados por fuente' })
  async getLeadsBySource(@Param('companyId') companyId: string) {
    return this.dashboardService.getLeadsBySource(companyId);
  }

  @Get('recent-activities')
  @RequirePermissions('crm.dashboard.view')
  @ApiOperation({ summary: 'Obtener las 10 actividades más recientes' })
  async getRecentActivities(@Param('companyId') companyId: string) {
    return this.dashboardService.getRecentActivities(companyId);
  }
}
