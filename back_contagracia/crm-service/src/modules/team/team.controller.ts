import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard, RequirePermissions } from '@contagracia/shared-modules';
import { TeamService } from './team.service';

@ApiTags('CRM Team')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('companies/:companyId/crm/team')
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @Get('members')
  @RequirePermissions('crm.team.view')
  @ApiOperation({ summary: 'Listar miembros del equipo con estadísticas CRM' })
  async getMembers(@Param('companyId') companyId: string) {
    return this.teamService.getMembers(companyId);
  }

  @Get('members/:userId/performance')
  @RequirePermissions('crm.reports.performance')
  @ApiOperation({ summary: 'Obtener métricas de rendimiento de un miembro' })
  async getMemberPerformance(
    @Param('companyId') companyId: string,
    @Param('userId') userId: string,
  ) {
    return this.teamService.getMemberPerformance(companyId, userId);
  }

  @Get('ranking')
  @RequirePermissions('crm.team.view')
  @ApiOperation({ summary: 'Ranking de miembros por valor de oportunidades ganadas' })
  async getRanking(@Param('companyId') companyId: string) {
    return this.teamService.getRanking(companyId);
  }
}
