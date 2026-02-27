import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { TenantContextService } from '@contagracia/shared-modules';
import {
  CreateTravelExpenseDto,
  RequestTravelExpenseDto,
  QueryTravelExpensesDto,
  EditTravelExpenseDto,
  ApproveTravelExpenseDto,
  RejectTravelExpenseDto,
} from './dto';

const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  BUSINESS_TRIP: 'Viaje de Negocios',
  TRAINING: 'Capacitacion',
  CLIENT_MEETING: 'Reunion con Cliente',
  CONFERENCE: 'Conferencia',
  PROJECT_VISIT: 'Visita a Proyecto',
  AUDIT: 'Auditoria',
  RECRUITMENT: 'Reclutamiento',
  MAINTENANCE: 'Mantenimiento',
  SALES_VISIT: 'Visita Comercial',
  OTHER: 'Otro',
};

const VALID_CATEGORIES = Object.keys(EXPENSE_CATEGORY_LABELS);

const VALID_STATUSES = [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'IN_PROGRESS',
  'PENDING_LEGALIZATION',
  'LEGALIZED',
  'CANCELLED',
];

@Injectable()
export class HrExpensesService {
  private readonly logger = new Logger(HrExpensesService.name);

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
   * Genera consecutivo VIA-XXXX
   */
  private async generateConsecutive(tenantDb: any): Promise<string> {
    const last = await tenantDb.employeeTravelExpense.findFirst({
      where: { expense_code: { not: null } },
      orderBy: { created_at: 'desc' },
      select: { expense_code: true },
    });

    let nextNum = 1;
    if (last?.expense_code) {
      const match = last.expense_code.match(/VIA-(\d+)/);
      if (match) {
        nextNum = parseInt(match[1], 10) + 1;
      }
    }

    return `VIA-${String(nextNum).padStart(4, '0')}`;
  }

  /**
   * Listar gastos de viaticos con filtros y paginacion
   */
  async findAll(companyId: string, jwtCompanyId: string, query: QueryTravelExpensesDto): Promise<any> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.getTenantDb(companyId);

    const where: any = {};

