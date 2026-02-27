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
import { JwtAuthGuard, RequirePermissions, Audit } from '@contagracia/shared-modules';
import { PayrollSettlementsService } from './payroll-settlements.service';
import { CreateSettlementDto } from './dto/create-settlement.dto';
import { UpdateSettlementDto } from './dto/update-settlement.dto';
import { QuerySettlementsDto } from './dto/query-settlements.dto';
import { AddEmployeesDto } from './dto/add-employees.dto';

@ApiTags('Liquidaciones de Nómina')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('payroll-settlements')
export class PayrollSettlementsController {
  constructor(private readonly settlementsService: PayrollSettlementsService) {}

  // ==================== CRUD ====================

  @Get()
  @RequirePermissions('payroll_settlements.view')
  @ApiOperation({ summary: 'Listar liquidaciones con filtros y paginación' })
  @ApiResponse({ status: 200, description: 'Lista de liquidaciones' })
  async findAll(@Request() req: any, @Query() query: QuerySettlementsDto) {
    return this.settlementsService.findAll(req.user.company_id, query);
  }

  @Get('employee-history/:employeeId')
  @RequirePermissions('payroll_settlements.view')
  @ApiOperation({ summary: 'Historial de liquidaciones de un empleado' })
  @ApiParam({ name: 'employeeId', description: 'ID del empleado (third_party_id)' })
  @ApiResponse({ status: 200, description: 'Historial del empleado' })
  async findEmployeeHistory(
    @Request() req: any,
    @Param('employeeId') employeeId: string,
    @Query() query: QuerySettlementsDto,
  ) {
    return this.settlementsService.findEmployeeHistory(req.user.company_id, employeeId, query);
  }

  @Get(':id')
  @RequirePermissions('payroll_settlements.view')
  @ApiOperation({ summary: 'Obtener una liquidación con resumen de detalles' })
  @ApiParam({ name: 'id', description: 'ID de la liquidación' })
  @ApiResponse({ status: 200, description: 'Liquidación encontrada' })
  @ApiResponse({ status: 404, description: 'No encontrada' })
  async findOne(@Request() req: any, @Param('id') id: string) {
    return this.settlementsService.findOne(req.user.company_id, id);
  }

  @Get(':id/details/:detailId')
  @RequirePermissions('payroll_settlements.view')
  @ApiOperation({ summary: 'Obtener detalle completo de un empleado (payroll_data)' })
  @ApiParam({ name: 'id', description: 'ID de la liquidación' })
  @ApiParam({ name: 'detailId', description: 'ID del detalle' })
  @ApiResponse({ status: 200, description: 'Detalle encontrado' })
  async findDetail(
    @Request() req: any,
    @Param('id') id: string,
    @Param('detailId') detailId: string,
  ) {
    return this.settlementsService.findDetail(req.user.company_id, id, detailId);
  }

  @Post()
  @RequirePermissions('payroll_settlements.create')
  @Audit('payroll_settlement.created', 'payroll_settlement')
  @ApiOperation({ summary: 'Crear una nueva liquidación (DRAFT)' })
  @ApiResponse({ status: 201, description: 'Liquidación creada' })
  async create(@Request() req: any, @Body() dto: CreateSettlementDto) {
    return this.settlementsService.create(req.user.company_id, dto, req.user.sub);
  }

