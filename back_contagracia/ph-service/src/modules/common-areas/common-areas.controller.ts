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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Audit } from '@contagracia/shared-modules';
import { CommonAreasService } from './common-areas.service';
import {
  CreateCommonAreaDto,
  UpdateCommonAreaDto,
  CreateReservationDto,
} from './dto';

@ApiTags('PH Common Areas')
@ApiBearerAuth()
@Controller('companies/:companyId/ph/common-areas')
export class CommonAreasController {
  constructor(private readonly service: CommonAreasService) {}

  // ==================== AREAS COMUNES ====================

  /**
   * Permission: ph.common_areas.view
   * Listar areas comunes
   */
  @Get()
  @ApiOperation({ summary: 'Listar areas comunes' })
  @ApiParam({ name: 'companyId', description: 'ID de la empresa' })
  @ApiQuery({ name: 'condominium_id', required: false, description: 'Filtrar por condominio' })
  @ApiQuery({ name: 'is_active', required: false, description: 'Filtrar por estado activo' })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Lista de areas comunes' })
  async findAll(
    @Param('companyId') companyId: string,
    @Query('condominium_id') condominium_id?: string,
    @Query('is_active') is_active?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ): Promise<any> {
    return this.service.findAll(companyId, {
      condominium_id,
      is_active,
      skip,
      take,
    });
  }

  /**
   * Permission: ph.reservations.view
   * Listar TODAS las reservas de la empresa (todas las areas)
   */
  @Get('all-reservations')
  @ApiOperation({ summary: 'Listar todas las reservas de la empresa' })
  @ApiParam({ name: 'companyId', description: 'ID de la empresa' })
  @ApiQuery({ name: 'condominium_id', required: false, description: 'Filtrar por condominio' })
  @ApiQuery({ name: 'status', required: false, description: 'Filtrar por estado' })
  @ApiQuery({ name: 'date_from', required: false, description: 'Fecha desde (YYYY-MM-DD)' })
  @ApiQuery({ name: 'date_to', required: false, description: 'Fecha hasta (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Lista de todas las reservas' })
  async getAllReservations(
    @Param('companyId') companyId: string,
    @Query('condominium_id') condominium_id?: string,
    @Query('status') status?: string,
    @Query('date_from') date_from?: string,
    @Query('date_to') date_to?: string,
  ): Promise<any> {
    return this.service.getAllReservations(companyId, {
      condominium_id,
      status,
      date_from,
      date_to,
    });
  }

  /**
   * Permission: ph.common_areas.view
   * Obtener un area comun por ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Obtener un area comun por ID' })
  @ApiParam({ name: 'companyId', description: 'ID de la empresa' })
  @ApiParam({ name: 'id', description: 'ID del area comun' })
  @ApiResponse({ status: 200, description: 'Detalle del area comun' })
  @ApiResponse({ status: 404, description: 'Area comun no encontrada' })
  async findOne(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ): Promise<any> {
    return this.service.findOne(companyId, id);
  }

  /**
   * Permission: ph.common_areas.create
   * Crear un area comun
   */
  @Post()
  @ApiOperation({ summary: 'Crear un area comun' })
  @ApiParam({ name: 'companyId', description: 'ID de la empresa' })
  @ApiResponse({ status: 201, description: 'Area comun creada' })
  @Audit('common_area.created', 'common_area')
  async create(
    @Param('companyId') companyId: string,
    @Request() req: any,
    @Body() dto: CreateCommonAreaDto,
  ): Promise<any> {
    const userId = req.user.sub;
    return this.service.create(companyId, userId, dto);
  }

