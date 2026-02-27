import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { TenantContextService } from '@contagracia/shared-modules';
import { ColombianHolidaysService } from './colombian-holidays.service';
import {
  RegisterCheckinDto,
  RegisterCheckoutDto,
  EditAttendanceDto,
  QueryAttendanceDto,
  CreateOvertimeDto,
  EditOvertimeDto,
  QueryOvertimeDto,
} from './dto';

// Mapa de tipos de hora extra colombianos
const OVERTIME_MAP: Record<string, { payroll_code: string; pct: number; name: string }> = {
  HED:   { payroll_code: 'HEDs',  pct: 25,  name: 'Hora Extra Diurna Ordinaria' },
  HEN:   { payroll_code: 'HENs',  pct: 75,  name: 'Hora Extra Nocturna Ordinaria' },
  HEDDF: { payroll_code: 'HEDDFs', pct: 100, name: 'Hora Extra Diurna Dom/Fest' },
  HENDF: { payroll_code: 'HENDFs', pct: 150, name: 'Hora Extra Nocturna Dom/Fest' },
  HRN:   { payroll_code: 'HRNs',  pct: 35,  name: 'Recargo Nocturno' },
  HRDDF: { payroll_code: 'HRDDFs', pct: 75,  name: 'Recargo Dominical Diurno' },
  HRNDF: { payroll_code: 'HRNDFs', pct: 110, name: 'Recargo Dominical Nocturno' },
};

