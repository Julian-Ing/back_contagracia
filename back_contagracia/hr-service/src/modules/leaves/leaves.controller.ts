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
import { LeavesService } from './leaves.service';
import {
  CreateLeaveDto,
  RequestLeaveDto,
  QueryLeavesDto,
  EditLeaveDto,
  ApproveLeaveDto,
  RejectLeaveDto,
} from './dto';
import {
  JwtAuthGuard,
  RequirePermissions,
  RequireAnyPermission,
  Audit,
} from '@contagracia/shared-modules';

@ApiTags('Vacaciones y Ausencias (HR)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('leaves')
export class LeavesController {
  constructor(private readonly service: LeavesService) {}

  // ==================== LISTADO Y DETALLE ====================

  @Get()
  @RequireAnyPermission('leaves.view', 'leaves.request')
  @ApiOperation({ summary: 'Listar solicitudes de ausencia' })
  @ApiResponse({ status: 200, description: 'Lista de solicitudes' })
  async findAll(@Request() req: any, @Query() query: QueryLeavesDto) {
    const companyId = req.user.company_id;
    return this.service.findAll(companyId, companyId, query);
  }

  @Get('stats')
  @RequirePermissions('leaves.view')
  @ApiOperation({ summary: 'Estadisticas de ausencias' })
  @ApiResponse({ status: 200, description: 'Estadisticas' })
  async getStats(@Request() req: any) {
    const companyId = req.user.company_id;
    return this.service.getStats(companyId, companyId);
  }

  @Get('vacation-balance/:employeeId')
  @RequirePermissions('vacations.balance.view')
  @ApiOperation({ summary: 'Saldo de vacaciones de un empleado' })
  @ApiParam({ name: 'employeeId', description: 'ID del perfil de empleado' })
  @ApiResponse({ status: 200, description: 'Saldo de vacaciones' })
  async getVacationBalance(
    @Request() req: any,
    @Param('employeeId') employeeId: string,
  ) {
    const companyId = req.user.company_id;
    return this.service.getVacationBalance(companyId, companyId, employeeId);
  }

  @Get(':id')
  @RequireAnyPermission('leaves.view', 'leaves.request')
  @ApiOperation({ summary: 'Detalle de una solicitud' })
  @ApiParam({ name: 'id', description: 'ID de la solicitud' })
  @ApiResponse({ status: 200, description: 'Detalle de la solicitud' })
  async findOne(@Request() req: any, @Param('id') id: string) {
    const companyId = req.user.company_id;
    return this.service.findOne(companyId, companyId, id);
  }

  // ==================== CREACION ====================

  @Post()
  @Audit('leave_request.created', 'leave_request')
  @RequirePermissions('leaves.create')
  @ApiOperation({ summary: 'Crear solicitud de ausencia (admin)' })
  @ApiResponse({ status: 201, description: 'Solicitud creada' })
  async create(@Request() req: any, @Body() dto: CreateLeaveDto) {
    const companyId = req.user.company_id;
    const userId = req.user.sub || req.user.id;
    return this.service.create(companyId, companyId, userId, dto);
  }

  @Post('request')
  @Audit('leave_request.requested', 'leave_request')
  @RequirePermissions('leaves.request')
  @ApiOperation({ summary: 'Solicitar ausencia (empleado)' })
  @ApiResponse({ status: 201, description: 'Solicitud enviada' })
  async requestLeave(@Request() req: any, @Body() dto: RequestLeaveDto) {
    const companyId = req.user.company_id;
    const userId = req.user.sub || req.user.id;
    return this.service.requestLeave(companyId, companyId, userId, dto);
  }

  // ==================== EDICION ====================

  @Patch(':id')
  @Audit('leave_request.updated', 'leave_request')
  @RequirePermissions('leaves.edit')
  @ApiOperation({ summary: 'Editar solicitud de ausencia' })
  @ApiParam({ name: 'id', description: 'ID de la solicitud' })
  @ApiResponse({ status: 200, description: 'Solicitud actualizada' })
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: EditLeaveDto,
  ) {
    const companyId = req.user.company_id;
    return this.service.update(companyId, companyId, id, dto);
  }

  // ==================== APROBACION / RECHAZO ====================

  @Patch(':id/approve')
  @Audit('leave_request.approved', 'leave_request')
  @RequirePermissions('leaves.approve')
  @ApiOperation({ summary: 'Aprobar solicitud' })
  @ApiParam({ name: 'id', description: 'ID de la solicitud' })
  @ApiResponse({ status: 200, description: 'Solicitud aprobada' })
  async approve(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: ApproveLeaveDto,
  ) {
    const companyId = req.user.company_id;
    const userId = req.user.sub || req.user.id;
    return this.service.approve(companyId, companyId, userId, id, dto);
  }

  @Patch(':id/reject')
  @Audit('leave_request.rejected', 'leave_request')
  @RequirePermissions('leaves.reject')
  @ApiOperation({ summary: 'Rechazar solicitud' })
  @ApiParam({ name: 'id', description: 'ID de la solicitud' })
  @ApiResponse({ status: 200, description: 'Solicitud rechazada' })
  async reject(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: RejectLeaveDto,
  ) {
    const companyId = req.user.company_id;
    const userId = req.user.sub || req.user.id;
    return this.service.reject(companyId, companyId, userId, id, dto);
  }

  // ==================== ELIMINACION ====================

  @Delete(':id')
  @Audit('leave_request.deleted', 'leave_request')
  @RequirePermissions('leaves.delete')
  @ApiOperation({ summary: 'Eliminar solicitud (solo pendientes)' })
  @ApiParam({ name: 'id', description: 'ID de la solicitud' })
  @ApiResponse({ status: 200, description: 'Solicitud eliminada' })
  async delete(@Request() req: any, @Param('id') id: string) {
    const companyId = req.user.company_id;
    return this.service.delete(companyId, companyId, id);
  }
}