    if (query.third_party_id) {
      where.third_party_id = query.third_party_id;
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.expense_category) {
      where.expense_category = query.expense_category;
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
      tenantDb.employeeTravelExpense.findMany({
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
          cost_center: { select: { id: true, name: true } },
        },
      }),
      tenantDb.employeeTravelExpense.count({ where }),
    ]);

    return {
      data: data.map((te: any) => ({
        id: te.id,
        expense_code: te.expense_code,
        third_party_id: te.third_party_id,
        employee_name: te.third_party?.name || 'Sin nombre',
        expense_category: te.expense_category,
        expense_category_label: EXPENSE_CATEGORY_LABELS[te.expense_category] || te.expense_category,
        travel_purpose: te.travel_purpose,
        destination: te.destination,
        start_date: te.start_date,
        end_date: te.end_date,
        assigned_amount: te.assigned_amount ? Number(te.assigned_amount) : 0,
        reported_amount: te.reported_amount ? Number(te.reported_amount) : null,
        amount_difference: te.amount_difference ? Number(te.amount_difference) : null,
        status: te.status,
        approved_by_name: te.approved_by?.name || null,
        approved_at: te.approved_at,
        rejection_reason: te.rejection_reason,
        admin_notes: te.admin_notes,
        notes: te.notes,
        cost_center_name: te.cost_center?.name || null,
        created_at: te.created_at,
      })),
      total,
      skip,
      take,
    };
  }

  /**
   * Detalle de un gasto de viatico
   */
  async findOne(companyId: string, jwtCompanyId: string, id: string): Promise<any> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.getTenantDb(companyId);

    const te = await tenantDb.employeeTravelExpense.findUnique({
      where: { id },
      include: {
        third_party: {
          select: { name: true, identification_number: true },
        },
        approved_by: {
          select: { name: true },
        },
        cost_center: { select: { id: true, name: true, code: true } },
      },
    });

    if (!te) {
      throw new NotFoundException('Gasto de viatico no encontrado');
    }

    return {
      id: te.id,
      expense_code: te.expense_code,
      third_party_id: te.third_party_id,
      employee_name: te.third_party?.name || 'Sin nombre',
      employee_identification: te.third_party?.identification_number || null,
      expense_category: te.expense_category,
      expense_category_label: EXPENSE_CATEGORY_LABELS[te.expense_category] || te.expense_category,
      travel_purpose: te.travel_purpose,
      destination: te.destination,
      start_date: te.start_date,
      end_date: te.end_date,
      assigned_amount: te.assigned_amount ? Number(te.assigned_amount) : 0,
      reported_amount: te.reported_amount ? Number(te.reported_amount) : null,
      amount_difference: te.amount_difference ? Number(te.amount_difference) : null,
      status: te.status,
      approved_by_name: te.approved_by?.name || null,
      approved_at: te.approved_at,
      rejection_reason: te.rejection_reason,
      admin_notes: te.admin_notes,
      notes: te.notes,
      reported_at: te.reported_at,
      cost_center: te.cost_center
        ? { id: te.cost_center.id, name: te.cost_center.name, code: te.cost_center.code }
        : null,
      created_by_id: te.created_by_id,
      created_at: te.created_at,
      updated_at: te.updated_at,
    };
  }

  /**
   * Estadisticas de gastos de viaticos
   */
  async getStats(companyId: string, jwtCompanyId: string): Promise<any> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.getTenantDb(companyId);

    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [pending, approvedThisMonth, allThisMonth] = await Promise.all([
      tenantDb.employeeTravelExpense.count({ where: { status: 'PENDING' } }),
      tenantDb.employeeTravelExpense.count({
        where: { status: 'APPROVED', approved_at: { gte: firstOfMonth } },
      }),
      tenantDb.employeeTravelExpense.findMany({
        where: {
          status: { in: ['APPROVED', 'PENDING', 'IN_PROGRESS'] },
          start_date: { gte: firstOfMonth },
        },
        select: { expense_category: true, assigned_amount: true, status: true },
      }),
    ]);

    // Agrupar por categoria
    const byCategory: Record<string, { count: number; total: number }> = {};
    let totalAssigned = 0;

    for (const te of allThisMonth) {
      const amount = te.assigned_amount ? Number(te.assigned_amount) : 0;
      totalAssigned += amount;
      if (!byCategory[te.expense_category]) {
        byCategory[te.expense_category] = { count: 0, total: 0 };
      }
      byCategory[te.expense_category].count++;
      byCategory[te.expense_category].total += amount;
    }

    return {
      pending,
      approved_this_month: approvedThisMonth,
      total_assigned_this_month: totalAssigned,
      this_month: {
        total: allThisMonth.length,
        by_category: Object.entries(byCategory).map(([cat, data]) => ({
          expense_category: cat,
          label: EXPENSE_CATEGORY_LABELS[cat] || cat,
          count: data.count,
          total: data.total,
        })),
      },
    };
  }

  /**
   * Crear gasto de viatico (admin)
   */
  async create(
    companyId: string,
    jwtCompanyId: string,
    userId: string,
    dto: CreateTravelExpenseDto,
  ): Promise<any> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.getTenantDb(companyId);

    if (!VALID_CATEGORIES.includes(dto.expense_category)) {
      throw new BadRequestException(`Categoria invalida: ${dto.expense_category}`);
    }

    // Verificar que el empleado existe y esta activo
    const employee = await tenantDb.thirdParty.findFirst({
      where: { id: dto.third_party_id, roles: { has: 'EMPLOYEE' } },
      select: { id: true, name: true, employee_status: true },
    });
    if (!employee) {
      throw new NotFoundException('Empleado no encontrado');
    }
    if (employee.employee_status !== 'ACTIVE') {
      throw new BadRequestException('El empleado no esta activo');
    }

    // Validar fechas
    if (new Date(dto.start_date) > new Date(dto.end_date)) {
      throw new BadRequestException('La fecha de inicio debe ser anterior a la fecha de fin');
    }

    // Validar centro de costo si se proporciona
    if (dto.cost_center_id) {
      const cc = await tenantDb.costCenter.findUnique({ where: { id: dto.cost_center_id } });
      if (!cc) {
        throw new NotFoundException('Centro de costo no encontrado');
      }
    }

    const expenseCode = await this.generateConsecutive(tenantDb);

    const te = await tenantDb.employeeTravelExpense.create({
      data: {
        third_party_id: dto.third_party_id,
        expense_code: expenseCode,
        expense_category: dto.expense_category,
        travel_purpose: dto.travel_purpose,
        destination: dto.destination,
        start_date: new Date(dto.start_date),
        end_date: new Date(dto.end_date),
        assigned_amount: dto.assigned_amount,
        cost_center_id: dto.cost_center_id || null,
        notes: dto.notes || null,
        created_by_id: userId,
      },
    });

    this.logger.log(
      `Viatico creado: ${expenseCode} - ${EXPENSE_CATEGORY_LABELS[dto.expense_category]} para ${employee.name}`,
    );

    return {
      message: 'Gasto de viatico creado exitosamente',
      travel_expense: {
        id: te.id,
        expense_code: te.expense_code,
        third_party_id: te.third_party_id,
        expense_category: te.expense_category,
        destination: te.destination,
        assigned_amount: Number(te.assigned_amount),
        status: te.status,
      },
    };
  }

  /**
   * Solicitar viatico (empleado — auto-busca su ThirdParty via TenantUser)
   */
  async requestExpense(
    companyId: string,
    jwtCompanyId: string,
    userId: string,
    dto: RequestTravelExpenseDto,
  ): Promise<any> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.getTenantDb(companyId);

    if (!VALID_CATEGORIES.includes(dto.expense_category)) {
      throw new BadRequestException(`Categoria invalida: ${dto.expense_category}`);
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

    if (employee.employee_status !== 'ACTIVE') {
      throw new BadRequestException('Tu perfil de empleado no esta activo');
    }

    // Validar fechas
    if (new Date(dto.start_date) > new Date(dto.end_date)) {
      throw new BadRequestException('La fecha de inicio debe ser anterior a la fecha de fin');
    }

    // Validar centro de costo si se proporciona
    if (dto.cost_center_id) {
      const cc = await tenantDb.costCenter.findUnique({ where: { id: dto.cost_center_id } });
      if (!cc) {
        throw new NotFoundException('Centro de costo no encontrado');
      }
    }

    const expenseCode = await this.generateConsecutive(tenantDb);

    const te = await tenantDb.employeeTravelExpense.create({
      data: {
        third_party_id: employee.id,
        expense_code: expenseCode,
        expense_category: dto.expense_category,
        travel_purpose: dto.travel_purpose,
        destination: dto.destination,
        start_date: new Date(dto.start_date),
        end_date: new Date(dto.end_date),
        assigned_amount: dto.assigned_amount,
        cost_center_id: dto.cost_center_id || null,
        notes: dto.notes || null,
        created_by_id: userId,
      },
    });

    this.logger.log(`Empleado solicito viatico: ${expenseCode}`);

    return {
      message: 'Solicitud de viatico enviada exitosamente',
      travel_expense: {
        id: te.id,
        expense_code: te.expense_code,
        expense_category: te.expense_category,
        destination: te.destination,
        assigned_amount: Number(te.assigned_amount),
        status: te.status,
      },
    };
  }

  /**
   * Editar gasto de viatico (solo si PENDING)
   */
  async update(
    companyId: string,
    jwtCompanyId: string,
    id: string,
    dto: EditTravelExpenseDto,
  ): Promise<any> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.getTenantDb(companyId);

    const existing = await tenantDb.employeeTravelExpense.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Gasto de viatico no encontrado');
    }
    if (existing.status !== 'PENDING') {
      throw new BadRequestException('Solo se pueden editar viaticos pendientes');
    }

    if (dto.expense_category && !VALID_CATEGORIES.includes(dto.expense_category)) {
      throw new BadRequestException(`Categoria invalida: ${dto.expense_category}`);
    }

    const startDate = dto.start_date || existing.start_date.toISOString().split('T')[0];
    const endDate = dto.end_date || existing.end_date.toISOString().split('T')[0];

    if (new Date(startDate) > new Date(endDate)) {
      throw new BadRequestException('La fecha de inicio debe ser anterior a la fecha de fin');
    }

    // Validar centro de costo si se proporciona
    if (dto.cost_center_id) {
      const cc = await tenantDb.costCenter.findUnique({ where: { id: dto.cost_center_id } });
      if (!cc) {
        throw new NotFoundException('Centro de costo no encontrado');
      }
    }

    const updateData: any = {};
    if (dto.expense_category) updateData.expense_category = dto.expense_category;
    if (dto.travel_purpose) updateData.travel_purpose = dto.travel_purpose;
    if (dto.destination) updateData.destination = dto.destination;
    if (dto.start_date) updateData.start_date = new Date(dto.start_date);
    if (dto.end_date) updateData.end_date = new Date(dto.end_date);
    if (dto.assigned_amount !== undefined) updateData.assigned_amount = dto.assigned_amount;
    if (dto.cost_center_id !== undefined) updateData.cost_center_id = dto.cost_center_id || null;
    if (dto.notes !== undefined) updateData.notes = dto.notes;
    if (dto.admin_notes !== undefined) updateData.admin_notes = dto.admin_notes;

    const updated = await tenantDb.employeeTravelExpense.update({
      where: { id },
      data: updateData,
    });

    return {
      message: 'Viatico actualizado exitosamente',
      travel_expense: {
        id: updated.id,
        expense_code: updated.expense_code,
        expense_category: updated.expense_category,
        destination: updated.destination,
        assigned_amount: Number(updated.assigned_amount),
        status: updated.status,
      },
    };
  }

  /**
   * Aprobar gasto de viatico
   */
  async approve(
    companyId: string,
    jwtCompanyId: string,
    userId: string,
    id: string,
    dto?: ApproveTravelExpenseDto,
  ): Promise<any> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.getTenantDb(companyId);

    const te = await tenantDb.employeeTravelExpense.findUnique({ where: { id } });
    if (!te) {
      throw new NotFoundException('Gasto de viatico no encontrado');
    }
    if (te.status !== 'PENDING') {
      throw new BadRequestException('Solo se pueden aprobar viaticos pendientes');
    }

    // Resolver aprobador via TenantUser → third_party_id
    const tenantUser = await tenantDb.tenantUser.findUnique({
      where: { id: userId },
      select: { third_party_id: true },
    });

    const updated = await tenantDb.employeeTravelExpense.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approved_by_id: tenantUser?.third_party_id || null,
        approved_at: new Date(),
        admin_notes: dto?.admin_notes || te.admin_notes,
      },
    });

    this.logger.log(`Viatico aprobado: ${te.expense_code || id}`);

    return {
      message: 'Viatico aprobado exitosamente',
      travel_expense: {
        id: updated.id,
        expense_code: updated.expense_code,
        status: updated.status,
        approved_at: updated.approved_at,
      },
    };
  }

  /**
   * Rechazar gasto de viatico
   */
  async reject(
    companyId: string,
    jwtCompanyId: string,
    userId: string,
    id: string,
    dto: RejectTravelExpenseDto,
  ): Promise<any> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.getTenantDb(companyId);

    const te = await tenantDb.employeeTravelExpense.findUnique({ where: { id } });
    if (!te) {
      throw new NotFoundException('Gasto de viatico no encontrado');
    }
    if (te.status !== 'PENDING') {
      throw new BadRequestException('Solo se pueden rechazar viaticos pendientes');
    }

    // Resolver rechazador via TenantUser → third_party_id
    const tenantUser = await tenantDb.tenantUser.findUnique({
      where: { id: userId },
      select: { third_party_id: true },
    });

    const updated = await tenantDb.employeeTravelExpense.update({
      where: { id },
      data: {
        status: 'REJECTED',
        approved_by_id: tenantUser?.third_party_id || null,
        approved_at: new Date(),
        rejection_reason: dto.rejection_reason,
      },
    });

    this.logger.log(`Viatico rechazado: ${te.expense_code || id}`);

    return {
      message: 'Viatico rechazado',
      travel_expense: {
        id: updated.id,
        expense_code: updated.expense_code,
        status: updated.status,
        rejection_reason: updated.rejection_reason,
      },
    };
  }

  /**
   * Eliminar gasto de viatico (solo PENDING)
   */
  async delete(companyId: string, jwtCompanyId: string, id: string): Promise<any> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.getTenantDb(companyId);

    const te = await tenantDb.employeeTravelExpense.findUnique({ where: { id } });
    if (!te) {
      throw new NotFoundException('Gasto de viatico no encontrado');
    }
    if (te.status !== 'PENDING') {
      throw new BadRequestException('Solo se pueden eliminar viaticos pendientes');
    }

    await tenantDb.employeeTravelExpense.delete({ where: { id } });

    this.logger.log(`Viatico eliminado: ${te.expense_code || id}`);

    return { message: 'Viatico eliminado exitosamente' };
  }
}
