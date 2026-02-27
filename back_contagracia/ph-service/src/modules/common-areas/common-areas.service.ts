import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { TenantPrismaService } from '../tenant/tenant-prisma.service';
import {
  CreateCommonAreaDto,
  UpdateCommonAreaDto,
  CreateReservationDto,
} from './dto';

@Injectable()
export class CommonAreasService {
  private readonly logger = new Logger(CommonAreasService.name);

  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  // ==================== AREAS COMUNES ====================

  /**
   * Listar areas comunes con filtros y paginacion
   */
  async findAll(
    companyId: string,
    query: {
      condominium_id?: string;
      is_active?: string;
      skip?: string;
      take?: string;
    },
  ): Promise<any> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const where: any = {};

    if (query.condominium_id) {
      where.condominium_id = query.condominium_id;
    }
    if (query.is_active !== undefined) {
      where.is_active = query.is_active === 'true';
    }

    const skip = query.skip ? parseInt(query.skip, 10) : 0;
    const take = query.take ? parseInt(query.take, 10) : 50;

    const [data, total] = await Promise.all([
      db.phCommonArea.findMany({
        where,
        skip,
        take,
        orderBy: { created_at: 'desc' },
        include: {
          _count: {
            select: { reservations: true },
          },
        },
      }),
      db.phCommonArea.count({ where }),
    ]);

