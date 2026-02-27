import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { TenantContextService } from '@contagracia/shared-modules';
import {
  CreateShiftTemplateDto,
  CreateScheduleDto,
  CreateAssignmentDto,
  BulkAssignmentDto,
  CreateSwapRequestDto,
  QueryAssignmentsDto,
  QuerySwapsDto,
} from './dto';

@Injectable()
export class ShiftsService {
  private readonly logger = new Logger(ShiftsService.name);

  constructor(private readonly tenantContext: TenantContextService) {}

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
   * Resuelve el ThirdParty (EMPLOYEE) del usuario actual via TenantUser
   */
  private async resolveEmployeeFromUser(
    tenantDb: any,
    userId: string,
  ): Promise<{ id: string; name: string }> {
    const tenantUser = await tenantDb.tenantUser.findUnique({
      where: { id: userId },
      select: { third_party_id: true },
    });

    if (!tenantUser?.third_party_id) {
      throw new ForbiddenException('No tienes un perfil de empleado asociado');
    }

    const employee = await tenantDb.thirdParty.findFirst({
      where: { id: tenantUser.third_party_id, roles: { has: 'EMPLOYEE' } },
      select: { id: true, name: true },
    });

    if (!employee) {
      throw new ForbiddenException('No tienes un perfil de empleado asociado');
    }

    return employee;
  }

  // ==================== SHIFT TEMPLATES ====================

  async findAllTemplates(companyId: string, jwtCompanyId: string): Promise<any> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.getTenantDb(companyId);

