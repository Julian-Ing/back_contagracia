import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { TenantContextService } from '@contagracia/shared-modules';
import {
  CreateEvaluationDto,
  UpdateEvaluationDto,
  QueryEvaluationsDto,
} from './dto';

@Injectable()
export class PerformanceEvaluationsService {
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

  private async resolveThirdPartyId(tenantDb: any, userId: string): Promise<string | null> {
    const tenantUser = await tenantDb.tenantUser.findUnique({
      where: { id: userId },
      select: { third_party_id: true },
    });

    return tenantUser?.third_party_id || null;
  }

  private readonly includeRelations = {
    third_party: {
      select: { id: true, name: true, identification_number: true },
    },
    evaluator: {
      select: { id: true, full_name: true, email: true },
    },
  };

  // ==================== CRUD ====================

  async findAll(
    companyId: string,
    jwtCompanyId: string,
    userId: string,
    selfOnly: boolean,
    query: QueryEvaluationsDto,
  ): Promise<any> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.getTenantDb(companyId);

    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '20', 10);
    const skip = (page - 1) * limit;
    const sortBy = query.sort_by || 'evaluation_date';
    const sortOrder = query.sort_order || 'desc';

    const where: any = {};

    // Self-view: solo mis evaluaciones
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

    if (query.evaluation_period) {
      where.evaluation_period = query.evaluation_period;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.date_from || query.date_to) {
      where.evaluation_date = {};
      if (query.date_from) where.evaluation_date.gte = new Date(query.date_from);
      if (query.date_to) where.evaluation_date.lte = new Date(query.date_to);
    }

    if (query.search) {
      where.third_party = {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { identification_number: { contains: query.search } },
        ],
      };
    }

    const [data, total] = await Promise.all([
      tenantDb.performanceEvaluation.findMany({
        where,
        include: this.includeRelations,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      tenantDb.performanceEvaluation.count({ where }),
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

  async findOne(
    companyId: string,
    jwtCompanyId: string,
    userId: string,
    selfOnly: boolean,
    id: string,
  ): Promise<any> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.getTenantDb(companyId);

    const evaluation = await tenantDb.performanceEvaluation.findUnique({
      where: { id },
      include: this.includeRelations,
    });

    if (!evaluation) {
      throw new NotFoundException('Evaluacion no encontrada');
    }

    if (selfOnly) {
      const thirdPartyId = await this.resolveThirdPartyId(tenantDb, userId);
      if (!thirdPartyId || evaluation.third_party_id !== thirdPartyId) {
        throw new ForbiddenException('No tienes acceso a esta evaluacion');
      }
    }

    return evaluation;
  }

  async create(
    companyId: string,
    jwtCompanyId: string,
    userId: string,
    dto: CreateEvaluationDto,
  ): Promise<any> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.getTenantDb(companyId);

    const thirdParty = await tenantDb.thirdParty.findUnique({
      where: { id: dto.third_party_id },
    });

    if (!thirdParty) {
      throw new NotFoundException('Empleado no encontrado');
    }

    // Calcular overall_score si se proveen los scores individuales
    let overallScore = dto.overall_score;
    if (!overallScore && dto.attendance_score && dto.performance_score && dto.attitude_score) {
      overallScore = Number(
        (dto.attendance_score * 0.3 + dto.performance_score * 0.5 + dto.attitude_score * 0.2).toFixed(2),
      );
    }

    return tenantDb.performanceEvaluation.create({
      data: {
        third_party_id: dto.third_party_id,
        evaluation_period: dto.evaluation_period,
        evaluation_date: new Date(dto.evaluation_date),
        attendance_score: dto.attendance_score,
        performance_score: dto.performance_score,
        attitude_score: dto.attitude_score,
        overall_score: overallScore,
        strengths: dto.strengths,
        areas_for_improvement: dto.areas_for_improvement,
        goals_next_period: dto.goals_next_period,
        evaluator_comments: dto.evaluator_comments,
        employee_comments: dto.employee_comments,
        evaluator_id: userId,
      },
      include: this.includeRelations,
    });
  }

  async update(
    companyId: string,
    jwtCompanyId: string,
    id: string,
    dto: UpdateEvaluationDto,
  ): Promise<any> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.getTenantDb(companyId);

    const existing = await tenantDb.performanceEvaluation.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Evaluacion no encontrada');
    }

    if (existing.status === 'APPROVED') {
      throw new BadRequestException('No se puede editar una evaluacion aprobada');
    }

    const data: any = {};
    if (dto.evaluation_period !== undefined) data.evaluation_period = dto.evaluation_period;
    if (dto.evaluation_date !== undefined) data.evaluation_date = new Date(dto.evaluation_date);
    if (dto.attendance_score !== undefined) data.attendance_score = dto.attendance_score;
    if (dto.performance_score !== undefined) data.performance_score = dto.performance_score;
    if (dto.attitude_score !== undefined) data.attitude_score = dto.attitude_score;
    if (dto.overall_score !== undefined) data.overall_score = dto.overall_score;
    if (dto.strengths !== undefined) data.strengths = dto.strengths;
    if (dto.areas_for_improvement !== undefined) data.areas_for_improvement = dto.areas_for_improvement;
    if (dto.goals_next_period !== undefined) data.goals_next_period = dto.goals_next_period;
    if (dto.evaluator_comments !== undefined) data.evaluator_comments = dto.evaluator_comments;
    if (dto.employee_comments !== undefined) data.employee_comments = dto.employee_comments;

    // Recalcular overall_score si se actualizan scores individuales
    const att = dto.attendance_score ?? existing.attendance_score;
    const perf = dto.performance_score ?? existing.performance_score;
    const attit = dto.attitude_score ?? existing.attitude_score;
    if (att && perf && attit && dto.overall_score === undefined) {
      data.overall_score = Number((att * 0.3 + perf * 0.5 + attit * 0.2).toFixed(2));
    }

    return tenantDb.performanceEvaluation.update({
      where: { id },
      data,
      include: this.includeRelations,
    });
  }

  async complete(companyId: string, jwtCompanyId: string, id: string): Promise<any> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.getTenantDb(companyId);

    const existing = await tenantDb.performanceEvaluation.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Evaluacion no encontrada');
    }

    if (existing.status !== 'DRAFT') {
      throw new BadRequestException('Solo se pueden completar evaluaciones en borrador');
    }

    return tenantDb.performanceEvaluation.update({
      where: { id },
      data: { status: 'COMPLETED' },
      include: this.includeRelations,
    });
  }

  async approve(companyId: string, jwtCompanyId: string, id: string): Promise<any> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.getTenantDb(companyId);

    const existing = await tenantDb.performanceEvaluation.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Evaluacion no encontrada');
    }

    if (existing.status !== 'COMPLETED') {
      throw new BadRequestException('Solo se pueden aprobar evaluaciones completadas');
    }

    return tenantDb.performanceEvaluation.update({
      where: { id },
      data: { status: 'APPROVED' },
      include: this.includeRelations,
    });
  }

  async remove(companyId: string, jwtCompanyId: string, id: string): Promise<any> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.getTenantDb(companyId);

    const existing = await tenantDb.performanceEvaluation.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Evaluacion no encontrada');
    }

    if (existing.status === 'APPROVED') {
      throw new BadRequestException('No se puede eliminar una evaluacion aprobada');
    }

    await tenantDb.performanceEvaluation.delete({ where: { id } });
    return { message: 'Evaluacion eliminada exitosamente' };
  }
}
