import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
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
import { TimeAttendanceService } from './time-attendance.service';
import {
  RegisterCheckinDto,
  RegisterCheckoutDto,
  EditAttendanceDto,
  QueryAttendanceDto,
  CreateOvertimeDto,
  EditOvertimeDto,
  QueryOvertimeDto,
} from './dto';
import {
  JwtAuthGuard,
  RequirePermissions,
  RequireAnyPermission,
  Audit,
} from '@contagracia/shared-modules';

@ApiTags('Control de Tiempo (HR)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('time-attendance')
export class TimeAttendanceController {
  constructor(private readonly service: TimeAttendanceService) {}

  // ==================== ASISTENCIA ====================

  @Get()
  @RequireAnyPermission('attendance.view', 'attendance.self_view')
  @ApiOperation({ summary: 'Listar registros de asistencia' })
  @ApiResponse({ status: 200, description: 'Lista de registros de asistencia' })
  async findAllAttendance(@Request() req: any, @Query() query: QueryAttendanceDto) {
    const companyId = req.user.company_id;
    const userId = req.user.sub || req.user.id;
    const permissions: string[] = req.user.permissions || [];
    const selfOnly = !permissions.includes('*') && !permissions.includes('attendance.view');
    return this.service.findAllAttendance(companyId, companyId, userId, selfOnly, query);
  }

  @Get('stats')
  @RequireAnyPermission('attendance.view', 'attendance.self_view')
  @ApiOperation({ summary: 'Estadisticas de asistencia y horas extras' })
  @ApiResponse({ status: 200, description: 'Estadisticas' })
  async getStats(@Request() req: any) {
    const companyId = req.user.company_id;
    return this.service.getStats(companyId, companyId);
  }

  @Get('reports')
  @RequirePermissions('attendance.reports.view')
  @ApiOperation({ summary: 'Reporte de asistencia' })
  @ApiResponse({ status: 200, description: 'Reporte agrupado por empleado' })
  async getReport(@Request() req: any, @Query() query: QueryAttendanceDto) {
    const companyId = req.user.company_id;
    return this.service.getAttendanceReport(companyId, companyId, query);
  }

  @Get('export')
  @RequirePermissions('attendance.export')
  @ApiOperation({ summary: 'Exportar asistencia' })
  @ApiResponse({ status: 200, description: 'Datos de exportacion' })
  async exportAttendance(@Request() req: any, @Query() query: QueryAttendanceDto) {
    const companyId = req.user.company_id;
    return this.service.exportAttendance(companyId, companyId, query);
  }

  @Post('checkin')
  @Audit('attendance.checkin', 'attendance')
  @RequireAnyPermission('attendance.register_checkin', 'attendance.self_checkin')
  @ApiOperation({ summary: 'Marcar entrada (propia o de un empleado)' })
  @ApiResponse({ status: 201, description: 'Entrada registrada' })
  async registerCheckin(@Request() req: any, @Body() dto: RegisterCheckinDto) {
    const companyId = req.user.company_id;
    const userId = req.user.sub || req.user.id;
    return this.service.registerCheckin(companyId, companyId, userId, dto);
  }

  @Post('checkout')
  @Audit('attendance.checkout', 'attendance')
  @RequireAnyPermission('attendance.register_checkout', 'attendance.self_checkout')
  @ApiOperation({ summary: 'Marcar salida (propia o de un empleado)' })
  @ApiResponse({ status: 201, description: 'Salida registrada' })
  async registerCheckout(@Request() req: any, @Body() dto: RegisterCheckoutDto) {
    const companyId = req.user.company_id;
    const userId = req.user.sub || req.user.id;
    return this.service.registerCheckout(companyId, companyId, userId, dto);
  }

  @Patch(':id')
  @Audit('attendance.updated', 'attendance')
  @RequirePermissions('attendance.edit')
  @ApiOperation({ summary: 'Editar registro de asistencia' })
  @ApiParam({ name: 'id', description: 'ID del registro de asistencia' })
  @ApiResponse({ status: 200, description: 'Registro actualizado' })
  async editAttendance(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: EditAttendanceDto,
  ) {
    const companyId = req.user.company_id;
    return this.service.editAttendance(companyId, companyId, id, dto);
  }

  // ==================== HORAS EXTRAS ====================

  @Get('overtime')
  @RequireAnyPermission('overtime.view', 'overtime.self_request')
  @ApiOperation({ summary: 'Listar horas extras' })
  @ApiResponse({ status: 200, description: 'Lista de horas extras' })
  async findAllOvertime(@Request() req: any, @Query() query: QueryOvertimeDto) {
    const companyId = req.user.company_id;
    const userId = req.user.sub || req.user.id;
    const permissions: string[] = req.user.permissions || [];
    const selfOnly = !permissions.includes('*') && !permissions.includes('overtime.view');
    return this.service.findAllOvertime(companyId, companyId, userId, selfOnly, query);
  }

  @Post('overtime')
  @Audit('overtime.created', 'overtime')
  @RequireAnyPermission('overtime.create', 'overtime.self_request')
  @ApiOperation({ summary: 'Registrar hora extra (propia o de un empleado)' })
  @ApiResponse({ status: 201, description: 'Hora extra registrada' })
  async createOvertime(@Request() req: any, @Body() dto: CreateOvertimeDto) {
    const companyId = req.user.company_id;
    const userId = req.user.sub || req.user.id;
    const permissions: string[] = req.user.permissions || [];
    const selfOnly = !permissions.includes('*') && !permissions.includes('overtime.create');
    const canApprove = permissions.includes('*') || permissions.includes('overtime.approve');
    return this.service.createOvertime(companyId, companyId, userId, selfOnly, canApprove, dto);
  }

  @Patch('overtime/:id')
  @Audit('overtime.updated', 'overtime')
  @RequirePermissions('overtime.edit')
  @ApiOperation({ summary: 'Editar hora extra' })
  @ApiParam({ name: 'id', description: 'ID del registro de hora extra' })
  @ApiResponse({ status: 200, description: 'Hora extra actualizada' })
  async editOvertime(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: EditOvertimeDto,
  ) {
    const companyId = req.user.company_id;
    return this.service.editOvertime(companyId, companyId, id, dto);
  }

  @Delete('overtime/:id')
  @Audit('overtime.deleted', 'overtime')
  @RequirePermissions('overtime.delete')
  @ApiOperation({ summary: 'Eliminar hora extra' })
  @ApiParam({ name: 'id', description: 'ID del registro de hora extra' })
  @ApiResponse({ status: 200, description: 'Hora extra eliminada' })
  async deleteOvertime(@Request() req: any, @Param('id') id: string) {
    const companyId = req.user.company_id;
    return this.service.deleteOvertime(companyId, companyId, id);
  }

  @Patch('overtime/:id/approve')
  @Audit('overtime.approved', 'overtime')
  @RequirePermissions('overtime.approve')
  @ApiOperation({ summary: 'Aprobar hora extra' })
  @ApiParam({ name: 'id', description: 'ID del registro de hora extra' })
  @ApiResponse({ status: 200, description: 'Hora extra aprobada' })
  async approveOvertime(@Request() req: any, @Param('id') id: string) {
    const companyId = req.user.company_id;
    const userId = req.user.sub || req.user.id;
    return this.service.approveOvertime(companyId, companyId, userId, id);
  }

  @Patch('overtime/:id/reject')
  @Audit('overtime.rejected', 'overtime')
  @RequirePermissions('overtime.reject')
  @ApiOperation({ summary: 'Rechazar hora extra' })
  @ApiParam({ name: 'id', description: 'ID del registro de hora extra' })
  @ApiResponse({ status: 200, description: 'Hora extra rechazada' })
  async rejectOvertime(
    @Request() req: any,
    @Param('id') id: string,
    @Body('rejection_reason') rejectionReason: string,
  ) {
    const companyId = req.user.company_id;
    const userId = req.user.sub || req.user.id;
    return this.service.rejectOvertime(companyId, companyId, userId, id, rejectionReason);
  }

  // ==================== FESTIVOS ====================

  @Get('holidays/:year')
  @RequireAnyPermission('attendance.view', 'attendance.self_view')
  @ApiOperation({ summary: 'Obtener festivos colombianos de un año' })
  @ApiParam({ name: 'year', description: 'Año (ej: 2026)' })
  @ApiResponse({ status: 200, description: 'Lista de festivos' })
  async getHolidays(@Param('year') year: string) {
    return this.service.getHolidays(parseInt(year, 10));
  }
}