    const templates = await tenantDb.shiftTemplate.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { assignments: true } } },
    });

    return { data: templates, total: templates.length };
  }

  async findOneTemplate(companyId: string, jwtCompanyId: string, id: string): Promise<any> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.getTenantDb(companyId);

    const template = await tenantDb.shiftTemplate.findUnique({
      where: { id },
      include: { _count: { select: { assignments: true } } },
    });

    if (!template) {
      throw new NotFoundException('Plantilla de turno no encontrada');
    }

    return template;
  }

  async createTemplate(
    companyId: string,
    jwtCompanyId: string,
    dto: CreateShiftTemplateDto,
  ): Promise<any> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.getTenantDb(companyId);

    const template = await tenantDb.shiftTemplate.create({
      data: {
        name: dto.name,
        code: dto.code,
        shift_type: dto.shift_type,
        start_time: dto.start_time,
        end_time: dto.end_time,
        break_start: dto.break_start,
        break_end: dto.break_end,
        break_minutes: dto.break_minutes || 0,
        total_hours: dto.total_hours,
        color: dto.color,
        description: dto.description,
        is_overnight: dto.is_overnight || false,
      },
    });

    this.logger.log(`Plantilla de turno creada: ${template.name}`);

    return { message: 'Plantilla creada exitosamente', template };
  }

  async updateTemplate(
    companyId: string,
    jwtCompanyId: string,
    id: string,
    dto: Partial<CreateShiftTemplateDto>,
  ): Promise<any> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.getTenantDb(companyId);

    const existing = await tenantDb.shiftTemplate.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Plantilla de turno no encontrada');
    }

    const updated = await tenantDb.shiftTemplate.update({
      where: { id },
      data: dto,
    });

    return { message: 'Plantilla actualizada exitosamente', template: updated };
  }

  async deleteTemplate(companyId: string, jwtCompanyId: string, id: string): Promise<any> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.getTenantDb(companyId);

    const existing = await tenantDb.shiftTemplate.findUnique({
      where: { id },
      include: { _count: { select: { assignments: true } } },
    });
    if (!existing) {
      throw new NotFoundException('Plantilla de turno no encontrada');
    }

    if (existing._count.assignments > 0) {
      // Desactivar en vez de eliminar si tiene asignaciones
      await tenantDb.shiftTemplate.update({
        where: { id },
        data: { is_active: false },
      });
      return { message: 'Plantilla desactivada (tiene asignaciones existentes)' };
    }

    await tenantDb.shiftTemplate.delete({ where: { id } });
    return { message: 'Plantilla eliminada exitosamente' };
  }

  // ==================== SHIFT SCHEDULES ====================

  async findAllSchedules(companyId: string, jwtCompanyId: string): Promise<any> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.getTenantDb(companyId);

    const schedules = await tenantDb.shiftSchedule.findMany({
      orderBy: { period_start: 'desc' },
      include: {
        publisher: { select: { full_name: true } },
        _count: { select: { assignments: true } },
      },
    });

    return { data: schedules, total: schedules.length };
  }

  async findOneSchedule(companyId: string, jwtCompanyId: string, id: string): Promise<any> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.getTenantDb(companyId);

    const schedule = await tenantDb.shiftSchedule.findUnique({
      where: { id },
      include: {
        publisher: { select: { full_name: true } },
        assignments: {
          include: {
            third_party: { select: { name: true } },
            shift_template: { select: { name: true, color: true, start_time: true, end_time: true } },
          },
          orderBy: { date: 'asc' },
        },
      },
    });

    if (!schedule) {
      throw new NotFoundException('Programación no encontrada');
    }

    return schedule;
  }

  async createSchedule(
    companyId: string,
    jwtCompanyId: string,
    dto: CreateScheduleDto,
  ): Promise<any> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.getTenantDb(companyId);

    if (new Date(dto.period_start) > new Date(dto.period_end)) {
      throw new BadRequestException('La fecha de inicio debe ser anterior a la fecha de fin');
    }

    const schedule = await tenantDb.shiftSchedule.create({
      data: {
        name: dto.name,
        period_start: new Date(dto.period_start),
        period_end: new Date(dto.period_end),
        notes: dto.notes,
      },
    });

    this.logger.log(`Programación creada: ${schedule.name}`);

    return { message: 'Programación creada exitosamente', schedule };
  }

  async updateSchedule(
    companyId: string,
    jwtCompanyId: string,
    id: string,
    dto: Partial<CreateScheduleDto>,
  ): Promise<any> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.getTenantDb(companyId);

    const existing = await tenantDb.shiftSchedule.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Programación no encontrada');
    }
    if (existing.status === 'ARCHIVED') {
      throw new BadRequestException('No se puede editar una programación archivada');
    }

    const updateData: any = {};
    if (dto.name) updateData.name = dto.name;
    if (dto.period_start) updateData.period_start = new Date(dto.period_start);
    if (dto.period_end) updateData.period_end = new Date(dto.period_end);
    if (dto.notes !== undefined) updateData.notes = dto.notes;

    const updated = await tenantDb.shiftSchedule.update({
      where: { id },
      data: updateData,
    });

    return { message: 'Programación actualizada exitosamente', schedule: updated };
  }

  async publishSchedule(
    companyId: string,
    jwtCompanyId: string,
    userId: string,
    id: string,
  ): Promise<any> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.getTenantDb(companyId);

    const schedule = await tenantDb.shiftSchedule.findUnique({ where: { id } });
    if (!schedule) {
      throw new NotFoundException('Programación no encontrada');
    }
    if (schedule.status === 'PUBLISHED') {
      throw new BadRequestException('La programación ya está publicada');
    }
    if (schedule.status === 'ARCHIVED') {
      throw new BadRequestException('No se puede publicar una programación archivada');
    }

    const updated = await tenantDb.shiftSchedule.update({
      where: { id },
      data: {
        status: 'PUBLISHED',
        published_at: new Date(),
        published_by: userId,
      },
    });

    this.logger.log(`Programación publicada: ${schedule.name}`);

    return { message: 'Programación publicada exitosamente', schedule: updated };
  }

  async deleteSchedule(companyId: string, jwtCompanyId: string, id: string): Promise<any> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.getTenantDb(companyId);

    const existing = await tenantDb.shiftSchedule.findUnique({
      where: { id },
      include: { _count: { select: { assignments: true } } },
    });
    if (!existing) {
      throw new NotFoundException('Programación no encontrada');
    }
    if (existing.status === 'PUBLISHED') {
      // Archivar en vez de eliminar si está publicada
      await tenantDb.shiftSchedule.update({
        where: { id },
        data: { status: 'ARCHIVED' },
      });
      return { message: 'Programación archivada (estaba publicada)' };
    }

    // Eliminar asignaciones asociadas primero
    if (existing._count.assignments > 0) {
      await tenantDb.shiftAssignment.deleteMany({ where: { schedule_id: id } });
    }

    await tenantDb.shiftSchedule.delete({ where: { id } });
    return { message: 'Programación eliminada exitosamente' };
  }

  // ==================== SHIFT ASSIGNMENTS ====================

  async findAllAssignments(
    companyId: string,
    jwtCompanyId: string,
    query: QueryAssignmentsDto,
  ): Promise<any> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.getTenantDb(companyId);

    const where: any = {};
    if (query.third_party_id) where.third_party_id = query.third_party_id;
    if (query.shift_template_id) where.shift_template_id = query.shift_template_id;
    if (query.schedule_id) where.schedule_id = query.schedule_id;
    if (query.status) where.status = query.status;
    if (query.date_from || query.date_to) {
      where.date = {};
      if (query.date_from) where.date.gte = new Date(query.date_from);
      if (query.date_to) where.date.lte = new Date(query.date_to);
    }

    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      tenantDb.shiftAssignment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: 'asc' },
        include: {
          third_party: { select: { name: true } },
          shift_template: {
            select: { name: true, color: true, start_time: true, end_time: true, shift_type: true },
          },
          schedule: { select: { name: true } },
        },
      }),
      tenantDb.shiftAssignment.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async createAssignment(
    companyId: string,
    jwtCompanyId: string,
    userId: string,
    dto: CreateAssignmentDto,
  ): Promise<any> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.getTenantDb(companyId);

    // Verificar que el empleado existe
    const employee = await tenantDb.thirdParty.findFirst({
      where: { id: dto.third_party_id, roles: { has: 'EMPLOYEE' } },
      select: { id: true, name: true },
    });
    if (!employee) {
      throw new NotFoundException('Empleado no encontrado');
    }

    // Verificar que la plantilla existe
    const template = await tenantDb.shiftTemplate.findUnique({
      where: { id: dto.shift_template_id },
    });
    if (!template) {
      throw new NotFoundException('Plantilla de turno no encontrada');
    }

    // Verificar conflicto (unique constraint: third_party_id + date)
    const existing = await tenantDb.shiftAssignment.findFirst({
      where: {
        third_party_id: dto.third_party_id,
        date: new Date(dto.date),
        status: { not: 'CANCELLED' },
      },
    });
    if (existing) {
      throw new BadRequestException(
        `El empleado ya tiene un turno asignado para ${dto.date}`,
      );
    }

    const assignment = await tenantDb.shiftAssignment.create({
      data: {
        third_party_id: dto.third_party_id,
        shift_template_id: dto.shift_template_id,
        schedule_id: dto.schedule_id,
        date: new Date(dto.date),
        custom_start_time: dto.custom_start_time,
        custom_end_time: dto.custom_end_time,
        notes: dto.notes,
        assigned_by: userId,
      },
      include: {
        third_party: { select: { name: true } },
        shift_template: { select: { name: true } },
      },
    });

    this.logger.log(`Turno asignado: ${employee.name} - ${template.name} (${dto.date})`);

    return { message: 'Turno asignado exitosamente', assignment };
  }

  async bulkCreateAssignments(
    companyId: string,
    jwtCompanyId: string,
    userId: string,
    dto: BulkAssignmentDto,
  ): Promise<any> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.getTenantDb(companyId);

    const results: { created: number; errors: string[] } = { created: 0, errors: [] };

    for (const item of dto.assignments) {
      try {
        // Verificar conflicto
        const existing = await tenantDb.shiftAssignment.findFirst({
          where: {
            third_party_id: item.third_party_id,
            date: new Date(item.date),
            status: { not: 'CANCELLED' },
          },
        });

        if (existing) {
          results.errors.push(`Conflicto: ${item.third_party_id} ya tiene turno el ${item.date}`);
          continue;
        }

        await tenantDb.shiftAssignment.create({
          data: {
            third_party_id: item.third_party_id,
            shift_template_id: item.shift_template_id,
            schedule_id: dto.schedule_id,
            date: new Date(item.date),
            custom_start_time: item.custom_start_time,
            custom_end_time: item.custom_end_time,
            notes: item.notes,
            assigned_by: userId,
          },
        });

        results.created++;
      } catch (err: any) {
        results.errors.push(`Error: ${item.third_party_id} (${item.date}): ${err.message}`);
      }
    }

    this.logger.log(`Asignación masiva: ${results.created} creadas, ${results.errors.length} errores`);

    return {
      message: `${results.created} turnos asignados exitosamente`,
      ...results,
    };
  }

  async updateAssignment(
    companyId: string,
    jwtCompanyId: string,
    id: string,
    dto: Partial<CreateAssignmentDto>,
  ): Promise<any> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.getTenantDb(companyId);

    const existing = await tenantDb.shiftAssignment.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Asignación no encontrada');
    }
    if (existing.status === 'CANCELLED' || existing.status === 'SWAPPED') {
      throw new BadRequestException('No se puede editar una asignación cancelada o intercambiada');
    }

    const updateData: any = {};
    if (dto.shift_template_id) updateData.shift_template_id = dto.shift_template_id;
    if (dto.custom_start_time !== undefined) updateData.custom_start_time = dto.custom_start_time;
    if (dto.custom_end_time !== undefined) updateData.custom_end_time = dto.custom_end_time;
    if (dto.notes !== undefined) updateData.notes = dto.notes;

    const updated = await tenantDb.shiftAssignment.update({
      where: { id },
      data: updateData,
      include: {
        third_party: { select: { name: true } },
        shift_template: { select: { name: true } },
      },
    });

    return { message: 'Asignación actualizada exitosamente', assignment: updated };
  }

  async deleteAssignment(companyId: string, jwtCompanyId: string, id: string): Promise<any> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.getTenantDb(companyId);

    const existing = await tenantDb.shiftAssignment.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Asignación no encontrada');
    }

    await tenantDb.shiftAssignment.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    return { message: 'Asignación cancelada exitosamente' };
  }

  // ==================== SHIFT SWAP REQUESTS ====================

  async findAllSwaps(
    companyId: string,
    jwtCompanyId: string,
    query: QuerySwapsDto,
  ): Promise<any> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.getTenantDb(companyId);

    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.requester_id) where.requester_id = query.requester_id;

    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      tenantDb.shiftSwapRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          requester: { select: { name: true } },
          target: { select: { name: true } },
          requester_assignment: {
            include: { shift_template: { select: { name: true, color: true } } },
          },
          target_assignment: {
            include: { shift_template: { select: { name: true, color: true } } },
          },
          approver: { select: { full_name: true } },
        },
      }),
      tenantDb.shiftSwapRequest.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async approveSwap(
    companyId: string,
    jwtCompanyId: string,
    userId: string,
    id: string,
  ): Promise<any> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.getTenantDb(companyId);

    const swap = await tenantDb.shiftSwapRequest.findUnique({
      where: { id },
      include: {
        requester_assignment: true,
        target_assignment: true,
      },
    });

    if (!swap) {
      throw new NotFoundException('Solicitud de intercambio no encontrada');
    }
    if (swap.status !== 'PENDING') {
      throw new BadRequestException('Solo se pueden aprobar solicitudes pendientes');
    }

    // Realizar el intercambio en una transacción
    await tenantDb.$transaction(async (tx: any) => {
      // Intercambiar shift_template_id entre las dos asignaciones
      const reqTemplateId = swap.requester_assignment.shift_template_id;
      const targetTemplateId = swap.target_assignment.shift_template_id;

      await tx.shiftAssignment.update({
        where: { id: swap.requester_assignment_id },
        data: {
          shift_template_id: targetTemplateId,
          status: 'SWAPPED',
          custom_start_time: swap.target_assignment.custom_start_time,
          custom_end_time: swap.target_assignment.custom_end_time,
        },
      });

      await tx.shiftAssignment.update({
        where: { id: swap.target_assignment_id },
        data: {
          shift_template_id: reqTemplateId,
          status: 'SWAPPED',
          custom_start_time: swap.requester_assignment.custom_start_time,
          custom_end_time: swap.requester_assignment.custom_end_time,
        },
      });

      await tx.shiftSwapRequest.update({
        where: { id },
        data: {
          status: 'APPROVED',
          approved_by: userId,
          approved_at: new Date(),
        },
      });
    });

    this.logger.log(`Intercambio de turno aprobado: ${id}`);

    return { message: 'Intercambio aprobado y ejecutado exitosamente' };
  }

  async rejectSwap(
    companyId: string,
    jwtCompanyId: string,
    userId: string,
    id: string,
    rejectionReason?: string,
  ): Promise<any> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.getTenantDb(companyId);

    const swap = await tenantDb.shiftSwapRequest.findUnique({ where: { id } });
    if (!swap) {
      throw new NotFoundException('Solicitud de intercambio no encontrada');
    }
    if (swap.status !== 'PENDING') {
      throw new BadRequestException('Solo se pueden rechazar solicitudes pendientes');
    }

    await tenantDb.shiftSwapRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        approved_by: userId,
        approved_at: new Date(),
        rejection_reason: rejectionReason,
      },
    });

    this.logger.log(`Intercambio de turno rechazado: ${id}`);

    return { message: 'Solicitud de intercambio rechazada' };
  }

  // ==================== ROTATION PATTERNS ====================

  async findAllRotations(companyId: string, jwtCompanyId: string): Promise<any> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.getTenantDb(companyId);

    const rotations = await tenantDb.shiftRotationPattern.findMany({
      orderBy: { name: 'asc' },
      include: {
        details: {
          orderBy: { day_in_cycle: 'asc' },
          include: { shift_template: { select: { name: true, color: true } } },
        },
      },
    });

    return { data: rotations, total: rotations.length };
  }

  async createRotation(
    companyId: string,
    jwtCompanyId: string,
    dto: {
      name: string;
      description?: string;
      pattern_type?: string;
      cycle_days?: number;
      details?: { day_in_cycle: number; shift_template_id: string; is_rest_day?: boolean }[];
    },
  ): Promise<any> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.getTenantDb(companyId);

    const rotation = await tenantDb.shiftRotationPattern.create({
      data: {
        name: dto.name,
        description: dto.description,
        pattern_type: dto.pattern_type || 'WEEKLY',
        cycle_days: dto.cycle_days || 7,
        details: dto.details
          ? {
              create: dto.details.map((d) => ({
                day_in_cycle: d.day_in_cycle,
                shift_template_id: d.shift_template_id,
                is_rest_day: d.is_rest_day || false,
              })),
            }
          : undefined,
      },
      include: {
        details: {
          orderBy: { day_in_cycle: 'asc' },
          include: { shift_template: { select: { name: true, color: true } } },
        },
      },
    });

    this.logger.log(`Patrón de rotación creado: ${rotation.name}`);

    return { message: 'Patrón de rotación creado exitosamente', rotation };
  }

  async updateRotation(
    companyId: string,
    jwtCompanyId: string,
    id: string,
    dto: {
      name?: string;
      description?: string;
      pattern_type?: string;
      cycle_days?: number;
      is_active?: boolean;
      details?: { day_in_cycle: number; shift_template_id: string; is_rest_day?: boolean }[];
    },
  ): Promise<any> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.getTenantDb(companyId);

    const existing = await tenantDb.shiftRotationPattern.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Patrón de rotación no encontrado');
    }

    const updateData: any = {};
    if (dto.name) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.pattern_type) updateData.pattern_type = dto.pattern_type;
    if (dto.cycle_days) updateData.cycle_days = dto.cycle_days;
    if (dto.is_active !== undefined) updateData.is_active = dto.is_active;

    // Si se envían details, reemplazar todos
    if (dto.details) {
      await tenantDb.shiftRotationDetail.deleteMany({ where: { rotation_pattern_id: id } });
      updateData.details = {
        create: dto.details.map((d) => ({
          day_in_cycle: d.day_in_cycle,
          shift_template_id: d.shift_template_id,
          is_rest_day: d.is_rest_day || false,
        })),
      };
    }

    const updated = await tenantDb.shiftRotationPattern.update({
      where: { id },
      data: updateData,
      include: {
        details: {
          orderBy: { day_in_cycle: 'asc' },
          include: { shift_template: { select: { name: true, color: true } } },
        },
      },
    });

    return { message: 'Patrón de rotación actualizado exitosamente', rotation: updated };
  }

  async deleteRotation(companyId: string, jwtCompanyId: string, id: string): Promise<any> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.getTenantDb(companyId);

    const existing = await tenantDb.shiftRotationPattern.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Patrón de rotación no encontrado');
    }

    await tenantDb.shiftRotationPattern.delete({ where: { id } });
    return { message: 'Patrón de rotación eliminado exitosamente' };
  }

  // ==================== SELF-SERVICE (EMPLEADO) ====================

  /**
   * Ver mis turnos asignados
   */
  async getMyShifts(
    companyId: string,
    jwtCompanyId: string,
    userId: string,
    query: QueryAssignmentsDto,
  ): Promise<any> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.getTenantDb(companyId);

    const employee = await this.resolveEmployeeFromUser(tenantDb, userId);

    const where: any = { third_party_id: employee.id };
    if (query.status) where.status = query.status;
    if (query.date_from || query.date_to) {
      where.date = {};
      if (query.date_from) where.date.gte = new Date(query.date_from);
      if (query.date_to) where.date.lte = new Date(query.date_to);
    }

    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      tenantDb.shiftAssignment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: 'asc' },
        include: {
          shift_template: {
            select: { name: true, color: true, start_time: true, end_time: true, shift_type: true },
          },
          schedule: { select: { name: true } },
        },
      }),
      tenantDb.shiftAssignment.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  /**
   * Ver la programación publicada (vista general para empleados)
   */
  async getPublishedSchedules(
    companyId: string,
    jwtCompanyId: string,
  ): Promise<any> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.getTenantDb(companyId);

    const schedules = await tenantDb.shiftSchedule.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { period_start: 'desc' },
      select: {
        id: true,
        name: true,
        period_start: true,
        period_end: true,
        published_at: true,
      },
    });

    return { data: schedules };
  }

  /**
   * Solicitar intercambio de turno (self-service)
   */
  async requestSwap(
    companyId: string,
    jwtCompanyId: string,
    userId: string,
    dto: CreateSwapRequestDto,
  ): Promise<any> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.getTenantDb(companyId);

    const employee = await this.resolveEmployeeFromUser(tenantDb, userId);

    // Verificar que la asignación del solicitante le pertenece
    const myAssignment = await tenantDb.shiftAssignment.findUnique({
      where: { id: dto.requester_assignment_id },
    });
    if (!myAssignment || myAssignment.third_party_id !== employee.id) {
      throw new BadRequestException('La asignación indicada no te pertenece');
    }

    // Verificar que la asignación objetivo existe y pertenece al target
    const targetAssignment = await tenantDb.shiftAssignment.findUnique({
      where: { id: dto.target_assignment_id },
    });
    if (!targetAssignment || targetAssignment.third_party_id !== dto.target_id) {
      throw new BadRequestException('La asignación objetivo no corresponde al empleado indicado');
    }

    // Verificar que no haya una solicitud pendiente igual
    const existingSwap = await tenantDb.shiftSwapRequest.findFirst({
      where: {
        requester_id: employee.id,
        requester_assignment_id: dto.requester_assignment_id,
        status: 'PENDING',
      },
    });
    if (existingSwap) {
      throw new BadRequestException('Ya tienes una solicitud de intercambio pendiente para este turno');
    }

    const swap = await tenantDb.shiftSwapRequest.create({
      data: {
        requester_id: employee.id,
        target_id: dto.target_id,
        requester_assignment_id: dto.requester_assignment_id,
        target_assignment_id: dto.target_assignment_id,
        reason: dto.reason,
      },
      include: {
        target: { select: { name: true } },
        requester_assignment: {
          include: { shift_template: { select: { name: true } } },
        },
        target_assignment: {
          include: { shift_template: { select: { name: true } } },
        },
      },
    });

    // Marcar la asignación como SWAP_REQUESTED
    await tenantDb.shiftAssignment.update({
      where: { id: dto.requester_assignment_id },
      data: { status: 'SWAP_REQUESTED' },
    });

    this.logger.log(`Solicitud de intercambio: ${employee.name} → ${swap.target.name}`);

    return { message: 'Solicitud de intercambio enviada exitosamente', swap };
  }

  /**
   * Cancelar mi solicitud de intercambio
   */
  async cancelMySwap(
    companyId: string,
    jwtCompanyId: string,
    userId: string,
    swapId: string,
  ): Promise<any> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.getTenantDb(companyId);

    const employee = await this.resolveEmployeeFromUser(tenantDb, userId);

    const swap = await tenantDb.shiftSwapRequest.findUnique({ where: { id: swapId } });
    if (!swap) {
      throw new NotFoundException('Solicitud de intercambio no encontrada');
    }
    if (swap.requester_id !== employee.id) {
      throw new ForbiddenException('No puedes cancelar una solicitud que no te pertenece');
    }
    if (swap.status !== 'PENDING') {
      throw new BadRequestException('Solo se pueden cancelar solicitudes pendientes');
    }

    await tenantDb.shiftSwapRequest.update({
      where: { id: swapId },
      data: { status: 'CANCELLED' },
    });

    // Restaurar status de la asignación
    await tenantDb.shiftAssignment.update({
      where: { id: swap.requester_assignment_id },
      data: { status: 'ASSIGNED' },
    });

    return { message: 'Solicitud de intercambio cancelada' };
  }

  /**
   * Confirmar turno asignado (self-service)
   */
  async confirmMyShift(
    companyId: string,
    jwtCompanyId: string,
    userId: string,
    assignmentId: string,
  ): Promise<any> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.getTenantDb(companyId);

    const employee = await this.resolveEmployeeFromUser(tenantDb, userId);

    const assignment = await tenantDb.shiftAssignment.findUnique({
      where: { id: assignmentId },
    });
    if (!assignment) {
      throw new NotFoundException('Asignación no encontrada');
    }
    if (assignment.third_party_id !== employee.id) {
      throw new ForbiddenException('No puedes confirmar un turno que no te pertenece');
    }
    if (assignment.status !== 'ASSIGNED') {
      throw new BadRequestException('Solo se pueden confirmar turnos en estado ASSIGNED');
    }

    await tenantDb.shiftAssignment.update({
      where: { id: assignmentId },
      data: { status: 'CONFIRMED' },
    });

    return { message: 'Turno confirmado exitosamente' };
  }

  // ==================== EXPORT ====================

  async exportAssignments(
    companyId: string,
    jwtCompanyId: string,
    query: QueryAssignmentsDto,
  ): Promise<any> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.getTenantDb(companyId);

    const where: any = {};
    if (query.third_party_id) where.third_party_id = query.third_party_id;
    if (query.schedule_id) where.schedule_id = query.schedule_id;
    if (query.status) where.status = query.status;
    if (query.date_from || query.date_to) {
      where.date = {};
      if (query.date_from) where.date.gte = new Date(query.date_from);
      if (query.date_to) where.date.lte = new Date(query.date_to);
    }

    const data = await tenantDb.shiftAssignment.findMany({
      where,
      orderBy: [{ date: 'asc' }, { third_party: { name: 'asc' } }],
      include: {
        third_party: { select: { name: true, identification_number: true } },
        shift_template: { select: { name: true, start_time: true, end_time: true, total_hours: true } },
        schedule: { select: { name: true } },
      },
    });

    return {
      data: data.map((a: any) => ({
        employee_name: a.third_party?.name || '',
        employee_id: a.third_party?.identification_number || '',
        date: a.date,
        shift_name: a.shift_template?.name || '',
        start_time: a.custom_start_time || a.shift_template?.start_time || '',
        end_time: a.custom_end_time || a.shift_template?.end_time || '',
        total_hours: a.shift_template?.total_hours || 0,
        schedule: a.schedule?.name || '',
        status: a.status,
        notes: a.notes || '',
      })),
      total: data.length,
    };
  }
}
