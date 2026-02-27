import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { TenantContextService } from '@contagracia/shared-modules';
import { QueryAnalysisDto, GenerateEvaluationsDto } from './dto';

// Tipos positivos y negativos de observaciones
const POSITIVE_TYPES = ['RECOGNITION', 'ACHIEVEMENT'];
const NEGATIVE_TYPES = ['INCIDENT', 'WARNING', 'CONCERN'];

interface EmployeeMetrics {
  third_party_id: string;
  employee_name: string;
  identification_number: string;
  attendance_score: number;
  performance_score: number;
  attitude_score: number;
  overall_score: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  risk_score: number;
  trend: 'improving' | 'declining' | 'stable';
  observations_summary: {
    total: number;
    positive: number;
    negative: number;
    neutral: number;
  };
  attendance_summary: {
    total_days: number;
    present_days: number;
    late_days: number;
    absent_days: number;
    attendance_rate: number;
    punctuality_rate: number;
  };
  recommendations: string[];
}

@Injectable()
export class EvaluationsAnalysisService {
  constructor(private readonly tenantContext: TenantContextService) {}

  private async getTenantDb(companyId: string): Promise<any> {
    const tenantDb = await this.tenantContext.getTenantClient(companyId);
    if (!tenantDb) {
      throw new NotFoundException('Empresa no encontrada o inactiva');
    }
    return tenantDb;
  }

  /**
   * Resuelve rango de fechas desde QueryAnalysisDto
   */
  private resolveDateRange(query: QueryAnalysisDto): { dateFrom: Date; dateTo: Date } {
    const dateTo = query.date_to ? new Date(query.date_to) : new Date();
    let dateFrom: Date;

    if (query.date_from) {
      dateFrom = new Date(query.date_from);
    } else {
      dateFrom = new Date(dateTo);
      switch (query.period) {
        case '1m': dateFrom.setMonth(dateFrom.getMonth() - 1); break;
        case '6m': dateFrom.setMonth(dateFrom.getMonth() - 6); break;
        case '1y': dateFrom.setFullYear(dateFrom.getFullYear() - 1); break;
        case '3m':
        default: dateFrom.setMonth(dateFrom.getMonth() - 3); break;
      }
    }

    return { dateFrom, dateTo };
  }

  // ==================== CÁLCULO DE SCORES ====================

  /**
   * Calcula el score de asistencia (peso 30%)
   * combinedRate = (attendanceRate * 0.7) + (punctualityRate * 0.3)
   */
  private calculateAttendanceScore(attendanceRecords: any[]): {
    score: number;
    summary: EmployeeMetrics['attendance_summary'];
  } {
    if (attendanceRecords.length === 0) {
      return {
        score: 3, // Default neutro si no hay datos
        summary: { total_days: 0, present_days: 0, late_days: 0, absent_days: 0, attendance_rate: 0, punctuality_rate: 0 },
      };
    }

    const totalDays = attendanceRecords.length;
    // Consideramos presente si tiene check_in (independientemente de si llegó tarde)
    const presentDays = attendanceRecords.filter((r: any) => r.check_in !== null).length;
    const absentDays = totalDays - presentDays;

    // Puntualidad: llegó a tiempo (tiene check_in y worked_hours >= threshold o no hay late flag)
    // Simplificación: si check_in existe y worked_hours > 0, contamos como presente
    // Late = tiene check_in pero worked_hours < expected (aprox. usando notas o campo)
    // Usamos un criterio simple: si tiene notas con "tarde" o worked_hours < 7 y > 0
    const lateDays = attendanceRecords.filter((r: any) => {
      if (!r.check_in) return false;
      // Si worked_hours < 7h, consideramos que llegó tarde o salió temprano
      const hours = r.worked_hours ? parseFloat(r.worked_hours.toString()) : 0;
      return hours > 0 && hours < 7;
    }).length;

    const attendanceRate = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;
    const onTimeDays = presentDays - lateDays;
    const punctualityRate = presentDays > 0 ? (onTimeDays / presentDays) * 100 : 0;

    const combinedRate = (attendanceRate * 0.7) + (punctualityRate * 0.3);

    let score: number;
    if (combinedRate >= 95) score = 5;
    else if (combinedRate >= 90) score = 4;
    else if (combinedRate >= 80) score = 3;
    else if (combinedRate >= 70) score = 2;
    else score = 1;

    return {
      score,
      summary: {
        total_days: totalDays,
        present_days: presentDays,
        late_days: lateDays,
        absent_days: absentDays,
        attendance_rate: Number(attendanceRate.toFixed(1)),
        punctuality_rate: Number(punctualityRate.toFixed(1)),
      },
    };
  }