  /**
   * Permission: ph.common_areas.edit
   * Actualizar un area comun
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar un area comun' })
  @ApiParam({ name: 'companyId', description: 'ID de la empresa' })
  @ApiParam({ name: 'id', description: 'ID del area comun' })
  @ApiResponse({ status: 200, description: 'Area comun actualizada' })
  @ApiResponse({ status: 404, description: 'Area comun no encontrada' })
  @Audit('common_area.updated', 'common_area')
  async update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCommonAreaDto,
  ): Promise<any> {
    return this.service.update(companyId, id, dto);
  }

  /**
   * Permission: ph.common_areas.delete
   * Desactivar un area comun (soft delete)
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Desactivar un area comun (soft delete)' })
  @ApiParam({ name: 'companyId', description: 'ID de la empresa' })
  @ApiParam({ name: 'id', description: 'ID del area comun' })
  @ApiResponse({ status: 200, description: 'Area comun desactivada' })
  @ApiResponse({ status: 404, description: 'Area comun no encontrada' })
  @Audit('common_area.deleted', 'common_area')
  async remove(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ): Promise<any> {
    return this.service.remove(companyId, id);
  }

  // ==================== RESERVAS ====================

  /**
   * Permission: ph.reservations.view
   * Listar reservas de un area comun
   */
  @Get(':areaId/reservations')
  @ApiOperation({ summary: 'Listar reservas de un area comun' })
  @ApiParam({ name: 'companyId', description: 'ID de la empresa' })
  @ApiParam({ name: 'areaId', description: 'ID del area comun' })
  @ApiQuery({ name: 'status', required: false, description: 'Filtrar por estado' })
  @ApiQuery({ name: 'date_from', required: false, description: 'Fecha desde (YYYY-MM-DD)' })
  @ApiQuery({ name: 'date_to', required: false, description: 'Fecha hasta (YYYY-MM-DD)' })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Lista de reservas' })
  async getReservations(
    @Param('companyId') companyId: string,
    @Param('areaId') areaId: string,
    @Query('status') status?: string,
    @Query('date_from') date_from?: string,
    @Query('date_to') date_to?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ): Promise<any> {
    return this.service.getReservations(companyId, areaId, {
      status,
      date_from,
      date_to,
      skip,
      take,
    });
  }

  /**
   * Permission: ph.reservations.view
   * Verificar disponibilidad de un area comun
   */
  @Get(':areaId/reservations/check-availability')
  @ApiOperation({ summary: 'Verificar disponibilidad de un area comun' })
  @ApiParam({ name: 'companyId', description: 'ID de la empresa' })
  @ApiParam({ name: 'areaId', description: 'ID del area comun' })
  @ApiQuery({ name: 'date', required: true, description: 'Fecha (YYYY-MM-DD)' })
  @ApiQuery({ name: 'start_time', required: true, description: 'Hora inicio (ej: "14:00")' })
  @ApiQuery({ name: 'end_time', required: true, description: 'Hora fin (ej: "18:00")' })
  @ApiResponse({ status: 200, description: 'Resultado de disponibilidad' })
  async checkAvailability(
    @Param('companyId') companyId: string,
    @Param('areaId') areaId: string,
    @Query('date') date: string,
    @Query('start_time') start_time: string,
    @Query('end_time') end_time: string,
  ): Promise<any> {
    return this.service.checkAvailability(companyId, areaId, {
      date,
      start_time,
      end_time,
    });
  }

  /**
   * Permission: ph.reservations.create
   * Crear una reserva en un area comun
   */
  @Post(':areaId/reservations')
  @ApiOperation({ summary: 'Crear una reserva en un area comun' })
  @ApiParam({ name: 'companyId', description: 'ID de la empresa' })
  @ApiParam({ name: 'areaId', description: 'ID del area comun' })
  @ApiResponse({ status: 201, description: 'Reserva creada' })
  @Audit('reservation.created', 'reservation')
  async createReservation(
    @Param('companyId') companyId: string,
    @Param('areaId') areaId: string,
    @Request() req: any,
    @Body() dto: CreateReservationDto,
  ): Promise<any> {
    const userId = req.user.sub;
    return this.service.createReservation(companyId, areaId, userId, dto);
  }

