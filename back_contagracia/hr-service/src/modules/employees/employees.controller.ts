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
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { EmployeesService } from './employees.service';
import {
  CreateEmployeeDto,
  UpdateEmployeeDto,
  TerminateEmployeeDto,
  QueryEmployeesDto,
  CreateContractDto,
  RenewContractDto,
  UpdateSalaryDto,
  LinkUserDto,
} from './dto';
import {
  JwtAuthGuard,
  RequirePermissions,
  Audit,
} from '@contagracia/shared-modules';

@ApiTags('Empleados (HR)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  // ==================== LISTADO ====================

  /**
   * Listar empleados con filtros y paginación
   * Permiso: employees.view
   */
  @Get()
  @RequirePermissions('employees.view')
  @ApiOperation({ summary: 'Listar empleados' })
  @ApiResponse({ status: 200, description: 'Lista de empleados' })
  async findAll(@Request() req: any, @Query() query: QueryEmployeesDto) {
    const companyId = req.user.company_id;
    return this.employeesService.findAll(companyId, companyId, query);
  }

  /**
   * Listar roles disponibles para asignar a usuarios
   * Permiso: employees.view
   */
  @Get('roles')
  @RequirePermissions('employees.view')
  @ApiOperation({ summary: 'Listar roles disponibles' })
  @ApiResponse({ status: 200, description: 'Lista de roles' })
  async getRoles(@Request() req: any) {
    const companyId = req.user.company_id;
    return this.employeesService.findRoles(companyId, companyId);
  }

  /**
   * Listar usuarios sin vincular a un tercero
   * Permiso: employees.view
   */
  @Get('unlinked-users')
  @RequirePermissions('employees.view')
  @ApiOperation({ summary: 'Listar usuarios no vinculados a terceros' })
  @ApiResponse({ status: 200, description: 'Lista de usuarios sin vincular' })
  async getUnlinkedUsers(@Request() req: any) {
    const companyId = req.user.company_id;
    return this.employeesService.findUnlinkedUsers(companyId, companyId);
  }

  /**
   * Estadísticas de empleados
   * Permiso: employees.view
   */
  @Get('stats')
  @RequirePermissions('employees.view')
  @ApiOperation({ summary: 'Obtener estadísticas de empleados' })
  @ApiResponse({ status: 200, description: 'Estadísticas de empleados' })
  async getStats(@Request() req: any) {
    const companyId = req.user.company_id;
    return this.employeesService.getStats(companyId, companyId);
  }

  /**
   * Verificar si existe un empleado por número de identificación
   * Permiso: employees.view
   */
  @Get('exists/:identificationNumber')
  @RequirePermissions('employees.view')
  @ApiOperation({ summary: 'Verificar existencia de empleado por identificación' })
  @ApiParam({ name: 'identificationNumber', description: 'Número de identificación' })
  @ApiResponse({ status: 200, description: 'Resultado de la verificación' })
  async exists(@Request() req: any, @Param('identificationNumber') identificationNumber: string): Promise<any> {
    const companyId = req.user.company_id;
    return this.employeesService.exists(companyId, companyId, identificationNumber);
  }

  // ==================== DETALLE ====================

  /**
   * Obtener empleado por ID
   * Permiso: employees.view_detail
   */
  @Get(':id')
  @RequirePermissions('employees.view_detail')
  @ApiOperation({ summary: 'Obtener detalle de empleado' })
  @ApiParam({ name: 'id', description: 'ID del empleado (ThirdParty)' })
  @ApiResponse({ status: 200, description: 'Detalle del empleado' })
  @ApiResponse({ status: 404, description: 'Empleado no encontrado' })
  async findOne(@Request() req: any, @Param('id') id: string) {
    const companyId = req.user.company_id;
    return this.employeesService.findOne(companyId, companyId, id);
  }

  // ==================== CREAR ====================

  /**
   * Crear nuevo empleado
   * Permiso: employees.create
   */
  @Post()
  @RequirePermissions('employees.create')
  @Audit('employee.created', 'employee')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear nuevo empleado (ThirdParty + Profile + Contract + Salary)' })
  @ApiResponse({ status: 201, description: 'Empleado creado' })
  @ApiResponse({ status: 409, description: 'Ya existe empleado con esa identificación' })
  async create(@Request() req: any, @Body() dto: CreateEmployeeDto) {
    const companyId = req.user.company_id;
    return this.employeesService.create(companyId, companyId, dto);
  }

  // ==================== ACTUALIZAR ====================

  /**
   * Actualizar datos de empleado (ThirdParty + Profile)
   * Permiso: employees.edit
   */
  @Patch(':id')
  @RequirePermissions('employees.edit')
  @Audit('employee.updated', 'employee')
  @ApiOperation({ summary: 'Actualizar datos de empleado' })
  @ApiParam({ name: 'id', description: 'ID del empleado' })
  @ApiResponse({ status: 200, description: 'Empleado actualizado' })
  @ApiResponse({ status: 404, description: 'Empleado no encontrado' })
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto,
  ) {
    const companyId = req.user.company_id;
    return this.employeesService.update(companyId, companyId, id, dto);
  }

  // ==================== CAMBIOS DE ESTADO ====================

  /**
   * Activar empleado
   * Permiso: employees.activate
   */
  @Patch(':id/activate')
  @RequirePermissions('employees.activate')
  @Audit('employee.activated', 'employee')
  @ApiOperation({ summary: 'Activar empleado' })
  @ApiParam({ name: 'id', description: 'ID del empleado' })
  @ApiResponse({ status: 200, description: 'Empleado activado' })
  @ApiResponse({ status: 404, description: 'Empleado no encontrado' })
  async activate(@Request() req: any, @Param('id') id: string) {
    const companyId = req.user.company_id;
    return this.employeesService.activate(companyId, companyId, id);
  }

  /**
   * Desactivar empleado
   * Permiso: employees.deactivate
   */
  @Patch(':id/deactivate')
  @RequirePermissions('employees.deactivate')
  @Audit('employee.deactivated', 'employee')
  @ApiOperation({ summary: 'Desactivar empleado' })
  @ApiParam({ name: 'id', description: 'ID del empleado' })
  @ApiResponse({ status: 200, description: 'Empleado desactivado' })
  @ApiResponse({ status: 404, description: 'Empleado no encontrado' })
  async deactivate(@Request() req: any, @Param('id') id: string) {
    const companyId = req.user.company_id;
    return this.employeesService.deactivate(companyId, companyId, id);
  }

  /**
   * Retirar empleado (terminar contrato + cerrar salario)
   * Permiso: employees.terminate
   */
  @Patch(':id/terminate')
  @RequirePermissions('employees.terminate')
  @Audit('employee.terminated', 'employee')
  @ApiOperation({ summary: 'Retirar empleado (terminar contrato)' })
  @ApiParam({ name: 'id', description: 'ID del empleado' })
  @ApiResponse({ status: 200, description: 'Empleado retirado' })
  @ApiResponse({ status: 404, description: 'Empleado no encontrado' })
  async terminate(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: TerminateEmployeeDto,
  ) {
    const companyId = req.user.company_id;
    return this.employeesService.terminate(companyId, companyId, id, dto);
  }

  // ==================== CONTRATOS ====================

  /**
   * Obtener historial de contratos de un empleado
   * Permiso: employees.contracts.view
   */
  @Get(':id/contracts')
  @RequirePermissions('employees.contracts.view')
  @ApiOperation({ summary: 'Historial de contratos del empleado' })
  @ApiParam({ name: 'id', description: 'ID del empleado' })
  @ApiResponse({ status: 200, description: 'Lista de contratos' })
  async getContracts(@Request() req: any, @Param('id') id: string): Promise<any> {
    const companyId = req.user.company_id;
    return this.employeesService.getContracts(companyId, companyId, id);
  }

  /**
   * Crear nuevo contrato (cierra el anterior)
   * Permiso: employees.contracts.create
   */
  @Post(':id/contracts')
  @RequirePermissions('employees.contracts.create')
  @Audit('employee.contract_created', 'employee')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear nuevo contrato para el empleado' })
  @ApiParam({ name: 'id', description: 'ID del empleado' })
  @ApiResponse({ status: 201, description: 'Contrato creado' })
  async createContract(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: CreateContractDto,
  ): Promise<any> {
    const companyId = req.user.company_id;
    return this.employeesService.createContract(companyId, companyId, id, dto);
  }

  /**
   * Editar un contrato existente
   * Permiso: employees.contracts.edit
   */
  @Patch(':id/contracts/:contractId')
  @RequirePermissions('employees.contracts.edit')
  @Audit('employee.contract_updated', 'employee')
  @ApiOperation({ summary: 'Editar contrato del empleado' })
  @ApiParam({ name: 'id', description: 'ID del empleado' })
  @ApiParam({ name: 'contractId', description: 'ID del contrato' })
  @ApiResponse({ status: 200, description: 'Contrato actualizado' })
  async updateContract(
    @Request() req: any,
    @Param('id') id: string,
    @Param('contractId') contractId: string,
    @Body() dto: CreateContractDto,
  ): Promise<any> {
    const companyId = req.user.company_id;
    return this.employeesService.updateContract(companyId, companyId, id, contractId, dto);
  }

  /**
   * Renovar contrato (nuevo contrato basado en el actual)
   * Permiso: employees.contracts.renew
   */
  @Post(':id/contracts/:contractId/renew')
  @RequirePermissions('employees.contracts.renew')
  @Audit('employee.contract_renewed', 'employee')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Renovar contrato del empleado' })
  @ApiParam({ name: 'id', description: 'ID del empleado' })
  @ApiParam({ name: 'contractId', description: 'ID del contrato a renovar' })
  @ApiResponse({ status: 201, description: 'Contrato renovado' })
  async renewContract(
    @Request() req: any,
    @Param('id') id: string,
    @Param('contractId') contractId: string,
    @Body() dto: RenewContractDto,
  ): Promise<any> {
    const companyId = req.user.company_id;
    return this.employeesService.renewContract(companyId, companyId, id, contractId, dto);
  }

  // ==================== SALARIO ====================

  /**
   * Obtener salario actual del empleado
   * Permiso: employees.salary.view
   */
  @Get(':id/salary')
  @RequirePermissions('employees.salary.view')
  @ApiOperation({ summary: 'Obtener salario actual del empleado' })
  @ApiParam({ name: 'id', description: 'ID del empleado' })
  @ApiResponse({ status: 200, description: 'Salario actual' })
  async getCurrentSalary(@Request() req: any, @Param('id') id: string): Promise<any> {
    const companyId = req.user.company_id;
    return this.employeesService.getCurrentSalary(companyId, companyId, id);
  }

  /**
   * Obtener historial de salarios
   * Permiso: employees.salary.view
   */
  @Get(':id/salary/history')
  @RequirePermissions('employees.salary.view')
  @ApiOperation({ summary: 'Historial de salarios del empleado' })
  @ApiParam({ name: 'id', description: 'ID del empleado' })
  @ApiResponse({ status: 200, description: 'Historial de salarios' })
  async getSalaryHistory(@Request() req: any, @Param('id') id: string): Promise<any> {
    const companyId = req.user.company_id;
    return this.employeesService.getSalaryHistory(companyId, companyId, id);
  }

  /**
   * Cambiar salario del empleado (crea nuevo registro, cierra anterior)
   * Permiso: employees.salary.edit
   */
  @Patch(':id/salary')
  @RequirePermissions('employees.salary.edit')
  @Audit('employee.salary_updated', 'employee')
  @ApiOperation({ summary: 'Actualizar salario del empleado' })
  @ApiParam({ name: 'id', description: 'ID del empleado' })
  @ApiResponse({ status: 200, description: 'Salario actualizado' })
  @ApiResponse({ status: 404, description: 'Empleado no encontrado' })
  async updateSalary(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateSalaryDto,
  ): Promise<any> {
    const companyId = req.user.company_id;
    return this.employeesService.updateSalary(companyId, companyId, id, dto);
  }

  // ==================== USUARIO ====================

  /**
   * Vincular o crear cuenta de usuario para un empleado
   * Permiso: employees.edit
   */
  @Post(':id/link-user')
  @RequirePermissions('employees.edit')
  @Audit('employee.user_linked', 'employee')
  @ApiOperation({ summary: 'Vincular o crear cuenta de usuario para empleado' })
  @ApiParam({ name: 'id', description: 'ID del empleado' })
  @ApiResponse({ status: 201, description: 'Usuario vinculado/creado' })
  @ApiResponse({ status: 404, description: 'Empleado no encontrado' })
  @ApiResponse({ status: 409, description: 'Ya tiene usuario vinculado o email duplicado' })
  async linkUser(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: LinkUserDto,
  ): Promise<any> {
    const companyId = req.user.company_id;
    return this.employeesService.linkUser(companyId, companyId, id, dto);
  }

  /**
   * Desvincular cuenta de usuario de un empleado (no elimina el usuario)
   * Permiso: employees.edit
   */
  @Delete(':id/unlink-user')
  @RequirePermissions('employees.edit')
  @Audit('employee.user_unlinked', 'employee')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Desvincular cuenta de usuario del empleado' })
  @ApiParam({ name: 'id', description: 'ID del empleado' })
  @ApiResponse({ status: 200, description: 'Usuario desvinculado' })
  @ApiResponse({ status: 404, description: 'Empleado no encontrado' })
  async unlinkUser(@Request() req: any, @Param('id') id: string): Promise<any> {
    const companyId = req.user.company_id;
    return this.employeesService.unlinkUser(companyId, companyId, id);
  }

  // ==================== ELIMINAR ====================

  /**
   * Eliminar empleado (quita rol EMPLOYEE + elimina perfil en cascada)
   * Permiso: employees.delete
   */
  @Delete(':id')
  @RequirePermissions('employees.delete')
  @Audit('employee.deleted', 'employee')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar empleado' })
  @ApiParam({ name: 'id', description: 'ID del empleado' })
  @ApiResponse({ status: 200, description: 'Empleado eliminado' })
  @ApiResponse({ status: 404, description: 'Empleado no encontrado' })
  async delete(@Request() req: any, @Param('id') id: string) {
    const companyId = req.user.company_id;
    return this.employeesService.delete(companyId, companyId, id);
  }
}