  /**
   * Calcula el score de desempeño (peso 50%)
   * Basado en observaciones positivas vs negativas
   */
  private calculatePerformanceScore(observations: any[]): {
    score: number;
    summary: EmployeeMetrics['observations_summary'];
  } {
    const positive = observations.filter((o: any) => POSITIVE_TYPES.includes(o.observation_type)).length;
    const negative = observations.filter((o: any) => NEGATIVE_TYPES.includes(o.observation_type)).length;
    const neutral = observations.length - positive - negative;

    if (observations.length === 0) {
      return {
        score: 3,
        summary: { total: 0, positive: 0, negative: 0, neutral: 0 },
      };
    }

    const points = (positive * 2) - (negative * 2);
    const maxPossiblePoints = observations.length * 2;
    const ratio = (points + maxPossiblePoints) / (2 * maxPossiblePoints);

    let score: number;
    if (ratio >= 0.8) score = 5;
    else if (ratio >= 0.65) score = 4;
    else if (ratio >= 0.45) score = 3;
    else if (ratio >= 0.3) score = 2;
    else score = 1;

    return {
      score,
      summary: { total: observations.length, positive, negative, neutral },
    };
  }

  /**
   * Calcula el score de actitud (peso 20%)
   * Basado en tipo + severidad de observaciones
   */
  private calculateAttitudeScore(observations: any[]): number {
    if (observations.length === 0) return 3;

    const scores = observations.map((o: any) => {
      const isPositive = POSITIVE_TYPES.includes(o.observation_type);
      if (isPositive) {
        switch (o.severity) {
          case 'HIGH': return 5;
          case 'MEDIUM': return 4.5;
          case 'LOW': return 4;
          default: return 4;
        }
      } else if (NEGATIVE_TYPES.includes(o.observation_type)) {
        switch (o.severity) {
          case 'HIGH': return 1;
          case 'MEDIUM': return 2;
          case 'LOW': return 2.5;
          default: return 2;
        }
      }
      return 3; // FEEDBACK neutro
    });

    const avg = scores.reduce((a: number, b: number) => a + b, 0) / scores.length;
    return Math.round(Math.min(5, Math.max(1, avg)));
  }

  /**
   * Calcula el nivel de riesgo
   */
  private calculateRiskLevel(
    overallScore: number,
    negativeObsCount: number,
    lateRate: number,
  ): { level: 'LOW' | 'MEDIUM' | 'HIGH'; score: number } {
    let riskScore = 0;

    if (overallScore < 2.5) riskScore += 3;
    else if (overallScore < 3.5) riskScore += 1;

    if (negativeObsCount >= 3) riskScore += 2;
    else if (negativeObsCount >= 1) riskScore += 1;

    if (lateRate > 20) riskScore += 2;
    else if (lateRate > 10) riskScore += 1;

    let level: 'LOW' | 'MEDIUM' | 'HIGH';
    if (riskScore >= 4) level = 'HIGH';
    else if (riskScore >= 2) level = 'MEDIUM';
    else level = 'LOW';

    return { level, score: riskScore };
  }

  /**
   * Detecta tendencia comparando periodos
   */
  private async detectTrend(
    tenantDb: any,
    thirdPartyId: string,
    dateFrom: Date,
    dateTo: Date,
  ): Promise<'improving' | 'declining' | 'stable'> {
    const periodLength = dateTo.getTime() - dateFrom.getTime();
    const previousFrom = new Date(dateFrom.getTime() - periodLength);
    const previousTo = dateFrom;

    const [currentPositive, previousPositive] = await Promise.all([
      tenantDb.employeeObservation.count({
        where: {
          third_party_id: thirdPartyId,
          observation_type: { in: POSITIVE_TYPES },
          observation_date: { gte: dateFrom, lte: dateTo },
        },
      }),
      tenantDb.employeeObservation.count({
        where: {
          third_party_id: thirdPartyId,
          observation_type: { in: POSITIVE_TYPES },
          observation_date: { gte: previousFrom, lte: previousTo },
        },
      }),
    ]);

    if (currentPositive > previousPositive) return 'improving';
    if (currentPositive < previousPositive) return 'declining';
    return 'stable';
  }

