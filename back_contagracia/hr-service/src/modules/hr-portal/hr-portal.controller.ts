import {
  Controller,
  Get,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard, RequirePermissions } from '@contagracia/shared-modules';
import { HrPortalService } from './hr-portal.service';
import { PortalPayslipsQueryDto } from './dto/portal-payslips-query.dto';
import { PortalLeavesQueryDto } from './dto/portal-leaves-query.dto';

@ApiTags('Portal del Empleado')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('portal/me')
export class HrPortalController {
  constructor(private readonly service: HrPortalService) {}

  @Get('profile')
  @RequirePermissions('portal.profile.view')
  @ApiOperation({ summary: 'Mi perfil laboral: cargo, fechas, salario activo' })
  @ApiResponse({ status: 200, description: 'Perfil del empleado' })
  @ApiResponse({ status: 403, description: 'Usuario sin perfil de empleado' })
  async getMyProfile(@Request() req: any) {
    return this.service.getMyProfile(req.user.company_id, req.user.sub);
  }

  @Get('contract')
  @RequirePermissions('portal.contract.view')
  @ApiOperation({ summary: 'Mi contrato activo' })
  @ApiResponse({ status: 200, description: 'Contrato activo del empleado' })
  @ApiResponse({ status: 403, description: 'Usuario sin perfil de empleado' })
  async getMyContract(@Request() req: any) {
    return this.service.getMyContract(req.user.company_id, req.user.sub);
  }

  @Get('leaves')
  @RequirePermissions('portal.leaves.view')
  @ApiOperation({ summary: 'Mis solicitudes de ausencia y vacaciones' })
  @ApiResponse({ status: 200, description: 'Lista paginada de ausencias' })
  async getMyLeaves(@Request() req: any, @Query() query: PortalLeavesQueryDto) {
    return this.service.getMyLeaves(req.user.company_id, req.user.sub, query);
  }

  @Get('payslips')
  @RequirePermissions('payslips.view')
  @ApiOperation({ summary: 'Mis desprendibles de pago (liquidaciones aprobadas)' })
  @ApiResponse({ status: 200, description: 'Lista paginada de desprendibles' })
  async getMyPayslips(@Request() req: any, @Query() query: PortalPayslipsQueryDto) {
    return this.service.getMyPayslips(req.user.company_id, req.user.sub, query);
  }

  @Get('payslips/:detailId')
  @RequirePermissions('payslips.view')
  @ApiOperation({ summary: 'Detalle completo de un desprendible' })
  @ApiParam({ name: 'detailId', description: 'ID del detalle de liquidación' })
  @ApiResponse({ status: 200, description: 'Detalle del desprendible con payroll_data' })
  @ApiResponse({ status: 403, description: 'El desprendible no pertenece a este empleado' })
  async getMyPayslipDetail(
    @Request() req: any,
    @Param('detailId') detailId: string,
  ) {
    return this.service.getMyPayslipDetail(req.user.company_id, req.user.sub, detailId);
  }
}