  /**
   * Permission: ph.reservations.confirm
   * Confirmar una reserva
   */
  @Patch(':areaId/reservations/:reservationId/confirm')
  @ApiOperation({ summary: 'Confirmar una reserva' })
  @ApiParam({ name: 'companyId', description: 'ID de la empresa' })
  @ApiParam({ name: 'areaId', description: 'ID del area comun' })
  @ApiParam({ name: 'reservationId', description: 'ID de la reserva' })
  @ApiResponse({ status: 200, description: 'Reserva confirmada' })
  @ApiResponse({ status: 404, description: 'Reserva no encontrada' })
  @Audit('reservation.confirmed', 'reservation')
  async confirmReservation(
    @Param('companyId') companyId: string,
    @Param('areaId') areaId: string,
    @Param('reservationId') reservationId: string,
    @Request() req: any,
  ): Promise<any> {
    const userId = req.user.sub;
    return this.service.confirmReservation(companyId, areaId, reservationId, userId);
  }

  /**
   * Permission: ph.reservations.cancel
   * Cancelar una reserva
   */
  @Patch(':areaId/reservations/:reservationId/cancel')
  @ApiOperation({ summary: 'Cancelar una reserva' })
  @ApiParam({ name: 'companyId', description: 'ID de la empresa' })
  @ApiParam({ name: 'areaId', description: 'ID del area comun' })
  @ApiParam({ name: 'reservationId', description: 'ID de la reserva' })
  @ApiResponse({ status: 200, description: 'Reserva cancelada' })
  @ApiResponse({ status: 404, description: 'Reserva no encontrada' })
  @Audit('reservation.cancelled', 'reservation')
  async cancelReservation(
    @Param('companyId') companyId: string,
    @Param('areaId') areaId: string,
    @Param('reservationId') reservationId: string,
    @Request() req: any,
    @Body() body: { cancellation_reason?: string },
  ): Promise<any> {
    const userId = req.user.sub;
    return this.service.cancelReservation(
      companyId,
      areaId,
      reservationId,
      userId,
      body?.cancellation_reason,
    );
  }

  /**
   * Permission: ph.reservations.complete
   * Marcar una reserva como completada
   */
  @Patch(':areaId/reservations/:reservationId/complete')
  @ApiOperation({ summary: 'Marcar una reserva como completada' })
  @ApiParam({ name: 'companyId', description: 'ID de la empresa' })
  @ApiParam({ name: 'areaId', description: 'ID del area comun' })
  @ApiParam({ name: 'reservationId', description: 'ID de la reserva' })
  @ApiResponse({ status: 200, description: 'Reserva completada' })
  @ApiResponse({ status: 404, description: 'Reserva no encontrada' })
  @Audit('reservation.completed', 'reservation')
  async completeReservation(
    @Param('companyId') companyId: string,
    @Param('areaId') areaId: string,
    @Param('reservationId') reservationId: string,
  ): Promise<any> {
    return this.service.completeReservation(companyId, areaId, reservationId);
  }

  /**
   * Permission: ph.reservations.edit
   * Reactivar una reserva cancelada
   */
  @Patch(':areaId/reservations/:reservationId/reactivate')
  @ApiOperation({ summary: 'Reactivar una reserva cancelada' })
  @ApiParam({ name: 'companyId', description: 'ID de la empresa' })
  @ApiParam({ name: 'areaId', description: 'ID del area comun' })
  @ApiParam({ name: 'reservationId', description: 'ID de la reserva' })
  @ApiResponse({ status: 200, description: 'Reserva reactivada' })
  @ApiResponse({ status: 400, description: 'Solo se pueden reactivar reservas canceladas' })
  @Audit('reservation.reactivated', 'reservation')
  async reactivateReservation(
    @Param('companyId') companyId: string,
    @Param('areaId') areaId: string,
    @Param('reservationId') reservationId: string,
  ): Promise<any> {
    return this.service.reactivateReservation(companyId, areaId, reservationId);
  }
}