  @Patch(':id')
  @RequirePermissions('payroll_settlements.edit')
  @Audit('payroll_settlement.updated', 'payroll_settlement')
  @ApiOperation({ summary: 'Actualizar una liquidación (solo DRAFT)' })
  @ApiParam({ name: 'id', description: 'ID de la liquidación' })
  @ApiResponse({ status: 200, description: 'Liquidación actualizada' })
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateSettlementDto,
  ) {
    return this.settlementsService.update(req.user.company_id, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('payroll_settlements.delete')
  @Audit('payroll_settlement.deleted', 'payroll_settlement')
  @ApiOperation({ summary: 'Eliminar una liquidación (solo DRAFT)' })
  @ApiParam({ name: 'id', description: 'ID de la liquidación' })
  @ApiResponse({ status: 200, description: 'Liquidación eliminada' })
  async remove(@Request() req: any, @Param('id') id: string) {
    return this.settlementsService.remove(req.user.company_id, id);
  }

  // ==================== EMPLOYEES ====================

  @Post(':id/employees')
  @RequirePermissions('payroll_settlements.edit')
  @Audit('payroll_settlement.employees_added', 'payroll_settlement')
  @ApiOperation({ summary: 'Agregar empleados específicos a la liquidación' })
  @ApiParam({ name: 'id', description: 'ID de la liquidación' })
  @ApiResponse({ status: 200, description: 'Empleados agregados' })
  async addEmployees(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: AddEmployeesDto,
  ) {
    return this.settlementsService.addEmployees(req.user.company_id, id, dto.employee_ids);
  }

  @Post(':id/employees/all')
  @RequirePermissions('payroll_settlements.edit')
  @Audit('payroll_settlement.all_employees_added', 'payroll_settlement')
  @ApiOperation({ summary: 'Agregar todos los empleados activos a la liquidación' })
  @ApiParam({ name: 'id', description: 'ID de la liquidación' })
  @ApiResponse({ status: 200, description: 'Empleados agregados' })
  async addAllEmployees(@Request() req: any, @Param('id') id: string) {
    return this.settlementsService.addAllEmployees(req.user.company_id, id);
  }

  @Patch(':id/details/:detailId')
  @RequirePermissions('payroll_settlements.edit')
  @ApiOperation({ summary: 'Actualizar días trabajados de un empleado' })
  @ApiParam({ name: 'id', description: 'ID de la liquidación' })
  @ApiParam({ name: 'detailId', description: 'ID del detalle' })
  @ApiResponse({ status: 200, description: 'Días actualizados' })
  async updateDetailDaysWorked(
    @Request() req: any,
    @Param('id') id: string,
    @Param('detailId') detailId: string,
    @Body() body: { days_worked: number },
  ) {
    return this.settlementsService.updateDetailDaysWorked(
      req.user.company_id, id, detailId, body.days_worked,
    );
  }

  @Delete(':id/details/:detailId')
  @RequirePermissions('payroll_settlements.edit')
  @Audit('payroll_settlement.employee_removed', 'payroll_settlement')
  @ApiOperation({ summary: 'Eliminar un empleado de la liquidación' })
  @ApiParam({ name: 'id', description: 'ID de la liquidación' })
  @ApiParam({ name: 'detailId', description: 'ID del detalle a eliminar' })
  @ApiResponse({ status: 200, description: 'Empleado eliminado' })
  async removeEmployee(
    @Request() req: any,
    @Param('id') id: string,
    @Param('detailId') detailId: string,
  ) {
    return this.settlementsService.removeEmployee(req.user.company_id, id, detailId);
  }

  // ==================== CALCULATION ====================

  @Post(':id/calculate')
  @RequirePermissions('payroll_settlements.calculate')
  @Audit('payroll_settlement.calculated', 'payroll_settlement')
  @ApiOperation({ summary: 'Calcular la liquidación completa (todos los empleados)' })
  @ApiParam({ name: 'id', description: 'ID de la liquidación' })
  @ApiResponse({ status: 200, description: 'Liquidación calculada' })
  async calculate(@Request() req: any, @Param('id') id: string) {
    return this.settlementsService.calculate(req.user.company_id, id);
  }

  @Post(':id/details/:detailId/recalculate')
  @RequirePermissions('payroll_settlements.calculate')
  @Audit('payroll_settlement.employee_recalculated', 'payroll_settlement')
  @ApiOperation({ summary: 'Recalcular un empleado específico' })
  @ApiParam({ name: 'id', description: 'ID de la liquidación' })
  @ApiParam({ name: 'detailId', description: 'ID del detalle a recalcular' })
  @ApiResponse({ status: 200, description: 'Empleado recalculado' })
  async recalculateEmployee(
    @Request() req: any,
    @Param('id') id: string,
    @Param('detailId') detailId: string,
  ) {
    return this.settlementsService.recalculateEmployee(req.user.company_id, id, detailId);
  }

  // ==================== WORKFLOW ====================

  @Post(':id/approve')
  @RequirePermissions('payroll_settlements.approve')
  @Audit('payroll_settlement.approved', 'payroll_settlement')
  @ApiOperation({ summary: 'Aprobar una liquidación calculada' })
  @ApiParam({ name: 'id', description: 'ID de la liquidación' })
  @ApiResponse({ status: 200, description: 'Liquidación aprobada' })
  async approve(@Request() req: any, @Param('id') id: string) {
    return this.settlementsService.approve(req.user.company_id, id, req.user.sub);
  }

  @Post(':id/void')
  @RequirePermissions('payroll_settlements.void')
  @Audit('payroll_settlement.voided', 'payroll_settlement')
  @ApiOperation({ summary: 'Anular una liquidación' })
  @ApiParam({ name: 'id', description: 'ID de la liquidación' })
  @ApiResponse({ status: 200, description: 'Liquidación anulada' })
  async voidSettlement(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    return this.settlementsService.void(req.user.company_id, id, body?.reason);
  }

  // ==================== PILA ====================

  @Post(':id/generate-pila')
  @RequirePermissions('payroll_settlements.approve')
  @Audit('payroll_settlement.pila_generated', 'payroll_settlement')
  @ApiOperation({ summary: 'Generar archivo PILA para la liquidación' })
  @ApiParam({ name: 'id', description: 'ID de la liquidación' })
  @ApiResponse({ status: 200, description: 'Archivo PILA generado' })
  async generatePila(@Request() req: any, @Param('id') id: string) {
    return this.settlementsService.generatePila(req.user.company_id, id);
  }

  // ==================== PAYSLIPS ====================

  @Post(':id/send-payslips')
  @RequirePermissions('payroll_settlements.approve')
  @Audit('payroll_settlement.payslips_sent', 'payroll_settlement')
  @ApiOperation({ summary: 'Enviar desprendibles de pago a empleados por email' })
  @ApiParam({ name: 'id', description: 'ID de la liquidación' })
  @ApiResponse({ status: 200, description: 'Desprendibles enviados' })
  async sendPayslips(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { employee_ids?: string[] },
  ) {
    return this.settlementsService.sendPayslips(req.user.company_id, id, body.employee_ids);
  }
}