  /**
   * Genera recomendaciones automáticas
   */
  private generateRecommendations(metrics: Partial<EmployeeMetrics>): string[] {
    const recommendations: string[] = [];

    if (metrics.attendance_summary && metrics.attendance_summary.total_days > 0) {
      const lateRate = (metrics.attendance_summary.late_days / metrics.attendance_summary.total_days) * 100;
      if (lateRate > 15) {
        recommendations.push('Revisar puntualidad: alto porcentaje de llegadas tarde');
      }
    }

    if (metrics.performance_score && metrics.performance_score >= 4) {
      recommendations.push('Considerar para reconocimiento o ascenso por buen desempeno');
    }

    if (metrics.performance_score && metrics.performance_score < 3) {
      recommendations.push('Elaborar plan de desarrollo individual');
    }

    if (metrics.trend === 'improving') {
      recommendations.push('Tendencia positiva: mantener motivacion actual');
    }

    if (metrics.trend === 'declining') {
      recommendations.push('Tendencia negativa: requiere intervencion y seguimiento');
    }

    return recommendations;
  }

  // ==================== ENDPOINTS PÚBLICOS ====================

  /**
   * Dashboard: métricas de todos los empleados
   */
  async getDashboard(
    companyId: string,
    jwtCompanyId: string,
    query: QueryAnalysisDto,
  ): Promise<any> {
    if (jwtCompanyId !== companyId) {
      throw new ForbiddenException('No tienes acceso a esta empresa');
    }
    const tenantDb = await this.getTenantDb(companyId);
    const { dateFrom, dateTo } = this.resolveDateRange(query);

    // Obtener todos los empleados activos
    const employees = await tenantDb.thirdParty.findMany({
      where: {
        roles: { has: 'EMPLOYEE' },
        OR: [{ employee_status: 'ACTIVE' }, { employee_status: null }],
      },
    });

    const metricsPromises = employees.map(async (emp: any) => {
      return this.calculateEmployeeMetrics(tenantDb, emp, dateFrom, dateTo);
    });

    const allMetrics = await Promise.all(metricsPromises);

    // Clasificaciones
    const topPerformers = allMetrics.filter((m) => m.overall_score >= 4.0).sort((a, b) => b.overall_score - a.overall_score);
    const needsAttention = allMetrics.filter((m) => m.overall_score < 3.0 || m.risk_level === 'HIGH');
    const risingStars = allMetrics.filter((m) => m.trend === 'improving' && m.overall_score >= 3.5);

    // Promedios generales
    const avgOverall = allMetrics.length > 0
      ? Number((allMetrics.reduce((s, m) => s + m.overall_score, 0) / allMetrics.length).toFixed(2))
      : 0;

    return {
      period: { date_from: dateFrom.toISOString(), date_to: dateTo.toISOString() },
      summary: {
        total_employees: allMetrics.length,
        average_score: avgOverall,
        top_performers_count: topPerformers.length,
        needs_attention_count: needsAttention.length,
        rising_stars_count: risingStars.length,
        risk_distribution: {
          high: allMetrics.filter((m) => m.risk_level === 'HIGH').length,
          medium: allMetrics.filter((m) => m.risk_level === 'MEDIUM').length,
          low: allMetrics.filter((m) => m.risk_level === 'LOW').length,
        },
      },
      top_performers: topPerformers.slice(0, 10),
      needs_attention: needsAttention.slice(0, 10),
      rising_stars: risingStars.slice(0, 10),
      all_employees: allMetrics,
    };
  }