    return { data, total, skip, take };
  }

  /**
   * Obtener un area comun por ID
   */
  async findOne(companyId: string, id: string): Promise<any> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const area = await db.phCommonArea.findUnique({
      where: { id },
      include: {
        _count: {
          select: { reservations: true },
        },
      },
    });

    if (!area) {
      throw new NotFoundException('Area comun no encontrada');
    }

    return area;
  }

  /**
   * Crear un area comun
   */
  async create(
    companyId: string,
    userId: string,
    dto: CreateCommonAreaDto,
  ): Promise<any> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const area = await db.phCommonArea.create({
      data: {
        condominium_id: dto.condominium_id,
        name: dto.name,
        description: dto.description,
        capacity: dto.capacity,
        rental_fee: dto.rental_fee,
        requires_deposit: dto.requires_deposit,
        deposit_amount: dto.deposit_amount,
        requires_approval: dto.requires_approval,
        min_hours: dto.min_hours,
        max_hours: dto.max_hours,
        available_from: dto.available_from,
        available_to: dto.available_to,
        available_days: dto.available_days,
        created_by: userId,
      },
    });

    this.logger.log(`Area comun creada: ${area.name} (${area.id})`);

    return {
      message: 'Area comun creada exitosamente',
      data: area,
    };
  }

  /**
   * Actualizar un area comun
   */
  async update(
    companyId: string,
    id: string,
    dto: UpdateCommonAreaDto,
  ): Promise<any> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const existing = await db.phCommonArea.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Area comun no encontrada');
    }

    const area = await db.phCommonArea.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.capacity !== undefined && { capacity: dto.capacity }),
        ...(dto.rental_fee !== undefined && { rental_fee: dto.rental_fee }),
        ...(dto.requires_deposit !== undefined && { requires_deposit: dto.requires_deposit }),
        ...(dto.deposit_amount !== undefined && { deposit_amount: dto.deposit_amount }),
        ...(dto.requires_approval !== undefined && { requires_approval: dto.requires_approval }),
        ...(dto.min_hours !== undefined && { min_hours: dto.min_hours }),
        ...(dto.max_hours !== undefined && { max_hours: dto.max_hours }),
        ...(dto.available_from !== undefined && { available_from: dto.available_from }),
        ...(dto.available_to !== undefined && { available_to: dto.available_to }),
        ...(dto.available_days !== undefined && { available_days: dto.available_days }),
        ...(dto.is_active !== undefined && { is_active: dto.is_active }),
      },
    });

    return {
      message: 'Area comun actualizada exitosamente',
      data: area,
    };
  }

  /**
   * Soft delete de un area comun
   */
  async remove(companyId: string, id: string): Promise<any> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const existing = await db.phCommonArea.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Area comun no encontrada');
    }

    await db.phCommonArea.update({
      where: { id },
      data: { is_active: false },
    });

    this.logger.log(`Area comun desactivada: ${id}`);

    return { message: 'Area comun desactivada exitosamente' };
  }

  // ==================== RESERVAS ====================

  /**
   * Listar reservas de un area comun con filtros y paginacion
   */
  async getReservations(
    companyId: string,
    areaId: string,
    query: {
      status?: string;
      date_from?: string;
      date_to?: string;
      skip?: string;
      take?: string;
    },
  ): Promise<any> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const where: any = {
      common_area_id: areaId,
    };

    if (query.status) {
      where.status = query.status;
    }
    if (query.date_from) {
      where.reservation_date = {
        ...where.reservation_date,
        gte: new Date(query.date_from),
      };
    }
    if (query.date_to) {
      where.reservation_date = {
        ...where.reservation_date,
        lte: new Date(query.date_to),
      };
    }

    const skip = query.skip ? parseInt(query.skip, 10) : 0;
    const take = query.take ? parseInt(query.take, 10) : 50;

    const [data, total] = await Promise.all([
      db.phCommonAreaReservation.findMany({
        where,
        skip,
        take,
        orderBy: { reservation_date: 'desc' },
        include: {
          unit: true,
        },
      }),
      db.phCommonAreaReservation.count({ where }),
    ]);

    return { data, total, skip, take };
  }

  /**
   * Verificar disponibilidad para una fecha y rango de horas
   * Overlap: existing.start_time < end_time AND existing.end_time > start_time
   */
  async checkAvailability(
    companyId: string,
    areaId: string,
    query: { date: string; start_time: string; end_time: string },
  ): Promise<any> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    if (!query.date || !query.start_time || !query.end_time) {
      throw new BadRequestException(
        'Se requieren los parametros date, start_time y end_time',
      );
    }

    const conflicts = await db.phCommonAreaReservation.findMany({
      where: {
        common_area_id: areaId,
        reservation_date: new Date(query.date),
        status: { notIn: ['cancelled'] },
        start_time: { lt: query.end_time },
        end_time: { gt: query.start_time },
      },
      select: {
        id: true,
        reservation_date: true,
        start_time: true,
        end_time: true,
        status: true,
      },
    });

    return {
      available: conflicts.length === 0,
      conflicts,
    };
  }

  /**
   * Crear una reserva para un area comun
   */
  async createReservation(
    companyId: string,
    areaId: string,
    userId: string,
    dto: CreateReservationDto,
  ): Promise<any> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    // Verificar que el area existe
    const area = await db.phCommonArea.findUnique({ where: { id: areaId } });
    if (!area) {
      throw new NotFoundException('Area comun no encontrada');
    }

    if (!area.is_active) {
      throw new BadRequestException('El area comun no esta activa');
    }

    // Verificar disponibilidad
    const availability = await this.checkAvailability(companyId, areaId, {
      date: dto.reservation_date,
      start_time: dto.start_time,
      end_time: dto.end_time,
    });

    if (!availability.available) {
      throw new BadRequestException(
        'El horario solicitado no esta disponible. Existen reservas que se superponen.',
      );
    }

    // Verificar morosidad de la unidad
    if (dto.unit_id) {
      const overdueCount = await db.phFee.count({
        where: {
          unit_id: dto.unit_id,
          status: 'overdue',
        },
      });
      if (overdueCount > 0) {
        throw new BadRequestException(
          'No es posible realizar reservas. La unidad tiene cuotas vencidas.',
        );
      }
    }

    // Calcular tarifa total si el area tiene rental_fee
    let total_fee: number | null = null;
    if (area.rental_fee) {
      // Calcular horas de diferencia entre start_time y end_time
      const [startH, startM] = dto.start_time.split(':').map(Number);
      const [endH, endM] = dto.end_time.split(':').map(Number);
      const hours = (endH + endM / 60) - (startH + startM / 60);
      total_fee = Math.round(Number(area.rental_fee) * hours * 100) / 100;
    }

    const reservation = await db.phCommonAreaReservation.create({
      data: {
        common_area_id: areaId,
        unit_id: dto.unit_id || null,
        tercero_id: dto.tercero_id || null,
        reservation_date: new Date(dto.reservation_date),
        start_time: dto.start_time,
        end_time: dto.end_time,
        notes: dto.notes,
        total_fee,
        created_by: userId,
      },
    });

    this.logger.log(
      `Reserva creada para area ${area.name}: ${dto.reservation_date} ${dto.start_time}-${dto.end_time}`,
    );

    return {
      message: 'Reserva creada exitosamente',
      data: reservation,
    };
  }

  /**
   * Confirmar una reserva
   */
  async confirmReservation(
    companyId: string,
    areaId: string,
    reservationId: string,
    userId: string,
  ): Promise<any> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const reservation = await db.phCommonAreaReservation.findFirst({
      where: { id: reservationId, common_area_id: areaId },
    });

    if (!reservation) {
      throw new NotFoundException('Reserva no encontrada');
    }

    if (reservation.status === 'confirmed') {
      throw new BadRequestException('La reserva ya esta confirmada');
    }
    if (reservation.status === 'cancelled') {
      throw new BadRequestException('No se puede confirmar una reserva cancelada');
    }

    const updated = await db.phCommonAreaReservation.update({
      where: { id: reservationId },
      data: {
        status: 'confirmed',
        confirmed_at: new Date(),
        confirmed_by: userId,
      },
    });

    this.logger.log(`Reserva confirmada: ${reservationId}`);

    return {
      message: 'Reserva confirmada exitosamente',
      data: updated,
    };
  }

  /**
   * Cancelar una reserva
   */
  async cancelReservation(
    companyId: string,
    areaId: string,
    reservationId: string,
    userId: string,
    cancellation_reason?: string,
  ): Promise<any> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const reservation = await db.phCommonAreaReservation.findFirst({
      where: { id: reservationId, common_area_id: areaId },
    });

    if (!reservation) {
      throw new NotFoundException('Reserva no encontrada');
    }

    if (reservation.status === 'cancelled') {
      throw new BadRequestException('La reserva ya esta cancelada');
    }
    if (reservation.status === 'completed') {
      throw new BadRequestException('No se puede cancelar una reserva completada');
    }

    const updated = await db.phCommonAreaReservation.update({
      where: { id: reservationId },
      data: {
        status: 'cancelled',
        cancelled_at: new Date(),
        cancelled_by: userId,
        cancellation_reason: cancellation_reason || null,
      },
    });

    this.logger.log(`Reserva cancelada: ${reservationId}`);

    return {
      message: 'Reserva cancelada exitosamente',
      data: updated,
    };
  }

  /**
   * Marcar una reserva como completada
   */
  async completeReservation(
    companyId: string,
    areaId: string,
    reservationId: string,
  ): Promise<any> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const reservation = await db.phCommonAreaReservation.findFirst({
      where: { id: reservationId, common_area_id: areaId },
    });

    if (!reservation) {
      throw new NotFoundException('Reserva no encontrada');
    }

    if (reservation.status === 'completed') {
      throw new BadRequestException('La reserva ya esta completada');
    }
    if (reservation.status === 'cancelled') {
      throw new BadRequestException('No se puede completar una reserva cancelada');
    }

    const updated = await db.phCommonAreaReservation.update({
      where: { id: reservationId },
      data: {
        status: 'completed',
      },
    });

    this.logger.log(`Reserva completada: ${reservationId}`);

    return {
      message: 'Reserva completada exitosamente',
      data: updated,
    };
  }

  /**
   * Obtener TODAS las reservas de la empresa (todas las areas)
   */
  async getAllReservations(
    companyId: string,
    query: {
      condominium_id?: string;
      status?: string;
      date_from?: string;
      date_to?: string;
    },
  ): Promise<any> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const where: any = {};

    if (query.condominium_id) {
      where.common_area = { condominium_id: query.condominium_id };
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.date_from || query.date_to) {
      where.reservation_date = {};
      if (query.date_from)
        where.reservation_date.gte = new Date(query.date_from);
      if (query.date_to)
        where.reservation_date.lte = new Date(query.date_to);
    }

    const data = await db.phCommonAreaReservation.findMany({
      where,
      orderBy: { reservation_date: 'desc' },
      include: {
        common_area: true,
        unit: true,
      },
      take: 500,
    });

    return { data, total: data.length };
  }

  /**
   * Reactivar una reserva cancelada (vuelve a 'pending')
   */
  async reactivateReservation(
    companyId: string,
    areaId: string,
    reservationId: string,
  ): Promise<any> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const reservation = await db.phCommonAreaReservation.findFirst({
      where: { id: reservationId, common_area_id: areaId },
    });

    if (!reservation) {
      throw new NotFoundException('Reserva no encontrada');
    }

    if (reservation.status !== 'cancelled') {
      throw new BadRequestException(
        'Solo se pueden reactivar reservas canceladas',
      );
    }

    // Verificar disponibilidad antes de reactivar
    const dateStr =
      reservation.reservation_date instanceof Date
        ? reservation.reservation_date.toISOString().split('T')[0]
        : String(reservation.reservation_date).split('T')[0];

    const availability = await this.checkAvailability(companyId, areaId, {
      date: dateStr,
      start_time: reservation.start_time,
      end_time: reservation.end_time,
    });

    if (!availability.available) {
      throw new BadRequestException(
        'El horario ya no esta disponible. Existe otra reserva en ese horario.',
      );
    }

    const updated = await db.phCommonAreaReservation.update({
      where: { id: reservationId },
      data: {
        status: 'pending',
        cancelled_at: null,
        cancelled_by: null,
        cancellation_reason: null,
      },
    });

    this.logger.log(`Reserva reactivada: ${reservationId}`);

    return {
      message: 'Reserva reactivada exitosamente',
      data: updated,
    };
  }
}
