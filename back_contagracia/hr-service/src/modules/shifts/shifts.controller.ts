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
import { ShiftsService } from './shifts.service';
import {
  CreateShiftTemplateDto,
  CreateScheduleDto,
  CreateAssignmentDto,
  BulkAssignmentDto,
  CreateSwapRequestDto,
  QueryAssignmentsDto,
  QuerySwapsDto,
} from './dto';
import {
  JwtAuthGuard,
  RequirePermissions,
  RequireAnyPermission,
  Audit,
} from '@contagracia/shared-modules';

@ApiTags('Turnos (HR)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('shifts')
export class ShiftsController {
  constructor(private readonly service: ShiftsService) {}

  // ==================== SHIFT TEMPLATES ====================

  @Get('templates')
  @RequireAnyPermission('shifts.templates.view', 'shifts.self.view')
  @ApiOperation({ summary: 'Listar plantillas de turno' })
  @ApiResponse({ status: 200, description: 'Lista de plantillas' })
  async findAllTemplates(@Request() req: any) {
    const companyId = req.user.company_id;
    return this.service.findAllTemplates(companyId, companyId);
  }

  @Get('templates/:id')
  @RequireAnyPermission('shifts.templates.view', 'shifts.self.view')
  @ApiOperation({ summary: 'Detalle de plantilla de turno' })
  @ApiParam({ name: 'id', description: 'ID de la plantilla' })
  async findOneTemplate(@Request() req: any, @Param('id') id: string) {
    const companyId = req.user.company_id;
    return this.service.findOneTemplate(companyId, companyId, id);
  }

  @Post('templates')
  @Audit('shift_template.created', 'shift_template')
  @RequirePermissions('shifts.templates.create')
  @ApiOperation({ summary: 'Crear plantilla de turno' })
  @ApiResponse({ status: 201, description: 'Plantilla creada' })
  async createTemplate(@Request() req: any, @Body() dto: CreateShiftTemplateDto) {
    const companyId = req.user.company_id;
    return this.service.createTemplate(companyId, companyId, dto);
  }

  @Patch('templates/:id')
  @Audit('shift_template.updated', 'shift_template')
  @RequirePermissions('shifts.templates.edit')
  @ApiOperation({ summary: 'Actualizar plantilla de turno' })
  @ApiParam({ name: 'id', description: 'ID de la plantilla' })
  async updateTemplate(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: Partial<CreateShiftTemplateDto>,
  ) {
    const companyId = req.user.company_id;
    return this.service.updateTemplate(companyId, companyId, id, dto);
  }

  @Delete('templates/:id')
  @Audit('shift_template.deleted', 'shift_template')
  @RequirePermissions('shifts.templates.delete')
  @ApiOperation({ summary: 'Eliminar/desactivar plantilla de turno' })
  @ApiParam({ name: 'id', description: 'ID de la plantilla' })
  async deleteTemplate(@Request() req: any, @Param('id') id: string) {
    const companyId = req.user.company_id;
    return this.service.deleteTemplate(companyId, companyId, id);
  }

  // ==================== SHIFT SCHEDULES ====================

  @Get('schedules')
  @RequireAnyPermission('shifts.schedules.view', 'shifts.self.schedule_view')
  @ApiOperation({ summary: 'Listar programaciones' })
  async findAllSchedules(@Request() req: any) {
    const companyId = req.user.company_id;
    return this.service.findAllSchedules(companyId, companyId);
  }

  @Get('schedules/published')
  @RequirePermissions('shifts.self.schedule_view')
  @ApiOperation({ summary: 'Ver programaciones publicadas (empleado)' })
  async getPublishedSchedules(@Request() req: any) {
    const companyId = req.user.company_id;
    return this.service.getPublishedSchedules(companyId, companyId);
  }

  @Get('schedules/:id')
  @RequireAnyPermission('shifts.schedules.view', 'shifts.self.schedule_view')
  @ApiOperation({ summary: 'Detalle de programación' })
  @ApiParam({ name: 'id', description: 'ID de la programación' })
  async findOneSchedule(@Request() req: any, @Param('id') id: string) {
    const companyId = req.user.company_id;
    return this.service.findOneSchedule(companyId, companyId, id);
  }

  @Post('schedules')
  @Audit('shift_schedule.created', 'shift_schedule')
  @RequirePermissions('shifts.schedules.create')
  @ApiOperation({ summary: 'Crear programación' })
  @ApiResponse({ status: 201, description: 'Programación creada' })
  async createSchedule(@Request() req: any, @Body() dto: CreateScheduleDto) {
    const companyId = req.user.company_id;
    return this.service.createSchedule(companyId, companyId, dto);
  }

  @Patch('schedules/:id')
  @Audit('shift_schedule.updated', 'shift_schedule')
  @RequirePermissions('shifts.schedules.edit')
  @ApiOperation({ summary: 'Actualizar programación' })
  @ApiParam({ name: 'id', description: 'ID de la programación' })
  async updateSchedule(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: Partial<CreateScheduleDto>,
  ) {
    const companyId = req.user.company_id;
    return this.service.updateSchedule(companyId, companyId, id, dto);
  }

  @Patch('schedules/:id/publish')
  @Audit('shift_schedule.published', 'shift_schedule')
  @RequirePermissions('shifts.schedules.publish')
  @ApiOperation({ summary: 'Publicar programación' })
  @ApiParam({ name: 'id', description: 'ID de la programación' })
  async publishSchedule(@Request() req: any, @Param('id') id: string) {
    const companyId = req.user.company_id;
    const userId = req.user.sub || req.user.id;
    return this.service.publishSchedule(companyId, companyId, userId, id);
  }

  @Delete('schedules/:id')
  @Audit('shift_schedule.deleted', 'shift_schedule')
  @RequirePermissions('shifts.schedules.delete')
  @ApiOperation({ summary: 'Eliminar/archivar programación' })
  @ApiParam({ name: 'id', description: 'ID de la programación' })
  async deleteSchedule(@Request() req: any, @Param('id') id: string) {
    const companyId = req.user.company_id;
    return this.service.deleteSchedule(companyId, companyId, id);
  }

  // ==================== SHIFT ASSIGNMENTS ====================

  @Get('assignments')
  @RequirePermissions('shifts.assignments.view')
  @ApiOperation({ summary: 'Listar asignaciones de turno' })
  async findAllAssignments(@Request() req: any, @Query() query: QueryAssignmentsDto) {
    const companyId = req.user.company_id;
    return this.service.findAllAssignments(companyId, companyId, query);
  }

  @Post('assignments')
  @Audit('shift_assignment.created', 'shift_assignment')
  @RequirePermissions('shifts.assignments.create')
  @ApiOperation({ summary: 'Crear asignación de turno' })
  @ApiResponse({ status: 201, description: 'Asignación creada' })
  async createAssignment(@Request() req: any, @Body() dto: CreateAssignmentDto) {
    const companyId = req.user.company_id;
    const userId = req.user.sub || req.user.id;
    return this.service.createAssignment(companyId, companyId, userId, dto);
  }

  @Post('assignments/bulk')
  @Audit('shift_assignment.bulk_created', 'shift_assignment')
  @RequirePermissions('shifts.assignments.create')
  @ApiOperation({ summary: 'Asignación masiva de turnos' })
  @ApiResponse({ status: 201, description: 'Asignaciones creadas' })
  async bulkCreateAssignments(@Request() req: any, @Body() dto: BulkAssignmentDto) {
    const companyId = req.user.company_id;
    const userId = req.user.sub || req.user.id;
    return this.service.bulkCreateAssignments(companyId, companyId, userId, dto);
  }

  @Patch('assignments/:id')
  @Audit('shift_assignment.updated', 'shift_assignment')
  @RequirePermissions('shifts.assignments.edit')
  @ApiOperation({ summary: 'Actualizar asignación de turno' })
  @ApiParam({ name: 'id', description: 'ID de la asignación' })
  async updateAssignment(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: Partial<CreateAssignmentDto>,
  ) {
    const companyId = req.user.company_id;
    return this.service.updateAssignment(companyId, companyId, id, dto);
  }

  @Delete('assignments/:id')
  @Audit('shift_assignment.cancelled', 'shift_assignment')
  @RequirePermissions('shifts.assignments.delete')
  @ApiOperation({ summary: 'Cancelar asignación de turno' })
  @ApiParam({ name: 'id', description: 'ID de la asignación' })
  async deleteAssignment(@Request() req: any, @Param('id') id: string) {
    const companyId = req.user.company_id;
    return this.service.deleteAssignment(companyId, companyId, id);
  }

  // ==================== SWAP REQUESTS (ADMIN) ====================

  @Get('swaps')
  @RequirePermissions('shifts.swaps.view')
  @ApiOperation({ summary: 'Listar solicitudes de intercambio' })
  async findAllSwaps(@Request() req: any, @Query() query: QuerySwapsDto) {
    const companyId = req.user.company_id;
    return this.service.findAllSwaps(companyId, companyId, query);
  }

  @Patch('swaps/:id/approve')
  @Audit('shift_swap.approved', 'shift_swap')
  @RequirePermissions('shifts.swaps.approve')
  @ApiOperation({ summary: 'Aprobar intercambio de turno' })
  @ApiParam({ name: 'id', description: 'ID de la solicitud' })
  async approveSwap(@Request() req: any, @Param('id') id: string) {
    const companyId = req.user.company_id;
    const userId = req.user.sub || req.user.id;
    return this.service.approveSwap(companyId, companyId, userId, id);
  }

  @Patch('swaps/:id/reject')
  @Audit('shift_swap.rejected', 'shift_swap')
  @RequirePermissions('shifts.swaps.reject')
  @ApiOperation({ summary: 'Rechazar intercambio de turno' })
  @ApiParam({ name: 'id', description: 'ID de la solicitud' })
  async rejectSwap(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { rejection_reason?: string },
  ) {
    const companyId = req.user.company_id;
    const userId = req.user.sub || req.user.id;
    return this.service.rejectSwap(companyId, companyId, userId, id, body.rejection_reason);
  }

  // ==================== ROTATION PATTERNS ====================

  @Get('rotations')
  @RequirePermissions('shifts.rotations.view')
  @ApiOperation({ summary: 'Listar patrones de rotación' })
  async findAllRotations(@Request() req: any) {
    const companyId = req.user.company_id;
    return this.service.findAllRotations(companyId, companyId);
  }

  @Post('rotations')
  @Audit('shift_rotation.created', 'shift_rotation')
  @RequirePermissions('shifts.rotations.manage')
  @ApiOperation({ summary: 'Crear patrón de rotación' })
  @ApiResponse({ status: 201, description: 'Patrón creado' })
  async createRotation(@Request() req: any, @Body() dto: any) {
    const companyId = req.user.company_id;
    return this.service.createRotation(companyId, companyId, dto);
  }

  @Patch('rotations/:id')
  @Audit('shift_rotation.updated', 'shift_rotation')
  @RequirePermissions('shifts.rotations.manage')
  @ApiOperation({ summary: 'Actualizar patrón de rotación' })
  @ApiParam({ name: 'id', description: 'ID del patrón' })
  async updateRotation(@Request() req: any, @Param('id') id: string, @Body() dto: any) {
    const companyId = req.user.company_id;
    return this.service.updateRotation(companyId, companyId, id, dto);
  }

  @Delete('rotations/:id')
  @Audit('shift_rotation.deleted', 'shift_rotation')
  @RequirePermissions('shifts.rotations.manage')
  @ApiOperation({ summary: 'Eliminar patrón de rotación' })
  @ApiParam({ name: 'id', description: 'ID del patrón' })
  async deleteRotation(@Request() req: any, @Param('id') id: string) {
    const companyId = req.user.company_id;
    return this.service.deleteRotation(companyId, companyId, id);
  }

  // ==================== SELF-SERVICE (EMPLEADO) ====================

  @Get('my-shifts')
  @RequirePermissions('shifts.self.view')
  @ApiOperation({ summary: 'Ver mis turnos asignados' })
  async getMyShifts(@Request() req: any, @Query() query: QueryAssignmentsDto) {
    const companyId = req.user.company_id;
    const userId = req.user.sub || req.user.id;
    return this.service.getMyShifts(companyId, companyId, userId, query);
  }

  @Post('my-shifts/swap')
  @Audit('shift_swap.requested', 'shift_swap')
  @RequirePermissions('shifts.self.swap_request')
  @ApiOperation({ summary: 'Solicitar intercambio de turno (self-service)' })
  @ApiResponse({ status: 201, description: 'Solicitud creada' })
  async requestSwap(@Request() req: any, @Body() dto: CreateSwapRequestDto) {
    const companyId = req.user.company_id;
    const userId = req.user.sub || req.user.id;
    return this.service.requestSwap(companyId, companyId, userId, dto);
  }

  @Patch('my-shifts/swap/:id/cancel')
  @Audit('shift_swap.cancelled', 'shift_swap')
  @RequirePermissions('shifts.self.swap_cancel')
  @ApiOperation({ summary: 'Cancelar mi solicitud de intercambio' })
  @ApiParam({ name: 'id', description: 'ID de la solicitud de intercambio' })
  async cancelMySwap(@Request() req: any, @Param('id') id: string) {
    const companyId = req.user.company_id;
    const userId = req.user.sub || req.user.id;
    return this.service.cancelMySwap(companyId, companyId, userId, id);
  }

  @Patch('my-shifts/:id/confirm')
  @Audit('shift_assignment.confirmed', 'shift_assignment')
  @RequirePermissions('shifts.self.confirm')
  @ApiOperation({ summary: 'Confirmar turno asignado (self-service)' })
  @ApiParam({ name: 'id', description: 'ID de la asignación' })
  async confirmMyShift(@Request() req: any, @Param('id') id: string) {
    const companyId = req.user.company_id;
    const userId = req.user.sub || req.user.id;
    return this.service.confirmMyShift(companyId, companyId, userId, id);
  }

  // ==================== EXPORT ====================

  @Get('export')
  @RequirePermissions('shifts.export')
  @ApiOperation({ summary: 'Exportar asignaciones de turno' })
  async exportAssignments(@Request() req: any, @Query() query: QueryAssignmentsDto) {
    const companyId = req.user.company_id;
    return this.service.exportAssignments(companyId, companyId, query);
  }
}