  /**
   * Análisis detallado de un empleado
   */
  async getEmployeeAnalysis(
    companyId: string,
    jwtCompanyId: string,
    userId: string,
    selfOnly: boolean,
    employeeProfileId: string,
    query: QueryAnalysisDto,
  ): Promise<any> {
    if (jwtCompanyId !== companyId) {
      throw new ForbiddenException('No tienes acceso a esta empresa');
    }
    const tenantDb = await this.getTenantDb(companyId);

    // Self-view check
    if (selfOnly) {
      const tenantUser = await tenantDb.tenantUser.findUnique({
        where: { id: userId },
        select: { third_party_id: true },
      });
      if (!tenantUser?.third_party_id || tenantUser.third_party_id !== employeeProfileId) {
        throw new ForbiddenException('No tienes acceso a este empleado');
      }
    }

    const employee = await tenantDb.thirdParty.findUnique({
      where: { id: employeeProfileId },
    });

    if (!employee) {
      throw new NotFoundException('Empleado no encontrado');
    }

    const { dateFrom, dateTo } = this.resolveDateRange(query);
    const metrics = await this.calculateEmployeeMetrics(tenantDb, employee, dateFrom, dateTo);

    // Historial de evaluaciones
    const evaluations = await tenantDb.performanceEvaluation.findMany({
      where: { third_party_id: employee.id },
      orderBy: { evaluation_date: 'desc' },
      take: 10,
      include: {
        evaluator: { select: { id: true, full_name: true } },
      },
    });

    // Observaciones recientes
    const recentObservations = await tenantDb.employeeObservation.findMany({
      where: {
        third_party_id: employee.id,
        observation_date: { gte: dateFrom, lte: dateTo },
      },
      orderBy: { observation_date: 'desc' },
      include: {
        created_by: { select: { id: true, full_name: true } },
      },
    });

    return {
      employee: {
        id: employee.id,
        name: employee.name,
        identification_number: employee.identification_number,
      },
      period: { date_from: dateFrom.toISOString(), date_to: dateTo.toISOString() },
      metrics,
      evaluations_history: evaluations,
      recent_observations: recentObservations,
    };
  }

  /**
   * Calcula métricas completas de un empleado para un periodo
   */
  private async calculateEmployeeMetrics(
    tenantDb: any,
    employee: any,
    dateFrom: Date,
    dateTo: Date,
  ): Promise<EmployeeMetrics> {
    const [attendanceRecords, observations] = await Promise.all([
      tenantDb.attendanceRecord.findMany({
        where: {
          third_party_id: employee.id,
          date: { gte: dateFrom, lte: dateTo },
        },
      }),
      tenantDb.employeeObservation.findMany({
        where: {
          third_party_id: employee.id,
          observation_date: { gte: dateFrom, lte: dateTo },
          status: { not: 'ARCHIVED' },
        },
      }),
    ]);

    const { score: attendanceScore, summary: attendanceSummary } = this.calculateAttendanceScore(attendanceRecords);
    const { score: performanceScore, summary: obsSummary } = this.calculatePerformanceScore(observations);
    const attitudeScore = this.calculateAttitudeScore(observations);
    const overallScore = Number((attendanceScore * 0.3 + performanceScore * 0.5 + attitudeScore * 0.2).toFixed(2));

    const lateRate = attendanceSummary.total_days > 0
      ? (attendanceSummary.late_days / attendanceSummary.total_days) * 100
      : 0;

    const { level: riskLevel, score: riskScore } = this.calculateRiskLevel(
      overallScore,
      obsSummary.negative,
      lateRate,
    );

    const trend = await this.detectTrend(tenantDb, employee.id, dateFrom, dateTo);

    const metrics: Partial<EmployeeMetrics> = {
      attendance_score: attendanceScore,
      performance_score: performanceScore,
      attendance_summary: attendanceSummary,
      trend,
    };
    const recommendations = this.generateRecommendations(metrics);

    return {
      third_party_id: employee.id,
      employee_name: employee.name || 'Sin nombre',
      identification_number: employee.identification_number || '',
      attendance_score: attendanceScore,
      performance_score: performanceScore,
      attitude_score: attitudeScore,
      overall_score: overallScore,
      risk_level: riskLevel,
      risk_score: riskScore,
      trend,
      observations_summary: obsSummary,
      attendance_summary: attendanceSummary,
      recommendations,
    };
  }

  // ==================== GENERACIÓN AUTOMÁTICA ====================

