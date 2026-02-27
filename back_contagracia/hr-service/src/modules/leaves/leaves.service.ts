import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { TenantContextService } from '@contagracia/shared-modules';
import { ColombianHolidaysService } from '../time-attendance/colombian-holidays.service';
import {
  CreateLeaveDto,
  RequestLeaveDto,
  QueryLeavesDto,
  EditLeaveDto,
  ApproveLeaveDto,
  RejectLeaveDto,
} from './dto';

const LEAVE_TYPE_LABELS: Record<string, string> = {
  SICK_LEAVE: 'Incapacidad Medica',
  VACATION: 'Vacaciones',
  VACATION_MONETIZED: 'Vacaciones Monetizadas',
  PERSONAL_LEAVE: 'Permiso Personal',
  COMPENSATORY_TIME: 'Tiempo Compensatorio',
  UNPAID_LEAVE: 'Permiso Sin Sueldo',
  MATERNITY_LEAVE: 'Licencia Maternidad',
  PATERNITY_LEAVE: 'Licencia Paternidad',
};

const VALID_LEAVE_TYPES = Object.keys(LEAVE_TYPE_LABELS);

const MAX_VACATION_BUSINESS_DAYS_PER_YEAR = 15;

@Injectable()
export class LeavesService {
  private readonly logger = new Logger(LeavesService.name);

  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly holidaysService: ColombianHolidaysService,
  ) {}

  private verifyCompanyAccess(jwtCompanyId: string, companyId: string): void {
    if (jwtCompanyId !== companyId) {
      throw new ForbiddenException('No tienes acceso a esta empresa');
    }
  }

  private async getTenantDb(companyId: string): Promise<any> {
    const tenantDb = await this.tenantContext.getTenantClient(companyId);
    if (!tenantDb) {
      throw new NotFoundException('Empresa no encontrada o inactiva');
    }
    return tenantDb;
  }

  /**
   * Calcula dias habiles entre dos fechas (Lun-Sab, excluyendo Dom + festivos colombianos)
   */
  async calculateBusinessDays(
    startDate: Date,
    endDate: Date,
  ): Promise<{ businessDays: number; calendarDays: number; holidays: string[] }> {
    const holidays = await this.holidaysService.getHolidaysInRange(startDate, endDate);
    const holidayDates = new Set(holidays.map((h) => h.date));

    let businessDays = 0;
    let calendarDays = 0;
    const current = new Date(startDate);
    const end = new Date(endDate);

    while (current <= end) {
      calendarDays++;
      const dayOfWeek = current.getDay(); // 0=Dom
      const dateStr = current.toISOString().split('T')[0];

      // Dias habiles en Colombia: Lun-Sab (excluye solo Dom y festivos)
      if (dayOfWeek !== 0 && !holidayDates.has(dateStr)) {
        businessDays++;
      }

      current.setDate(current.getDate() + 1);
    }

    return {
      businessDays,
      calendarDays,
      holidays: holidays.map((h) => h.date),
    };
  }

  /**
   * Verifica que no haya solicitudes que se traslapen
   */
  private async checkConflicts(
    tenantDb: any,
    thirdPartyId: string,
    startDate: string,
    endDate: string,
    excludeId?: string,
  ): Promise<void> {
    const where: any = {
      third_party_id: thirdPartyId,
      status: { in: ['PENDING', 'APPROVED'] },
      OR: [
        { start_date: { lte: new Date(endDate) }, end_date: { gte: new Date(startDate) } },
      ],
    };

    if (excludeId) {
      where.id = { not: excludeId };
    }

    const conflicts = await tenantDb.leaveRequest.findMany({ where });
    if (conflicts.length > 0) {
      throw new BadRequestException(
        'Ya existe una solicitud de ausencia que se traslapa con las fechas indicadas',
      );
    }
  }

  /**
   * Listar solicitudes de ausencia con filtros y paginacion
   */
  async findAll(companyId: string, jwtCompanyId: string, query: QueryLeavesDto): Promise<any> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.getTenantDb(companyId);

    const where: any = {};

    if (query.third_party_id) {
      where.third_party_id = query.third_party_id;
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.leave_type) {
      where.leave_type = query.leave_type;
    }
    if (query.start_date && query.end_date) {
      where.OR = [
        {
          start_date: { lte: new Date(query.end_date) },
          end_date: { gte: new Date(query.start_date) },
        },
      ];
    }

    const skip = query.skip ? parseInt(query.skip, 10) : 0;
    const take = query.take ? parseInt(query.take, 10) : 50;

    const [data, total] = await Promise.all([
      tenantDb.leaveRequest.findMany({
        where,
        skip,
        take,
        orderBy: { created_at: 'desc' },
        include: {
          third_party: {
            select: { name: true },
          },
          approved_by: {
            select: { name: true },
          },
        },
      }),
      tenantDb.leaveRequest.count({ where }),
    ]);

    return {
      data: data.map((lr: any) => ({
        id: lr.id,
        third_party_id: lr.third_party_id,
        employee_name: lr.third_party?.name || 'Sin nombre',
        leave_type: lr.leave_type,
        leave_type_label: LEAVE_TYPE_LABELS[lr.leave_type] || lr.leave_type,
        start_date: lr.start_date,
        end_date: lr.end_date,
        days_requested: lr.days_requested,
        reason: lr.reason,
        status: lr.status,
        approved_by_name: lr.approved_by?.name || null,
        approved_at: lr.approved_at,
        rejection_reason: lr.rejection_reason,
        admin_notes: lr.admin_notes,
        source: lr.source,
        created_at: lr.created_at,
      })),
      total,
      skip,
      take,
    };
  }

  /**
   * Detalle de una solicitud
   */
  async findOne(companyId: string, jwtCompanyId: string, id: string): Promise<any> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.getTenantDb(companyId);

    const lr = await tenantDb.leaveRequest.findUnique({
      where: { id },
      include: {
        third_party: {
          select: { name: true, identification_number: true },
        },
        approved_by: {
          select: { name: true },
        },
      },
    });

    if (!lr) {
      throw new NotFoundException('Solicitud de ausencia no encontrada');
    }

    return {
      id: lr.id,
      third_party_id: lr.third_party_id,
      employee_name: lr.third_party?.name || 'Sin nombre',
      employee_identification: lr.third_party?.identification_number || null,
      leave_type: lr.leave_type,
      leave_type_label: LEAVE_TYPE_LABELS[lr.leave_type] || lr.leave_type,
      start_date: lr.start_date,
      end_date: lr.end_date,
      days_requested: lr.days_requested,
      reason: lr.reason,
      status: lr.status,
      approved_by_name: lr.approved_by?.name || null,
      approved_at: lr.approved_at,
      rejection_reason: lr.rejection_reason,
      admin_notes: lr.admin_notes,
      source: lr.source,
      created_by_id: lr.created_by_id,
      created_at: lr.created_at,
      updated_at: lr.updated_at,
    };
  }

  /**
   * Estadisticas de ausencias
   */
  async getStats(companyId: string, jwtCompanyId: string): Promise<any> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.getTenantDb(companyId);

    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [pending, approvedThisMonth, allThisMonth] = await Promise.all([
      tenantDb.leaveRequest.count({ where: { status: 'PENDING' } }),
      tenantDb.leaveRequest.count({
        where: { status: 'APPROVED', approved_at: { gte: firstOfMonth } },
      }),
      tenantDb.leaveRequest.findMany({
        where: {
          status: { in: ['APPROVED', 'PENDING'] },
          start_date: { gte: firstOfMonth },
        },
        select: { leave_type: true, days_requested: true, status: true },
      }),
    ]);

    // Agrupar por tipo
    const byType: Record<string, { count: number; days: number }> = {};
    for (const lr of allThisMonth) {
      if (!byType[lr.leave_type]) {
        byType[lr.leave_type] = { count: 0, days: 0 };
      }
      byType[lr.leave_type].count++;
      byType[lr.leave_type].days += lr.days_requested;
    }

    return {
      pending,
      approved_this_month: approvedThisMonth,
      this_month: {
        total: allThisMonth.length,
        by_type: Object.entries(byType).map(([type, data]) => ({
          leave_type: type,
          label: LEAVE_TYPE_LABELS[type] || type,
          count: data.count,
          days: data.days,
        })),
      },
    };
  }

  /**
   * Crear solicitud de ausencia (admin)
   */
  async create(
    companyId: string,
    jwtCompanyId: string,
    userId: string,
    dto: CreateLeaveDto,
  ): Promise<any> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.getTenantDb(companyId);

    if (!VALID_LEAVE_TYPES.includes(dto.leave_type)) {
      throw new BadRequestException(`Tipo de ausencia invalido: ${dto.leave_type}`);
    }

    // Verificar que el empleado existe
    const employee = await tenantDb.thirdParty.findFirst({
      where: { id: dto.third_party_id, roles: { has: 'EMPLOYEE' } },
      select: { id: true, name: true },
    });
    if (!employee) {
      throw new NotFoundException('Empleado no encontrado');
    }

    // Validar fechas
    if (new Date(dto.start_date) > new Date(dto.end_date)) {
      throw new BadRequestException('La fecha de inicio debe ser anterior a la fecha de fin');
    }

    // Verificar conflictos
    await this.checkConflicts(tenantDb, dto.third_party_id, dto.start_date, dto.end_date);

    const lr = await tenantDb.leaveRequest.create({
      data: {
        third_party_id: dto.third_party_id,
        leave_type: dto.leave_type,
        start_date: new Date(dto.start_date),
        end_date: new Date(dto.end_date),
        days_requested: dto.days_requested,
        reason: dto.reason,
        source: 'internal',
        created_by_id: userId,
      },
    });

    this.logger.log(
      `Solicitud de ausencia creada: ${LEAVE_TYPE_LABELS[dto.leave_type]} para ${employee.name}`,
    );

    return {
      message: 'Solicitud de ausencia creada exitosamente',
      leave_request: {
        id: lr.id,
        third_party_id: lr.third_party_id,
        leave_type: lr.leave_type,
        start_date: lr.start_date,
        end_date: lr.end_date,
        days_requested: lr.days_requested,
        status: lr.status,
      },
    };
  }

  /**
   * Solicitar ausencia (empleado — auto-busca su ThirdParty via TenantUser)
   */
  async requestLeave(
    companyId: string,
    jwtCompanyId: string,
    userId: string,
    dto: RequestLeaveDto,
  ): Promise<any> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.getTenantDb(companyId);

    if (!VALID_LEAVE_TYPES.includes(dto.leave_type)) {
      throw new BadRequestException(`Tipo de ausencia invalido: ${dto.leave_type}`);
    }

    // Buscar TenantUser → third_party_id → ThirdParty (EMPLOYEE)
    const tenantUser = await tenantDb.tenantUser.findUnique({
      where: { id: userId },
      select: { third_party_id: true },
    });

    if (!tenantUser?.third_party_id) {
      throw new ForbiddenException('No tienes un perfil de empleado asociado');
    }

    const employee = await tenantDb.thirdParty.findFirst({
      where: { id: tenantUser.third_party_id, roles: { has: 'EMPLOYEE' } },
    });

    if (!employee) {
      throw new ForbiddenException('No tienes un perfil de empleado asociado');
    }

    // Validar fechas
    if (new Date(dto.start_date) > new Date(dto.end_date)) {
      throw new BadRequestException('La fecha de inicio debe ser anterior a la fecha de fin');
    }

    // Verificar conflictos
    await this.checkConflicts(tenantDb, employee.id, dto.start_date, dto.end_date);

    const lr = await tenantDb.leaveRequest.create({
      data: {
        third_party_id: employee.id,
        leave_type: dto.leave_type,
        start_date: new Date(dto.start_date),
        end_date: new Date(dto.end_date),
        days_requested: dto.days_requested,
        reason: dto.reason,
        source: 'internal',
        created_by_id: userId,
      },
    });

    this.logger.log(`Empleado solicito ausencia: ${LEAVE_TYPE_LABELS[dto.leave_type]}`);

    return {
      message: 'Solicitud enviada exitosamente',
      leave_request: {
        id: lr.id,
        leave_type: lr.leave_type,
        start_date: lr.start_date,
        end_date: lr.end_date,
        days_requested: lr.days_requested,
        status: lr.status,
      },
    };
  }

  /**
   * Editar solicitud (solo si PENDING)
   */
  async update(
    companyId: string,
    jwtCompanyId: string,
    id: string,
    dto: EditLeaveDto,
  ): Promise<any> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.getTenantDb(companyId);

    const existing = await tenantDb.leaveRequest.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Solicitud de ausencia no encontrada');
    }
    if (existing.status !== 'PENDING') {
      throw new BadRequestException('Solo se pueden editar solicitudes pendientes');
    }

    if (dto.leave_type && !VALID_LEAVE_TYPES.includes(dto.leave_type)) {
      throw new BadRequestException(`Tipo de ausencia invalido: ${dto.leave_type}`);
    }

    const startDate = dto.start_date || existing.start_date.toISOString().split('T')[0];
    const endDate = dto.end_date || existing.end_date.toISOString().split('T')[0];

    if (new Date(startDate) > new Date(endDate)) {
      throw new BadRequestException('La fecha de inicio debe ser anterior a la fecha de fin');
    }

    // Verificar conflictos si cambian las fechas
    if (dto.start_date || dto.end_date) {
      await this.checkConflicts(
        tenantDb,
        existing.third_party_id,
        startDate,
        endDate,
        id,
      );
    }

    const updateData: any = {};
    if (dto.leave_type) updateData.leave_type = dto.leave_type;
    if (dto.start_date) updateData.start_date = new Date(dto.start_date);
    if (dto.end_date) updateData.end_date = new Date(dto.end_date);
    if (dto.days_requested) updateData.days_requested = dto.days_requested;
    if (dto.reason !== undefined) updateData.reason = dto.reason;
    if (dto.admin_notes !== undefined) updateData.admin_notes = dto.admin_notes;

    const updated = await tenantDb.leaveRequest.update({
      where: { id },
      data: updateData,
    });

    return {
      message: 'Solicitud actualizada exitosamente',
      leave_request: {
        id: updated.id,
        leave_type: updated.leave_type,
        start_date: updated.start_date,
        end_date: updated.end_date,
        days_requested: updated.days_requested,
        status: updated.status,
      },
    };
  }

  /**
   * Aprobar solicitud
   */
  async approve(
    companyId: string,
    jwtCompanyId: string,
    userId: string,
    id: string,
    dto?: ApproveLeaveDto,
  ): Promise<any> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.getTenantDb(companyId);

    const lr = await tenantDb.leaveRequest.findUnique({ where: { id } });
    if (!lr) {
      throw new NotFoundException('Solicitud de ausencia no encontrada');
    }
    if (lr.status !== 'PENDING') {
      throw new BadRequestException('Solo se pueden aprobar solicitudes pendientes');
    }

    // Resolver aprobador via TenantUser → third_party_id
    const tenantUser = await tenantDb.tenantUser.findUnique({
      where: { id: userId },
      select: { third_party_id: true },
    });

    const updated = await tenantDb.leaveRequest.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approved_by_id: tenantUser?.third_party_id || null,
        approved_at: new Date(),
        admin_notes: dto?.admin_notes || lr.admin_notes,
      },
    });

    this.logger.log(`Solicitud aprobada: ${id}`);

    return {
      message: 'Solicitud aprobada exitosamente',
      leave_request: {
        id: updated.id,
        status: updated.status,
        approved_at: updated.approved_at,
      },
    };
  }

  /**
   * Rechazar solicitud
   */
  async reject(
    companyId: string,
    jwtCompanyId: string,
    userId: string,
    id: string,
    dto: RejectLeaveDto,
  ): Promise<any> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.getTenantDb(companyId);

    const lr = await tenantDb.leaveRequest.findUnique({ where: { id } });
    if (!lr) {
      throw new NotFoundException('Solicitud de ausencia no encontrada');
    }
    if (lr.status !== 'PENDING') {
      throw new BadRequestException('Solo se pueden rechazar solicitudes pendientes');
    }

    // Resolver rechazador via TenantUser → third_party_id
    const tenantUser = await tenantDb.tenantUser.findUnique({
      where: { id: userId },
      select: { third_party_id: true },
    });

    const updated = await tenantDb.leaveRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        approved_by_id: tenantUser?.third_party_id || null,
        approved_at: new Date(),
        rejection_reason: dto.rejection_reason,
      },
    });

    this.logger.log(`Solicitud rechazada: ${id}`);

    return {
      message: 'Solicitud rechazada',
      leave_request: {
        id: updated.id,
        status: updated.status,
        rejection_reason: updated.rejection_reason,
      },
    };
  }

  /**
   * Eliminar solicitud (solo PENDING)
   */
  async delete(companyId: string, jwtCompanyId: string, id: string): Promise<any> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.getTenantDb(companyId);

    const lr = await tenantDb.leaveRequest.findUnique({ where: { id } });
    if (!lr) {
      throw new NotFoundException('Solicitud de ausencia no encontrada');
    }
    if (lr.status !== 'PENDING') {
      throw new BadRequestException('Solo se pueden eliminar solicitudes pendientes');
    }

    await tenantDb.leaveRequest.delete({ where: { id } });

    this.logger.log(`Solicitud eliminada: ${id}`);

    return { message: 'Solicitud eliminada exitosamente' };
  }

  /**
   * Obtener saldo de vacaciones de un empleado
   * Regla colombiana: max 15 dias habiles por ano
   */
  async getVacationBalance(
    companyId: string,
    jwtCompanyId: string,
    thirdPartyId: string,
  ): Promise<any> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.getTenantDb(companyId);

    const employee = await tenantDb.thirdParty.findFirst({
      where: { id: thirdPartyId, roles: { has: 'EMPLOYEE' } },
      select: { id: true, name: true },
    });
    if (!employee) {
      throw new NotFoundException('Empleado no encontrado');
    }

    // Obtener vacaciones aprobadas en los ultimos 12 meses
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const vacationRequests = await tenantDb.leaveRequest.findMany({
      where: {
        third_party_id: thirdPartyId,
        leave_type: { in: ['VACATION', 'VACATION_MONETIZED'] },
        status: 'APPROVED',
        start_date: { gte: oneYearAgo },
      },
      select: { leave_type: true, days_requested: true, start_date: true, end_date: true },
    });

    const daysUsed = vacationRequests.reduce(
      (sum: number, r: any) => sum + r.days_requested,
      0,
    );

    return {
      employee_id: thirdPartyId,
      employee_name: employee.name || 'Sin nombre',
      max_days: MAX_VACATION_BUSINESS_DAYS_PER_YEAR,
      days_used: daysUsed,
      days_remaining: Math.max(0, MAX_VACATION_BUSINESS_DAYS_PER_YEAR - daysUsed),
      requests: vacationRequests.map((r: any) => ({
        leave_type: r.leave_type,
        days_requested: r.days_requested,
        start_date: r.start_date,
        end_date: r.end_date,
      })),
    };
  }
}