@Injectable()
export class TimeAttendanceService {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly holidaysService: ColombianHolidaysService,
  ) {}

  private verifyCompanyAccess(jwtCompanyId: string, companyId: string): void {
    if (jwtCompanyId !== companyId) {
      throw new ForbiddenException('No tienes acceso a esta empresa');
    }
  }

  private async getTenantDb(companyId: string) {
    const tenantDb = await this.tenantContext.getTenantClient(companyId);
    if (!tenantDb) {
      throw new NotFoundException('Empresa no encontrada o inactiva');
    }
    return tenantDb;
  }

  /**
   * Resuelve el ThirdParty (empleado) del usuario autenticado
   * JWT userId → TenantUser → third_party_id → ThirdParty (EMPLOYEE)
   */
  private async resolveEmployee(tenantDb: any, userId: string): Promise<any> {
    const tenantUser = await tenantDb.tenantUser.findUnique({
      where: { id: userId },
      select: { third_party_id: true },
    });

    if (!tenantUser?.third_party_id) {
      return null;
    }

    const employee = await tenantDb.thirdParty.findFirst({
      where: {
        id: tenantUser.third_party_id,
        roles: { has: 'EMPLOYEE' },
      },
      include: { current_salary: true },
    });

    return employee;
  }

  // ==================== ASISTENCIA ====================

  /**
   * Listar registros de asistencia con filtros y paginacion.
   * Si selfOnly=true, solo muestra registros del empleado autenticado.
   */
  async findAllAttendance(
    companyId: string,
    jwtCompanyId: string,
    userId: string,
    selfOnly: boolean,
    query: QueryAttendanceDto,
  ): Promise<any> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.getTenantDb(companyId);

    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '20', 10);
    const skip = (page - 1) * limit;

    const where: any = {};

    // Self-service: restringir a registros propios
    if (selfOnly) {
      const myEmployee = await this.resolveEmployee(tenantDb, userId);
      if (!myEmployee) {
        return { data: [], pagination: { total: 0, page, limit, totalPages: 0 } };
      }
      where.third_party_id = myEmployee.id;
    } else if (query.third_party_id) {
      where.third_party_id = query.third_party_id;
    }

    if (query.date_from || query.date_to) {
      where.date = {};
      if (query.date_from) where.date.gte = new Date(query.date_from);
      if (query.date_to) where.date.lte = new Date(query.date_to);
    }

    const [data, total] = await Promise.all([
      tenantDb.attendanceRecord.findMany({
        where,
        include: {
          third_party: {
            select: { id: true, name: true, identification_number: true },
          },
        },
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
      tenantDb.attendanceRecord.count({ where }),
    ]);

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Marcar entrada (check-in)
   */
  async registerCheckin(companyId: string, jwtCompanyId: string, userId: string, dto: RegisterCheckinDto): Promise<any> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.getTenantDb(companyId);

    // Si no viene third_party_id, resolver desde el usuario autenticado (self-service)
    let thirdPartyId: string = dto.third_party_id as string;
    if (!dto.third_party_id) {
      const myEmployee = await this.resolveEmployee(tenantDb, userId);
      if (!myEmployee) {
        throw new BadRequestException('No tienes un perfil de empleado vinculado');
      }
      thirdPartyId = myEmployee.id;
    }

    // Validar que el empleado exista y este activo
    const employee = await tenantDb.thirdParty.findFirst({
      where: { id: thirdPartyId, roles: { has: 'EMPLOYEE' } },
      select: { id: true, employee_status: true },
    });

    if (!employee) {
      throw new NotFoundException('Empleado no encontrado');
    }

    if (employee.employee_status !== 'ACTIVE') {
      throw new BadRequestException('El empleado no esta activo');
    }

    // Verificar que no exista registro para hoy
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await tenantDb.attendanceRecord.findUnique({
      where: {
        third_party_id_date: {
          third_party_id: thirdPartyId,
          date: today,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('Ya existe un registro de asistencia para hoy');
    }

    return tenantDb.attendanceRecord.create({
      data: {
        third_party_id: thirdPartyId,
        date: today,
        check_in: new Date(),
        notes: dto.notes,
      },
      include: {
        third_party: {
          select: { id: true, name: true },
        },
      },
    });
  }

  /**
   * Marcar salida (check-out)
   */
  async registerCheckout(companyId: string, jwtCompanyId: string, userId: string, dto: RegisterCheckoutDto): Promise<any> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.getTenantDb(companyId);

    // Si no viene third_party_id, resolver desde el usuario autenticado (self-service)
    let thirdPartyId: string = dto.third_party_id as string;
    if (!dto.third_party_id) {
      const myEmployee = await this.resolveEmployee(tenantDb, userId);
      if (!myEmployee) {
        throw new BadRequestException('No tienes un perfil de empleado vinculado');
      }
      thirdPartyId = myEmployee.id;
    }

    // Buscar registro de hoy
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const record = await tenantDb.attendanceRecord.findUnique({
      where: {
        third_party_id_date: {
          third_party_id: thirdPartyId,
          date: today,
        },
      },
    });

    if (!record) {
      throw new NotFoundException('No hay registro de entrada para hoy');
    }

    if (!record.check_in) {
      throw new BadRequestException('No se ha registrado la hora de entrada');
    }

    if (record.check_out) {
      throw new BadRequestException('Ya se registro la hora de salida');
    }

    // Calcular horas trabajadas
    const checkOut = new Date();
    const checkIn = new Date(record.check_in);
    const workedMs = checkOut.getTime() - checkIn.getTime();
    const workedHours = Math.round((workedMs / (1000 * 60 * 60)) * 100) / 100;

    return tenantDb.attendanceRecord.update({
      where: { id: record.id },
      data: {
        check_out: checkOut,
        worked_hours: workedHours,
        notes: dto.notes ? `${record.notes || ''} | ${dto.notes}`.trim() : record.notes,
      },
      include: {
        third_party: {
          select: { id: true, name: true },
        },
      },
    });
  }

  /**
   * Editar un registro de asistencia
   */
  async editAttendance(companyId: string, jwtCompanyId: string, id: string, dto: EditAttendanceDto): Promise<any> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.getTenantDb(companyId);

    const record = await tenantDb.attendanceRecord.findUnique({
      where: { id },
    });

    if (!record) {
      throw new NotFoundException('Registro de asistencia no encontrado');
    }

    const data: any = {};

    if (dto.check_in) {
      data.check_in = new Date(dto.check_in);
    }

    if (dto.check_out) {
      data.check_out = new Date(dto.check_out);
    }

    if (dto.notes !== undefined) {
      data.notes = dto.notes;
    }

    // Recalcular horas si ambos check_in y check_out estan presentes
    const finalCheckIn = data.check_in || record.check_in;
    const finalCheckOut = data.check_out || record.check_out;

    if (finalCheckIn && finalCheckOut) {
      const workedMs = new Date(finalCheckOut).getTime() - new Date(finalCheckIn).getTime();
      data.worked_hours = Math.round((workedMs / (1000 * 60 * 60)) * 100) / 100;
    }

    return tenantDb.attendanceRecord.update({
      where: { id },
      data,
      include: {
        third_party: {
          select: { id: true, name: true },
        },
      },
    });
  }

  /**
   * Reporte de asistencia por rango de fechas
   */
  async getAttendanceReport(companyId: string, jwtCompanyId: string, query: QueryAttendanceDto): Promise<any> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.getTenantDb(companyId);

    const where: any = {};

    if (query.third_party_id) {
      where.third_party_id = query.third_party_id;
    }

    if (query.date_from || query.date_to) {
      where.date = {};
      if (query.date_from) where.date.gte = new Date(query.date_from);
      if (query.date_to) where.date.lte = new Date(query.date_to);
    }

    const records = await tenantDb.attendanceRecord.findMany({
      where,
      include: {
        third_party: {
          select: { id: true, name: true, identification_number: true },
        },
      },
      orderBy: [{ third_party_id: 'asc' }, { date: 'asc' }],
    });

    // Agrupar por empleado
    const grouped: Record<string, any> = {};
    for (const r of records) {
      const key = r.third_party_id;
      if (!grouped[key]) {
        grouped[key] = {
          third_party_id: key,
          employee_name: r.third_party?.name || '',
          identification: r.third_party?.identification_number || '',
          total_days: 0,
          total_hours: 0,
          records: [],
        };
      }
      grouped[key].total_days++;
      grouped[key].total_hours += Number(r.worked_hours || 0);
      grouped[key].records.push(r);
    }

    return {
      data: Object.values(grouped),
      summary: {
        total_employees: Object.keys(grouped).length,
        total_records: records.length,
      },
    };
  }

  /**
   * Exportar asistencia (devuelve datos para CSV)
   */
  async exportAttendance(companyId: string, jwtCompanyId: string, query: QueryAttendanceDto): Promise<any> {
    const report = await this.getAttendanceReport(companyId, jwtCompanyId, query);
    // Aplanar para exportacion
    const rows: any[] = [];
    for (const emp of report.data) {
      for (const r of emp.records) {
        rows.push({
          empleado: emp.employee_name,
          identificacion: emp.identification,
          fecha: r.date,
          entrada: r.check_in,
          salida: r.check_out,
          horas_trabajadas: r.worked_hours,
          notas: r.notes,
        });
      }
    }
    return { rows, total: rows.length };
  }

  /**
   * Estadisticas de asistencia
   */
  async getStats(companyId: string, jwtCompanyId: string): Promise<any> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.getTenantDb(companyId);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Total empleados activos
    const totalActive = await tenantDb.thirdParty.count({
      where: { roles: { has: 'EMPLOYEE' }, employee_status: 'ACTIVE' },
    });

    // Presentes hoy
    const presentToday = await tenantDb.attendanceRecord.count({
      where: {
        date: today,
        check_in: { not: null },
      },
    });

    // Horas extras pendientes
    const pendingOvertime = await tenantDb.overtimeRecord.count({
      where: { status: 'REQUESTED' },
    });

    // Horas extras aprobadas del mes
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const overtimeThisMonth = await tenantDb.overtimeRecord.findMany({
      where: {
        overtime_date: { gte: startOfMonth },
        status: { in: ['APPROVED', 'AUTO_APPROVED'] },
      },
      select: { overtime_type: true, total_hours: true, calculated_amount: true },
    });

    // Agrupar horas extras por tipo
    const overtimeByType: Record<string, { hours: number; amount: number; count: number }> = {};
    for (const ot of overtimeThisMonth) {
      const key = ot.overtime_type;
      if (!overtimeByType[key]) {
        overtimeByType[key] = { hours: 0, amount: 0, count: 0 };
      }
      overtimeByType[key].hours += Number(ot.total_hours || 0);
      overtimeByType[key].amount += Number(ot.calculated_amount || 0);
      overtimeByType[key].count++;
    }

    return {
      attendance: {
        total_active_employees: totalActive,
        present_today: presentToday,
        absent_today: totalActive - presentToday,
      },
      overtime: {
        pending_requests: pendingOvertime,
        this_month: {
          by_type: overtimeByType,
          total_hours: overtimeThisMonth.reduce((sum, ot) => sum + Number(ot.total_hours || 0), 0),
          total_amount: overtimeThisMonth.reduce((sum, ot) => sum + Number(ot.calculated_amount || 0), 0),
        },
      },
    };
  }

  // ==================== HORAS EXTRAS ====================

  /**
   * Listar horas extras con filtros.
   * Si selfOnly=true, solo muestra registros del empleado autenticado.
   */
  async findAllOvertime(
    companyId: string,
    jwtCompanyId: string,
    userId: string,
    selfOnly: boolean,
    query: QueryOvertimeDto,
  ): Promise<any> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.getTenantDb(companyId);

    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '20', 10);
    const skip = (page - 1) * limit;

    const where: any = {};

    // Self-service: restringir a registros propios
    if (selfOnly) {
      const myEmployee = await this.resolveEmployee(tenantDb, userId);
      if (!myEmployee) {
        return { data: [], pagination: { total: 0, page, limit, totalPages: 0 } };
      }
      where.third_party_id = myEmployee.id;
    } else if (query.third_party_id) {
      where.third_party_id = query.third_party_id;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.overtime_type) {
      where.overtime_type = query.overtime_type;
    }

    if (query.date_from || query.date_to) {
      where.overtime_date = {};
      if (query.date_from) where.overtime_date.gte = new Date(query.date_from);
      if (query.date_to) where.overtime_date.lte = new Date(query.date_to);
    }

    const [data, total] = await Promise.all([
      tenantDb.overtimeRecord.findMany({
        where,
        include: {
          third_party: {
            select: { id: true, name: true, identification_number: true },
          },
          approved_by: {
            select: { id: true, name: true },
          },
          cost_center: { select: { id: true, name: true, consecutive: true } },
        },
        orderBy: { overtime_date: 'desc' },
        skip,
        take: limit,
      }),
      tenantDb.overtimeRecord.count({ where }),
    ]);

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Crear registro de hora extra.
   * Si selfOnly=true, fuerza el third_party_id al empleado autenticado.
   * Si canApprove=true y dto.auto_approve=true, se crea con estado AUTO_APPROVED.
   */
  async createOvertime(
    companyId: string,
    jwtCompanyId: string,
    userId: string,
    selfOnly: boolean,
    canApprove: boolean,
    dto: CreateOvertimeDto,
  ): Promise<any> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.getTenantDb(companyId);

    // Resolver third_party_id (self-service o admin)
    let thirdPartyId: string = dto.third_party_id as string;
    if (selfOnly || !dto.third_party_id) {
      // Self-service: siempre forzar al empleado propio
      const myEmployee = await this.resolveEmployee(tenantDb, userId);
      if (!myEmployee) {
        throw new BadRequestException('No tienes un perfil de empleado vinculado');
      }
      thirdPartyId = myEmployee.id;
    }

    // Validar empleado activo
    const employee = await tenantDb.thirdParty.findFirst({
      where: { id: thirdPartyId, roles: { has: 'EMPLOYEE' } },
      include: { current_salary: true },
    });

    if (!employee) {
      throw new NotFoundException('Empleado no encontrado');
    }

    if (employee.employee_status !== 'ACTIVE') {
      throw new BadRequestException('El empleado no esta activo');
    }

    // Validar fecha (max 30 dias atras)
    const overtimeDate = new Date(dto.overtime_date);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    if (overtimeDate < thirtyDaysAgo) {
      throw new BadRequestException('La fecha no puede ser mayor a 30 dias atras');
    }

    // Calcular total_hours desde start_time y end_time
    const totalHours = this.calculateHours(dto.start_time, dto.end_time);

    if (totalHours <= 0) {
      throw new BadRequestException('Las horas deben ser mayores a 0');
    }

    // Obtener datos del mapa
    const overtimeInfo = OVERTIME_MAP[dto.overtime_type];
    if (!overtimeInfo) {
      throw new BadRequestException('Tipo de hora extra no valido');
    }

    // Calcular montos
    const salary = employee.current_salary ? Number(employee.current_salary.salary) : 0;
    const baseHourlyRate = salary / 240; // 30 dias * 8 horas
    const calculatedAmount = totalHours * baseHourlyRate * (1 + overtimeInfo.pct / 100);

    // Resolver creador
    const creator = await this.resolveEmployee(tenantDb, userId);

    // Auto-aprobar si el creador tiene permiso y lo solicita
    const shouldAutoApprove = dto.auto_approve && canApprove;

    return tenantDb.overtimeRecord.create({
      data: {
        third_party_id: thirdPartyId,
        overtime_date: overtimeDate,
        start_time: dto.start_time,
        end_time: dto.end_time,
        total_hours: totalHours,
        overtime_type: dto.overtime_type,
        payroll_code: overtimeInfo.payroll_code,
        surcharge_pct: overtimeInfo.pct,
        base_hourly_rate: Math.round(baseHourlyRate * 10000) / 10000,
        calculated_amount: Math.round(calculatedAmount * 10000) / 10000,
        reason: dto.reason,
        notes: dto.notes,
        cost_center_id: dto.cost_center_id,
        created_by_id: creator?.id || null,
        ...(shouldAutoApprove ? {
          status: 'AUTO_APPROVED',
          approved_by_id: creator?.id || null,
          approved_at: new Date(),
        } : {}),
      },
      include: {
        third_party: {
          select: { id: true, name: true },
        },
        cost_center: { select: { id: true, name: true } },
      },
    });
  }

  /**
   * Editar registro de hora extra (solo en estado REQUESTED)
   */
  async editOvertime(companyId: string, jwtCompanyId: string, id: string, dto: EditOvertimeDto): Promise<any> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.getTenantDb(companyId);

    const record = await tenantDb.overtimeRecord.findUnique({
      where: { id },
      include: {
        third_party: { include: { current_salary: true } },
      },
    });

    if (!record) {
      throw new NotFoundException('Registro de hora extra no encontrado');
    }

    if (record.status !== 'REQUESTED') {
      throw new BadRequestException('Solo se pueden editar registros en estado SOLICITADO');
    }

    const data: any = {};

    if (dto.overtime_date) data.overtime_date = new Date(dto.overtime_date);
    if (dto.start_time) data.start_time = dto.start_time;
    if (dto.end_time) data.end_time = dto.end_time;
    if (dto.reason) data.reason = dto.reason;
    if (dto.notes !== undefined) data.notes = dto.notes;
    if (dto.cost_center_id !== undefined) data.cost_center_id = dto.cost_center_id;

    // Si cambia el tipo, recalcular
    if (dto.overtime_type) {
      const overtimeInfo = OVERTIME_MAP[dto.overtime_type];
      if (!overtimeInfo) {
        throw new BadRequestException('Tipo de hora extra no valido');
      }
      data.overtime_type = dto.overtime_type;
      data.payroll_code = overtimeInfo.payroll_code;
      data.surcharge_pct = overtimeInfo.pct;
    }

    // Si cambian horas o tipo, recalcular montos
    const startTime = data.start_time || record.start_time;
    const endTime = data.end_time || record.end_time;
    const totalHours = this.calculateHours(startTime, endTime);
    const surcharePct = data.surcharge_pct ?? Number(record.surcharge_pct);
    const salary = record.third_party?.current_salary
      ? Number(record.third_party.current_salary.salary)
      : 0;
    const baseHourlyRate = salary / 240;

    data.total_hours = totalHours;
    data.base_hourly_rate = Math.round(baseHourlyRate * 10000) / 10000;
    data.calculated_amount = Math.round(totalHours * baseHourlyRate * (1 + surcharePct / 100) * 10000) / 10000;

    return tenantDb.overtimeRecord.update({
      where: { id },
      data,
      include: {
        third_party: {
          select: { id: true, name: true },
        },
        cost_center: { select: { id: true, name: true } },
      },
    });
  }

  /**
   * Eliminar registro de hora extra (solo en estado REQUESTED)
   */
  async deleteOvertime(companyId: string, jwtCompanyId: string, id: string): Promise<any> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.getTenantDb(companyId);

    const record = await tenantDb.overtimeRecord.findUnique({
      where: { id },
    });

    if (!record) {
      throw new NotFoundException('Registro de hora extra no encontrado');
    }

    if (record.status !== 'REQUESTED') {
      throw new BadRequestException('Solo se pueden eliminar registros en estado SOLICITADO');
    }

    await tenantDb.overtimeRecord.delete({ where: { id } });

    return { message: 'Registro eliminado correctamente' };
  }

  /**
   * Aprobar hora extra
   */
  async approveOvertime(companyId: string, jwtCompanyId: string, userId: string, id: string): Promise<any> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.getTenantDb(companyId);

    const record = await tenantDb.overtimeRecord.findUnique({
      where: { id },
    });

    if (!record) {
      throw new NotFoundException('Registro de hora extra no encontrado');
    }

    if (record.status !== 'REQUESTED') {
      throw new BadRequestException('Solo se pueden aprobar registros en estado SOLICITADO');
    }

    const approver = await this.resolveEmployee(tenantDb, userId);

    return tenantDb.overtimeRecord.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approved_by_id: approver?.id || null,
        approved_at: new Date(),
      },
      include: {
        third_party: {
          select: { id: true, name: true },
        },
      },
    });
  }

  /**
   * Rechazar hora extra
   */
  async rejectOvertime(
    companyId: string,
    jwtCompanyId: string,
    userId: string,
    id: string,
    rejectionReason: string,
  ): Promise<any> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.getTenantDb(companyId);

    const record = await tenantDb.overtimeRecord.findUnique({
      where: { id },
    });

    if (!record) {
      throw new NotFoundException('Registro de hora extra no encontrado');
    }

    if (record.status !== 'REQUESTED') {
      throw new BadRequestException('Solo se pueden rechazar registros en estado SOLICITADO');
    }

    if (!rejectionReason || rejectionReason.trim().length < 5) {
      throw new BadRequestException('Debe proporcionar una razon de rechazo (minimo 5 caracteres)');
    }

    const approver = await this.resolveEmployee(tenantDb, userId);

    return tenantDb.overtimeRecord.update({
      where: { id },
      data: {
        status: 'REJECTED',
        approved_by_id: approver?.id || null,
        approved_at: new Date(),
        rejection_reason: rejectionReason.trim(),
      },
      include: {
        third_party: {
          select: { id: true, name: true },
        },
      },
    });
  }

  // ==================== FESTIVOS ====================

  /**
   * Obtener festivos colombianos de un año
   */
  async getHolidays(year: number): Promise<any> {
    return this.holidaysService.fetchHolidays(year);
  }

  // ==================== UTILIDADES ====================

  /**
   * Calcular horas entre start_time (HH:mm) y end_time (HH:mm)
   * Soporta cruce de medianoche
   */
  private calculateHours(startTime: string, endTime: string): number {
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);

    let startMinutes = sh * 60 + sm;
    let endMinutes = eh * 60 + em;

    // Cruce de medianoche
    if (endMinutes <= startMinutes) {
      endMinutes += 24 * 60;
    }

    const diffMinutes = endMinutes - startMinutes;
    return Math.round((diffMinutes / 60) * 100) / 100;
  }
}
