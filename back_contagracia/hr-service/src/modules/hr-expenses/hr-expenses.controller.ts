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
import { HrExpensesService } from './hr-expenses.service';
import {
  CreateTravelExpenseDto,
  RequestTravelExpenseDto,
  QueryTravelExpensesDto,
  EditTravelExpenseDto,
  ApproveTravelExpenseDto,
  RejectTravelExpenseDto,
} from './dto';
import {
  JwtAuthGuard,
  RequirePermissions,
  RequireAnyPermission,
  Audit,
} from '@contagracia/shared-modules';

@ApiTags('Gastos Viaticos (HR)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('hr-expenses')
export class HrExpensesController {
  constructor(private readonly service: HrExpensesService) {}

  // ==================== LISTADO Y DETALLE ====================

  @Get()
  @RequireAnyPermission('hr_expenses.view', 'hr_expenses.request')
  @ApiOperation({ summary: 'Listar gastos de viaticos' })
  @ApiResponse({ status: 200, description: 'Lista de viaticos' })
  async findAll(@Request() req: any, @Query() query: QueryTravelExpensesDto) {
    const companyId = req.user.company_id;
    return this.service.findAll(companyId, companyId, query);
  }

  @Get('stats')
  @RequirePermissions('hr_expenses.view')
  @ApiOperation({ summary: 'Estadisticas de gastos de viaticos' })
  @ApiResponse({ status: 200, description: 'Estadisticas' })
  async getStats(@Request() req: any) {
    const companyId = req.user.company_id;
    return this.service.getStats(companyId, companyId);
  }

  @Get(':id')
  @RequireAnyPermission('hr_expenses.view', 'hr_expenses.request')
  @ApiOperation({ summary: 'Detalle de un gasto de viatico' })
  @ApiParam({ name: 'id', description: 'ID del viatico' })
  @ApiResponse({ status: 200, description: 'Detalle del viatico' })
  async findOne(@Request() req: any, @Param('id') id: string) {
    const companyId = req.user.company_id;
    return this.service.findOne(companyId, companyId, id);
  }

  // ==================== CREACION ====================

  @Post()
  @Audit('travel_expense.created', 'travel_expense')
  @RequirePermissions('hr_expenses.create')
  @ApiOperation({ summary: 'Crear gasto de viatico (admin)' })
  @ApiResponse({ status: 201, description: 'Viatico creado' })
  async create(@Request() req: any, @Body() dto: CreateTravelExpenseDto) {
    const companyId = req.user.company_id;
    const userId = req.user.sub || req.user.id;
    return this.service.create(companyId, companyId, userId, dto);
  }

  @Post('request')
  @Audit('travel_expense.requested', 'travel_expense')
  @RequirePermissions('hr_expenses.request')
  @ApiOperation({ summary: 'Solicitar viatico (empleado)' })
  @ApiResponse({ status: 201, description: 'Solicitud enviada' })
  async requestExpense(@Request() req: any, @Body() dto: RequestTravelExpenseDto) {
    const companyId = req.user.company_id;
    const userId = req.user.sub || req.user.id;
    return this.service.requestExpense(companyId, companyId, userId, dto);
  }

  // ==================== EDICION ====================

  @Patch(':id')
  @Audit('travel_expense.updated', 'travel_expense')
  @RequirePermissions('hr_expenses.edit')
  @ApiOperation({ summary: 'Editar gasto de viatico' })
  @ApiParam({ name: 'id', description: 'ID del viatico' })
  @ApiResponse({ status: 200, description: 'Viatico actualizado' })
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: EditTravelExpenseDto,
  ) {
    const companyId = req.user.company_id;
    return this.service.update(companyId, companyId, id, dto);
  }

  // ==================== APROBACION / RECHAZO ====================

  @Patch(':id/approve')
  @Audit('travel_expense.approved', 'travel_expense')
  @RequirePermissions('hr_expenses.approve')
  @ApiOperation({ summary: 'Aprobar gasto de viatico' })
  @ApiParam({ name: 'id', description: 'ID del viatico' })
  @ApiResponse({ status: 200, description: 'Viatico aprobado' })
  async approve(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: ApproveTravelExpenseDto,
  ) {
    const companyId = req.user.company_id;
    const userId = req.user.sub || req.user.id;
    return this.service.approve(companyId, companyId, userId, id, dto);
  }

  @Patch(':id/reject')
  @Audit('travel_expense.rejected', 'travel_expense')
  @RequirePermissions('hr_expenses.reject')
  @ApiOperation({ summary: 'Rechazar gasto de viatico' })
  @ApiParam({ name: 'id', description: 'ID del viatico' })
  @ApiResponse({ status: 200, description: 'Viatico rechazado' })
  async reject(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: RejectTravelExpenseDto,
  ) {
    const companyId = req.user.company_id;
    const userId = req.user.sub || req.user.id;
    return this.service.reject(companyId, companyId, userId, id, dto);
  }

  // ==================== ELIMINACION ====================

  @Delete(':id')
  @Audit('travel_expense.deleted', 'travel_expense')
  @RequirePermissions('hr_expenses.edit')
  @ApiOperation({ summary: 'Eliminar gasto de viatico (solo pendientes)' })
  @ApiParam({ name: 'id', description: 'ID del viatico' })
  @ApiResponse({ status: 200, description: 'Viatico eliminado' })
  async delete(@Request() req: any, @Param('id') id: string) {
    const companyId = req.user.company_id;
    return this.service.delete(companyId, companyId, id);
  }
}