  /**
   * Genera evaluaciones automáticas para empleados que lo necesiten
   */
  async generateEvaluations(
    companyId: string,
    jwtCompanyId: string,
    userId: string,
    dto: GenerateEvaluationsDto,
  ): Promise<any> {
    if (jwtCompanyId !== companyId) {
      throw new ForbiddenException('No tienes acceso a esta empresa');
    }
    const tenantDb = await this.getTenantDb(companyId);

    const dateTo = dto.date_to ? new Date(dto.date_to) : new Date();
    const dateFrom = dto.date_from
      ? new Date(dto.date_from)
      : new Date(new Date(dateTo).setMonth(dateTo.getMonth() - 3));

    // Obtener empleados activos
    const employees = await tenantDb.thirdParty.findMany({
      where: {
        roles: { has: 'EMPLOYEE' },
        OR: [{ employee_status: 'ACTIVE' }, { employee_status: null }],
      },
    });

    // Obtener evaluaciones ya existentes para este periodo
    const existingEvaluations = await tenantDb.performanceEvaluation.findMany({
      where: { evaluation_period: dto.evaluation_period },
      select: { third_party_id: true },
    });
    const alreadyEvaluated = new Set(existingEvaluations.map((e: any) => e.third_party_id));

    const generated: any[] = [];
    const skipped: string[] = [];

    for (const employee of employees) {
      // Saltar si ya tiene evaluación en este periodo
      if (alreadyEvaluated.has(employee.id)) {
        skipped.push(employee.name || employee.id);
        continue;
      }

      const metrics = await this.calculateEmployeeMetrics(tenantDb, employee, dateFrom, dateTo);

      // Solo generar si: score < 4 OR riesgo no es low OR tiene 3+ observaciones
      const shouldGenerate =
        metrics.overall_score < 4 ||
        metrics.risk_level !== 'LOW' ||
        metrics.observations_summary.total >= 3;

      if (!shouldGenerate) {
        skipped.push(employee.name || employee.id);
        continue;
      }

      // Auto-generar campos narrativos
      const strengths = this.generateStrengthsText(metrics);
      const areasForImprovement = this.generateImprovementText(metrics);
      const goals = this.generateGoalsText(metrics);

      const evaluation = await tenantDb.performanceEvaluation.create({
        data: {
          third_party_id: employee.id,
          evaluation_period: dto.evaluation_period,
          evaluation_date: new Date(),
          attendance_score: metrics.attendance_score,
          performance_score: metrics.performance_score,
          attitude_score: metrics.attitude_score,
          overall_score: metrics.overall_score,
          strengths,
          areas_for_improvement: areasForImprovement,
          goals_next_period: goals,
          evaluator_comments: `Evaluacion generada automaticamente. Riesgo: ${metrics.risk_level}. Tendencia: ${metrics.trend}.`,
          evaluator_id: userId,
          status: 'DRAFT',
        },
      });

      generated.push({
        evaluation_id: evaluation.id,
        employee_name: metrics.employee_name,
        overall_score: metrics.overall_score,
        risk_level: metrics.risk_level,
      });
    }

    return {
      period: dto.evaluation_period,
      generated_count: generated.length,
      skipped_count: skipped.length,
      generated,
      skipped,
    };
  }

  private generateStrengthsText(metrics: EmployeeMetrics): string {
    const strengths: string[] = [];
    if (metrics.attendance_score >= 4) strengths.push('Excelente asistencia y puntualidad');
    if (metrics.performance_score >= 4) strengths.push('Alto rendimiento laboral');
    if (metrics.attitude_score >= 4) strengths.push('Actitud positiva destacada');
    if (metrics.observations_summary.positive > 0) {
      strengths.push(`${metrics.observations_summary.positive} reconocimiento(s) positivo(s) en el periodo`);
    }
    if (metrics.trend === 'improving') strengths.push('Tendencia de mejora constante');
    return strengths.length > 0 ? strengths.join('. ') + '.' : 'Sin fortalezas destacadas en este periodo.';
  }

  private generateImprovementText(metrics: EmployeeMetrics): string {
    const areas: string[] = [];
    if (metrics.attendance_score <= 2) areas.push('Mejorar asistencia y puntualidad');
    if (metrics.performance_score <= 2) areas.push('Incrementar productividad y cumplimiento de metas');
    if (metrics.attitude_score <= 2) areas.push('Trabajar en actitud y relaciones laborales');
    if (metrics.observations_summary.negative > 0) {
      areas.push(`Resolver ${metrics.observations_summary.negative} incidencia(s) pendiente(s)`);
    }
    if (metrics.attendance_summary.late_days > 3) areas.push('Reducir llegadas tarde');
    return areas.length > 0 ? areas.join('. ') + '.' : 'Sin areas criticas de mejora identificadas.';
  }

  private generateGoalsText(metrics: EmployeeMetrics): string {
    const goals: string[] = [];
    if (metrics.attendance_score < 4) goals.push('Alcanzar 95% de asistencia');
    if (metrics.performance_score < 4) goals.push('Mejorar puntaje de desempeno a 4+');
    if (metrics.risk_level === 'HIGH') goals.push('Reducir nivel de riesgo a medio o bajo');
    if (metrics.trend === 'declining') goals.push('Revertir tendencia negativa');
    goals.push('Mantener comunicacion activa con supervisor directo');
    return goals.join('. ') + '.';
  }
}
