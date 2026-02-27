import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { TenantContextService } from '@contagracia/shared-modules';
import {
  CreateObservationDto,
  UpdateObservationDto,
  QueryObservationsDto,
} from './dto';

@Injectable()
export class EmployeeObservationsService {
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
   * Resuelve el third_party_id del usuario autenticado.
   * JWT userId → TenantUser → third_party_id
   */
  private async resolveThirdPartyId(tenantDb: any, userId: string): Promise<string | null> {
    const tenantUser = await tenantDb.tenantUser.findUnique({
      where: { id: userId },
      select: { third_party_id: true },
    });
    return tenantUser?.third_party_id ?? null;
  }

  // ==================== CRUD ====================

  /**
   * Listar observaciones con filtros, paginación y búsqueda
   * Si selfOnly=true, filtra solo las del empleado autenticado
   */
  async findAll(
    companyId: string,
    jwtCompanyId: string,
    userId: string,
    selfOnly: boolean,
    query: QueryObservationsDto,
  ): Promise<any> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.getTenantDb(companyId);

    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '20', 10);
    const skip = (page - 1) * limit;
    const sortBy = query.sort_by || 'observation_date';
    const sortOrder = query.sort_order || 'desc';

    const where: any = {};

    // Self-view: solo mis observaciones
    if (selfOnly) {
      const thirdPartyId = await this.resolveThirdPartyId(tenantDb, userId);
      if (!thirdPartyId) {
        return { data: [], pagination: { total: 0, page, limit, totalPages: 0 } };
      }
      where.third_party_id = thirdPartyId;
    }

    if (query.third_party_id) {
      where.third_party_id = query.third_party_id;
    }

    if (query.observation_type) {
      where.observation_type = query.observation_type;
    }

    if (query.severity) {
      where.severity = query.severity;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.date_from || query.date_to) {
      where.observation_date = {};
      if (query.date_from) where.observation_date.gte = new Date(query.date_from);
      if (query.date_to) where.observation_date.lte = new Date(query.date_to);
    }

    // Búsqueda por nombre o documento del empleado
    if (query.search) {
      where.third_party = {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { identification_number: { contains: query.search } },
        ],
      };
    }

    const [data, total] = await Promise.all([
      tenantDb.employeeObservation.findMany({
        where,
        include: {
          third_party: {
            select: { id: true, name: true, identification_number: true },
          },
          created_by: {
            select: { id: true, full_name: true, email: true },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      tenantDb.employeeObservation.count({ where }),
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
   * Obtener una observación por ID
   */
  async findOne(
    companyId: string,
    jwtCompanyId: string,
    userId: string,
    selfOnly: boolean,
    id: string,
  ): Promise<any> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.getTenantDb(companyId);

    const observation = await tenantDb.employeeObservation.findUnique({
      where: { id },
      include: {
        employee_profile: {
          include: {
            third_party: {
              select: { id: true, name: true, identification_number: true },
            },
          },
        },
        created_by: {
          select: { id: true, full_name: true, email: true },
        },
      },
    });

    if (!observation) {
      throw new NotFoundException('Observacion no encontrada');
    }

    // Self-view: verificar que sea del empleado autenticado
    if (selfOnly) {
      const thirdPartyId = await this.resolveThirdPartyId(tenantDb, userId);
      if (!thirdPartyId || observation.third_party_id !== thirdPartyId) {
        throw new ForbiddenException('No tienes acceso a esta observacion');
      }
    }

    return observation;
  }

  /**
   * Crear observación
   */
  async create(
    companyId: string,
    jwtCompanyId: string,
    userId: string,
    dto: CreateObservationDto,
  ): Promise<any> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.getTenantDb(companyId);

    // Verificar que el tercero (empleado) existe
    const thirdParty = await tenantDb.thirdParty.findUnique({
      where: { id: dto.third_party_id },
    });

    if (!thirdParty) {
      throw new NotFoundException('Empleado no encontrado');
    }

    return tenantDb.employeeObservation.create({
      data: {
        third_party_id: dto.third_party_id,
        title: dto.title,
        description: dto.description,
        observation_date: new Date(dto.observation_date),
        observation_type: dto.observation_type as any,
        severity: (dto.severity as any) || 'MEDIUM',
        action_required: dto.action_required || null,
        follow_up_date: dto.follow_up_date ? new Date(dto.follow_up_date) : null,
        created_by_id: userId,
      },
      include: {
        employee_profile: {
          include: {
            third_party: {
              select: { id: true, name: true, identification_number: true },
            },
          },
        },
        created_by: {
          select: { id: true, full_name: true, email: true },
        },
      },
    });
  }

  /**
   * Editar observación
   */
  async update(
    companyId: string,
    jwtCompanyId: string,
    id: string,
    dto: UpdateObservationDto,
  ): Promise<any> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.getTenantDb(companyId);

    const existing = await tenantDb.employeeObservation.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Observacion no encontrada');
    }

    const data: any = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.observation_date !== undefined) data.observation_date = new Date(dto.observation_date);
    if (dto.observation_type !== undefined) data.observation_type = dto.observation_type;
    if (dto.severity !== undefined) data.severity = dto.severity;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.action_required !== undefined) data.action_required = dto.action_required;
    if (dto.follow_up_date !== undefined) data.follow_up_date = dto.follow_up_date ? new Date(dto.follow_up_date) : null;

    return tenantDb.employeeObservation.update({
      where: { id },
      data,
      include: {
        employee_profile: {
          include: {
            third_party: {
              select: { id: true, name: true, identification_number: true },
            },
          },
        },
        created_by: {
          select: { id: true, full_name: true, email: true },
        },
      },
    });
  }

  /**
   * Eliminar observación (soft delete: cambiar status a ARCHIVED)
   */
  async remove(companyId: string, jwtCompanyId: string, id: string): Promise<any> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.getTenantDb(companyId);

    const existing = await tenantDb.employeeObservation.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Observacion no encontrada');
    }

    await tenantDb.employeeObservation.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });

    return { message: 'Observacion archivada exitosamente' };
  }

  // ==================== ESTADÍSTICAS ====================

  /**
   * Estadísticas generales de observaciones
   */
  async getStats(companyId: string, jwtCompanyId: string): Promise<any> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.getTenantDb(companyId);

    const [
      total,
      byType,
      bySeverity,
      byStatus,
      activeCount,
      pendingFollowUp,
    ] = await Promise.all([
      tenantDb.employeeObservation.count(),
      tenantDb.employeeObservation.groupBy({
        by: ['observation_type'],
        _count: { id: true },
      }),
      tenantDb.employeeObservation.groupBy({
        by: ['severity'],
        _count: { id: true },
      }),
      tenantDb.employeeObservation.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      tenantDb.employeeObservation.count({
        where: { status: 'ACTIVE' },
      }),
      tenantDb.employeeObservation.count({
        where: {
          status: 'ACTIVE',
          follow_up_date: { lte: new Date() },
        },
      }),
    ]);

    return {
      total,
      active: activeCount,
      pending_follow_up: pendingFollowUp,
      by_type: byType.map((g: any) => ({ type: g.observation_type, count: g._count.id })),
      by_severity: bySeverity.map((g: any) => ({ severity: g.severity, count: g._count.id })),
      by_status: byStatus.map((g: any) => ({ status: g.status, count: g._count.id })),
    };
  }
}
