import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TenantContextService } from '@contagracia/shared-modules';
import { CompanySettingsService } from '../company-settings/company-settings.service';
import { PayrollConceptsService } from '../payroll-concepts/payroll-concepts.service';
import { PayrollWithholdingUvtService } from '../payroll-withholding-uvt/payroll-withholding-uvt.service';

import { ConfigLoader } from './engine/config-loader';
import { SettlementDispatcher } from './engine/settlement-dispatcher';

import { BaseCalculator } from './engine/base-calculator';
import type {
  AdditionalIncome,
  EmployeeInput,
  LiquidationFlags,
  MonthlyAccumulated,
  OvertimeEntry,
  PayrollConceptConfig,
  PayrollConfig,
  SettlementPeriod,
  UvtBracket,
  VacationEntry,
  TerminationReason,
} from './engine/types';
import {
  EMPTY_ADDITIONAL_INCOME,
  EMPTY_LIQUIDATION_FLAGS,
  EMPTY_MONTHLY_ACCUMULATED,
} from './engine/types';

import { CreateSettlementDto } from './dto/create-settlement.dto';
import { UpdateSettlementDto } from './dto/update-settlement.dto';
import { QuerySettlementsDto } from './dto/query-settlements.dto';

@Injectable()
export class PayrollSettlementsService {
  private readonly logger = new Logger(PayrollSettlementsService.name);
  private readonly notificationServiceUrl: string;

  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly companySettings: CompanySettingsService,
    private readonly payrollConcepts: PayrollConceptsService,
    private readonly payrollUvt: PayrollWithholdingUvtService,
    private readonly configService: ConfigService,
  ) {
    this.notificationServiceUrl =
      this.configService.get<string>('NOTIFICATION_SERVICE_URL') || 'http://localhost:3015';
  }

  private async getClient(companyId: string): Promise<any> {
    const tenantDb = await this.tenantContext.getTenantClient(companyId);
    if (!tenantDb) {
      throw new NotFoundException('Empresa no encontrada o inactiva');
    }
    return tenantDb;
  }

  // ==================== CRUD ====================

  async findAll(companyId: string, query: QuerySettlementsDto): Promise<any> {
    const tenantDb = await this.getClient(companyId);

    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.settlement_type) where.settlement_type = query.settlement_type;
    if (query.year) where.year = query.year;
    if (query.month) where.month = query.month;

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortBy = query.sortBy ?? 'created_at';
    const sortOrder = query.sortOrder ?? 'desc';

    const [data, total] = await Promise.all([
      tenantDb.payrollSettlement.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: { select: { details: true } },
        },
      }),
      tenantDb.payrollSettlement.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(companyId: string, id: string): Promise<any> {
    const tenantDb = await this.getClient(companyId);

    const settlement = await tenantDb.payrollSettlement.findUnique({
      where: { id },
      include: {
        details: {
          select: {
            id: true,
            third_party_id: true,
            employee_name: true,
            employee_document: true,
            employee_position: true,
            employee_base_salary: true,
            employee_salary_type: true,
            days_worked: true,
            total_accrued: true,
            total_deductions: true,
            net_salary: true,
            total_employer_contributions: true,
            total_provisions: true,
            total_cost: true,
            status: true,
            error_message: true,
            payroll_data: true,
          },
          orderBy: { employee_name: 'asc' },
        },
      },
    });

    if (!settlement) {
      throw new NotFoundException('Liquidación no encontrada');
    }

    return settlement;
  }

  async findDetail(companyId: string, settlementId: string, detailId: string): Promise<any> {
    const tenantDb = await this.getClient(companyId);

    const detail = await tenantDb.payrollSettlementDetail.findFirst({
      where: { id: detailId, payroll_settlement_id: settlementId },
    });

    if (!detail) {
      throw new NotFoundException('Detalle de liquidación no encontrado');
    }

    return detail;
  }

  async create(companyId: string, dto: CreateSettlementDto, userId: string): Promise<any> {
    const tenantDb = await this.getClient(companyId);

    const startDate = new Date(dto.start_date);
    const endDate = new Date(dto.end_date);

    // Determine year, month, and is_last_of_month
    const year = endDate.getFullYear();
    const month = endDate.getMonth() + 1;
    const lastDayOfMonth = new Date(year, month, 0).getDate();
    const isLastOfMonth = endDate.getDate() >= lastDayOfMonth - 1;

    const settlement = await tenantDb.payrollSettlement.create({
      data: {
        settlement_name: dto.settlement_name,
        settlement_type: (dto.settlement_type as any) ?? 'REGULAR',
        start_date: startDate,
        end_date: endDate,
        payment_date: dto.payment_date ? new Date(dto.payment_date) : null,
        period_number: dto.period_number ?? 1,
        is_last_of_month: isLastOfMonth,
        year,
        month,
        liquidate_prima: dto.liquidate_prima ?? false,
        liquidate_cesantias: dto.liquidate_cesantias ?? false,
        liquidate_cesantias_interest: dto.liquidate_cesantias_interest ?? false,
        liquidate_vacaciones: dto.liquidate_vacaciones ?? false,
        termination_reason: dto.termination_reason ?? null,
        notes: dto.notes,
        created_by_id: userId,
      },
    });

    // If employee_ids were provided, add them
    if (dto.employee_ids?.length) {
      await this.addEmployeesInternal(tenantDb, settlement.id, dto.employee_ids);
    }

    return this.findOne(companyId, settlement.id);
  }

  async update(companyId: string, id: string, dto: UpdateSettlementDto): Promise<any> {
    const tenantDb = await this.getClient(companyId);

    const settlement = await tenantDb.payrollSettlement.findUnique({ where: { id } });
    if (!settlement) {
      throw new NotFoundException('Liquidación no encontrada');
    }
    if (settlement.status !== 'DRAFT') {
      throw new BadRequestException('Solo se pueden editar liquidaciones en estado DRAFT');
    }

    const updateData: any = {};
    if (dto.settlement_name !== undefined) updateData.settlement_name = dto.settlement_name;
    if (dto.start_date !== undefined) updateData.start_date = new Date(dto.start_date);
    if (dto.end_date !== undefined) {
      const endDate = new Date(dto.end_date);
      updateData.end_date = endDate;
      updateData.year = endDate.getFullYear();
      updateData.month = endDate.getMonth() + 1;
      const lastDay = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0).getDate();
      updateData.is_last_of_month = endDate.getDate() >= lastDay - 1;
    }
    if (dto.payment_date !== undefined) updateData.payment_date = dto.payment_date ? new Date(dto.payment_date) : null;
    if (dto.period_number !== undefined) updateData.period_number = dto.period_number;
    if (dto.liquidate_prima !== undefined) updateData.liquidate_prima = dto.liquidate_prima;
    if (dto.liquidate_cesantias !== undefined) updateData.liquidate_cesantias = dto.liquidate_cesantias;
    if (dto.liquidate_cesantias_interest !== undefined) updateData.liquidate_cesantias_interest = dto.liquidate_cesantias_interest;
    if (dto.liquidate_vacaciones !== undefined) updateData.liquidate_vacaciones = dto.liquidate_vacaciones;
    if (dto.notes !== undefined) updateData.notes = dto.notes;

    await tenantDb.payrollSettlement.update({ where: { id }, data: updateData });

    return this.findOne(companyId, id);
  }

  async remove(companyId: string, id: string): Promise<any> {
    const tenantDb = await this.getClient(companyId);

    const settlement = await tenantDb.payrollSettlement.findUnique({ where: { id } });
    if (!settlement) {
      throw new NotFoundException('Liquidación no encontrada');
    }
    if (settlement.status !== 'DRAFT') {
      throw new BadRequestException('Solo se pueden eliminar liquidaciones en estado DRAFT');
    }

    await tenantDb.payrollSettlement.delete({ where: { id } });
    return { deleted: true };
  }

  // ==================== EMPLOYEES ====================

  async addEmployees(companyId: string, settlementId: string, employeeIds: string[]): Promise<any> {
    const tenantDb = await this.getClient(companyId);

    const settlement = await tenantDb.payrollSettlement.findUnique({ where: { id: settlementId } });
    if (!settlement) throw new NotFoundException('Liquidación no encontrada');
    if (settlement.status !== 'DRAFT') {
      throw new BadRequestException('Solo se pueden agregar empleados en estado DRAFT');
    }

    const added = await this.addEmployeesInternal(tenantDb, settlementId, employeeIds);

    // Update total_employees count
    const count = await tenantDb.payrollSettlementDetail.count({
      where: { payroll_settlement_id: settlementId },
    });
    await tenantDb.payrollSettlement.update({
      where: { id: settlementId },
      data: { total_employees: count },
    });

    return { added, total_employees: count };
  }

  async addAllEmployees(companyId: string, settlementId: string): Promise<any> {
    const tenantDb = await this.getClient(companyId);

    const settlement = await tenantDb.payrollSettlement.findUnique({ where: { id: settlementId } });
    if (!settlement) throw new NotFoundException('Liquidación no encontrada');
    if (settlement.status !== 'DRAFT') {
      throw new BadRequestException('Solo se pueden agregar empleados en estado DRAFT');
    }

    // Get all active employees
    const activeEmployees = await tenantDb.thirdParty.findMany({
      where: {
        employee_status: 'ACTIVE',
        roles: { has: 'EMPLOYEE' },
      },
      select: { id: true },
    });

    const employeeIds = activeEmployees.map((e: any) => e.id);
    const added = await this.addEmployeesInternal(tenantDb, settlementId, employeeIds);

    const count = await tenantDb.payrollSettlementDetail.count({
      where: { payroll_settlement_id: settlementId },
    });
    await tenantDb.payrollSettlement.update({
      where: { id: settlementId },
      data: { total_employees: count },
    });

    return { added, total_employees: count };
  }

  async updateDetailDaysWorked(
    companyId: string,
    settlementId: string,
    detailId: string,
    daysWorked: number,
  ): Promise<any> {
    const tenantDb = await this.getClient(companyId);

    if (!Number.isInteger(daysWorked) || daysWorked < 1 || daysWorked > 30) {
      throw new BadRequestException('Los días trabajados deben ser un número entero entre 1 y 30');
    }

    const settlement = await tenantDb.payrollSettlement.findUnique({ where: { id: settlementId } });
    if (!settlement) throw new NotFoundException('Liquidación no encontrada');
    if (settlement.status !== 'DRAFT' && settlement.status !== 'CALCULATED') {
      throw new BadRequestException('Solo se pueden modificar días en estado DRAFT o CALCULATED');
    }

    const detail = await tenantDb.payrollSettlementDetail.findFirst({
      where: { id: detailId, payroll_settlement_id: settlementId },
    });
    if (!detail) throw new NotFoundException('Detalle no encontrado');

    await tenantDb.payrollSettlementDetail.update({
      where: { id: detailId },
      data: { days_worked: daysWorked },
    });

    return { updated: true, days_worked: daysWorked };
  }

  async removeEmployee(companyId: string, settlementId: string, detailId: string): Promise<any> {
    const tenantDb = await this.getClient(companyId);

    const settlement = await tenantDb.payrollSettlement.findUnique({ where: { id: settlementId } });
    if (!settlement) throw new NotFoundException('Liquidación no encontrada');
    if (settlement.status !== 'DRAFT') {
      throw new BadRequestException('Solo se pueden eliminar empleados en estado DRAFT');
    }

    const detail = await tenantDb.payrollSettlementDetail.findFirst({
      where: { id: detailId, payroll_settlement_id: settlementId },
    });
    if (!detail) throw new NotFoundException('Detalle no encontrado');

    await tenantDb.payrollSettlementDetail.delete({ where: { id: detailId } });

    const count = await tenantDb.payrollSettlementDetail.count({
      where: { payroll_settlement_id: settlementId },
    });
    await tenantDb.payrollSettlement.update({
      where: { id: settlementId },
      data: { total_employees: count },
    });

    return { deleted: true, total_employees: count };
  }

  // ==================== CALCULATION ====================

  async calculate(companyId: string, settlementId: string): Promise<any> {
    const tenantDb = await this.getClient(companyId);

    const settlement = await tenantDb.payrollSettlement.findUnique({
      where: { id: settlementId },
      include: { details: true },
    });
    if (!settlement) throw new NotFoundException('Liquidación no encontrada');
    if (settlement.status !== 'DRAFT' && settlement.status !== 'CALCULATED') {
      throw new BadRequestException('La liquidación debe estar en estado DRAFT o CALCULATED para calcular');
    }
    if (settlement.details.length === 0) {
      throw new BadRequestException('La liquidación no tiene empleados');
    }

    // Load config
    const { config, concepts, uvtBrackets } = await this.loadCalculationConfig(companyId, settlement.year);

    let totalAccrued = 0;
    let totalDeductions = 0;
    let totalNetSalary = 0;
    let totalEmployerContributions = 0;
    let totalProvisions = 0;
    let totalPayrollCost = 0;

    // Calculate each employee
    let calculatedCount = 0;
    let errorCount = 0;

    for (let detail of settlement.details) {
      try {
        // Re-fetch current salary from ThirdParty in case it changed since the employee was added
        detail = await this.refreshDetailSalary(tenantDb, detail);

        const result = await this.calculateSingleEmployee(
          tenantDb, detail, settlement, config, concepts, uvtBrackets,
        );

        await tenantDb.payrollSettlementDetail.update({
          where: { id: detail.id },
          data: {
            // Update snapshot with fresh salary data
            employee_base_salary: detail.employee_base_salary,
            employee_salary_type: detail.employee_salary_type,
            employee_includes_transport: detail.employee_includes_transport,
            // Calculation results
            payroll_data: result.payrollData,
            total_accrued: result.totalAccrued,
            total_deductions: result.totalDeductions,
            net_salary: result.netSalary,
            total_employer_contributions: result.totalEmployerContributions,
            total_provisions: result.totalProvisions,
            total_cost: result.totalCost,
            days_worked: result.daysWorked,
            status: 'CALCULATED',
            error_message: null,
          },
        });

        totalAccrued += result.totalAccrued;
        totalDeductions += result.totalDeductions;
        totalNetSalary += result.netSalary;
        totalEmployerContributions += result.totalEmployerContributions;
        totalProvisions += result.totalProvisions;
        totalPayrollCost += result.totalCost;
        calculatedCount++;
      } catch (error: any) {
        this.logger.warn(
          `Error calculando empleado ${detail.employee_name} (${detail.id}): ${error.message}`,
        );
        await tenantDb.payrollSettlementDetail.update({
          where: { id: detail.id },
          data: {
            status: 'DRAFT',
            error_message: error.message || 'Error de cálculo',
          },
        });
        errorCount++;
      }
    }

    // Update settlement totals
    await tenantDb.payrollSettlement.update({
      where: { id: settlementId },
      data: {
        status: 'CALCULATED',
        calculated_at: new Date(),
        total_accrued: totalAccrued,
        total_deductions: totalDeductions,
        total_net_salary: totalNetSalary,
        total_employer_contributions: totalEmployerContributions,
        total_provisions: totalProvisions,
        total_payroll_cost: totalPayrollCost,
      },
    });

    // Send notification after calculation
    this.sendCalculationNotification(
      companyId,
      settlement.settlement_name,
      settlementId,
      calculatedCount,
      errorCount,
      totalNetSalary,
    ).catch((err) =>
      this.logger.warn(`Error enviando notificación de cálculo: ${err.message}`),
    );

    return this.findOne(companyId, settlementId);
  }

  async recalculateEmployee(
    companyId: string,
    settlementId: string,
    detailId: string,
  ): Promise<any> {
    const tenantDb = await this.getClient(companyId);

    const settlement = await tenantDb.payrollSettlement.findUnique({ where: { id: settlementId } });
    if (!settlement) throw new NotFoundException('Liquidación no encontrada');
    if (settlement.status !== 'DRAFT' && settlement.status !== 'CALCULATED') {
      throw new BadRequestException('La liquidación debe estar en estado DRAFT o CALCULATED');
    }

    let detail = await tenantDb.payrollSettlementDetail.findFirst({
      where: { id: detailId, payroll_settlement_id: settlementId },
    });
    if (!detail) throw new NotFoundException('Detalle no encontrado');

    // Re-fetch current salary from ThirdParty in case it changed since the employee was added
    detail = await this.refreshDetailSalary(tenantDb, detail);

    const { config, concepts, uvtBrackets } = await this.loadCalculationConfig(companyId, settlement.year);

    const result = await this.calculateSingleEmployee(
      tenantDb, detail, settlement, config, concepts, uvtBrackets,
    );

    await tenantDb.payrollSettlementDetail.update({
      where: { id: detailId },
      data: {
        // Update snapshot with fresh salary data
        employee_base_salary: detail.employee_base_salary,
        employee_salary_type: detail.employee_salary_type,
        employee_includes_transport: detail.employee_includes_transport,
        // Calculation results
        payroll_data: result.payrollData,
        total_accrued: result.totalAccrued,
        total_deductions: result.totalDeductions,
        net_salary: result.netSalary,
        total_employer_contributions: result.totalEmployerContributions,
        total_provisions: result.totalProvisions,
        total_cost: result.totalCost,
        days_worked: result.daysWorked,
        status: 'CALCULATED',
        error_message: null,
      },
    });

    // Recalculate settlement totals
    await this.recalculateSettlementTotals(tenantDb, settlementId);

    // Transition settlement from DRAFT to CALCULATED if at least one detail is calculated
    if (settlement.status === 'DRAFT') {
      const hasCalculated = await tenantDb.payrollSettlementDetail.count({
        where: { payroll_settlement_id: settlementId, status: 'CALCULATED' },
      });
      if (hasCalculated > 0) {
        await tenantDb.payrollSettlement.update({
          where: { id: settlementId },
          data: { status: 'CALCULATED', calculated_at: new Date() },
        });
      }
    }

    return this.findDetail(companyId, settlementId, detailId);
  }

  // ==================== EMPLOYEE HISTORY ====================

  async findEmployeeHistory(companyId: string, employeeId: string, query: QuerySettlementsDto): Promise<any> {
    const tenantDb = await this.getClient(companyId);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const settlementWhere: any = {};
    if (query.status) settlementWhere.status = query.status;
    if (query.settlement_type) settlementWhere.settlement_type = query.settlement_type;
    if (query.year) settlementWhere.year = query.year;
    if (query.month) settlementWhere.month = query.month;

    const detailWhere: any = {
      third_party_id: employeeId,
    };
    if (Object.keys(settlementWhere).length > 0) {
      detailWhere.payroll_settlement = settlementWhere;
    }

    const [data, total] = await Promise.all([
      tenantDb.payrollSettlementDetail.findMany({
        where: detailWhere,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          third_party_id: true,
          employee_name: true,
          employee_document: true,
          employee_position: true,
          employee_base_salary: true,
          days_worked: true,
          total_accrued: true,
          total_deductions: true,
          net_salary: true,
          total_employer_contributions: true,
          total_provisions: true,
          total_cost: true,
          status: true,
          error_message: true,
          created_at: true,
          payroll_settlement: {
            select: {
              id: true,
              settlement_name: true,
              settlement_type: true,
              status: true,
              start_date: true,
              end_date: true,
              year: true,
              month: true,
              period_number: true,
            },
          },
        },
      }),
      tenantDb.payrollSettlementDetail.count({ where: detailWhere }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ==================== WORKFLOW ====================

  async approve(companyId: string, id: string, userId: string): Promise<any> {
    const tenantDb = await this.getClient(companyId);

    const settlement = await tenantDb.payrollSettlement.findUnique({ where: { id } });
    if (!settlement) throw new NotFoundException('Liquidación no encontrada');
    if (settlement.status !== 'CALCULATED') {
      throw new BadRequestException('Solo se pueden aprobar liquidaciones en estado CALCULATED');
    }

    await tenantDb.payrollSettlement.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approved_by_id: userId,
        approved_at: new Date(),
      },
    });

    // Also mark all details as APPROVED
    await tenantDb.payrollSettlementDetail.updateMany({
      where: { payroll_settlement_id: id, status: 'CALCULATED' },
      data: { status: 'APPROVED' },
    });

    // Send approval notification
    const totalFormatted = new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(Number(settlement.total_net_salary ?? 0));

    this.sendNotification(companyId, {
      type: 'payroll_approved',
      title: 'Nomina aprobada',
      message: `"${settlement.settlement_name}" ha sido aprobada. Neto a pagar: ${totalFormatted}`,
      action_url: `/hr/payroll/settlements/${id}`,
    }).catch((err) =>
      this.logger.warn(`Error enviando notificación de aprobación: ${err.message}`),
    );

    // Notificar que los desprendibles están disponibles en el portal
    this.sendNotification(companyId, {
      type: 'payslip_available',
      title: 'Desprendible de nómina disponible',
      message: `Los desprendibles de "${settlement.settlement_name}" están disponibles en el portal de empleados.`,
      action_url: '/dashboard/portal/payslips',
    }).catch((err) =>
      this.logger.warn(`Error enviando notificación de desprendible: ${err.message}`),
    );

    return this.findOne(companyId, id);
  }

  async void(companyId: string, id: string, reason?: string): Promise<any> {
    const tenantDb = await this.getClient(companyId);

    const settlement = await tenantDb.payrollSettlement.findUnique({ where: { id } });
    if (!settlement) throw new NotFoundException('Liquidación no encontrada');
    if (settlement.status === 'CANCELLED') {
      throw new BadRequestException('La liquidación ya está anulada');
    }

    await tenantDb.payrollSettlement.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        notes: reason ? `${settlement.notes ?? ''}\n[ANULADA] ${reason}`.trim() : settlement.notes,
      },
    });

    await tenantDb.payrollSettlementDetail.updateMany({
      where: { payroll_settlement_id: id },
      data: { status: 'CANCELLED' },
    });

    return this.findOne(companyId, id);
  }

  // ==================== PILA ====================

  async generatePila(companyId: string, id: string): Promise<any> {
    const tenantDb = await this.getClient(companyId);

    const settlement = await tenantDb.payrollSettlement.findUnique({
      where: { id },
      include: {
        details: {
          where: { status: { not: 'CANCELLED' } },
        },
      },
    });
    if (!settlement) throw new NotFoundException('Liquidación no encontrada');
    if (!['APPROVED', 'PAID'].includes(settlement.status)) {
      throw new BadRequestException('Solo se puede generar PILA para liquidaciones aprobadas o pagadas');
    }
    if (settlement.details.length === 0) {
      throw new BadRequestException('La liquidación no tiene empleados');
    }

    // Get company info for PILA header
    const settings = await this.companySettings.getCategory(companyId, 'company');

    const lines: string[] = [];
    const period = `${settlement.year}-${String(settlement.month).padStart(2, '0')}`;

    // Type 01 — Employer header
    lines.push(
      [
        '01',                                                         // Tipo registro
        '0001',                                                       // Secuencia
        settings?.company_name?.substring(0, 200) ?? 'EMPRESA',       // Razon social
        settings?.identification_number ?? '',                        // NIT
        settings?.dv ?? '',                                           // DV
        'E',                                                          // Tipo aportante (Empresa)
        period,                                                       // Periodo
        String(settlement.details.length).padStart(5, '0'),           // Cantidad cotizantes
        (settlement.total_employer_contributions ?? 0).toFixed(0),    // Total aportes patronales
        (settlement.total_deductions ?? 0).toFixed(0),                // Total deducciones empleado
      ].join('|'),
    );

    // Type 02 — Employee records
    let seq = 2;
    for (const detail of settlement.details) {
      const pd = detail.payroll_data as any;
      if (!pd) continue;

      lines.push(
        [
          '02',                                                       // Tipo registro
          String(seq).padStart(4, '0'),                               // Secuencia
          detail.employee_document ?? '',                              // Documento
          detail.employee_name ?? '',                                  // Nombre
          detail.employee_worker_type_code ?? '01',                   // Tipo cotizante
          detail.employee_worker_subtype_code ?? '00',                // Subtipo
          String(detail.days_worked).padStart(2, '0'),                // Dias cotizados
          (pd.metadata?.ibc ?? detail.employee_base_salary ?? 0).toFixed(0), // IBC
          (pd.deductions?.eps_deduction ?? 0).toFixed(0),             // Aporte salud empleado
          (pd.employer_contributions?.employer_health ?? 0).toFixed(0), // Aporte salud empleador
          (pd.deductions?.pension_deduction ?? 0).toFixed(0),         // Aporte pension empleado
          (pd.employer_contributions?.employer_pension ?? 0).toFixed(0), // Aporte pension empleador
          (pd.deductions?.fondosp_deduction_SP ?? 0).toFixed(0),      // Fondo solidaridad
          (pd.employer_contributions?.arl ?? 0).toFixed(0),           // ARL
          (pd.employer_contributions?.ccf ?? 0).toFixed(0),           // CCF
          (pd.employer_contributions?.sena ?? 0).toFixed(0),          // SENA
          (pd.employer_contributions?.icbf ?? 0).toFixed(0),          // ICBF
        ].join('|'),
      );
      seq++;
    }

    const fileName = `PILA_${period}_${settlement.settlement_number ?? id.slice(0, 8)}.txt`;
    const fileContent = lines.join('\n');
    const totalContribution = (settlement.total_employer_contributions ?? 0) +
      (settlement.total_deductions ?? 0);

    return {
      file_name: fileName,
      file_content: fileContent,
      total_employees: settlement.details.length,
      total_contribution: totalContribution,
      period,
    };
  }

  // ==================== PAYSLIPS ====================

  async sendPayslips(companyId: string, id: string, employeeIds?: string[]): Promise<any> {
    const tenantDb = await this.getClient(companyId);

    const settlement = await tenantDb.payrollSettlement.findUnique({
      where: { id },
      include: {
        details: {
          where: { status: { not: 'CANCELLED' } },
        },
      },
    });
    if (!settlement) throw new NotFoundException('Liquidación no encontrada');
    if (!['APPROVED', 'PAID'].includes(settlement.status)) {
      throw new BadRequestException('Solo se pueden enviar desprendibles de liquidaciones aprobadas o pagadas');
    }

    // Filter details by requested employees if provided
    let detailsToSend = settlement.details;
    if (employeeIds && employeeIds.length > 0) {
      const idSet = new Set(employeeIds);
      detailsToSend = detailsToSend.filter((d: any) => idSet.has(d.third_party_id));
    }

    if (detailsToSend.length === 0) {
      throw new BadRequestException('No hay empleados seleccionados');
    }

    // Get employee emails from ThirdParty
    const thirdPartyIds = detailsToSend.map((d: any) => d.third_party_id);
    const thirdParties = await tenantDb.thirdParty.findMany({
      where: { id: { in: thirdPartyIds } },
      select: { id: true, name: true, email: true },
    });
    const emailMap = new Map<string, { name: string; email: string | null }>(
      thirdParties.map((tp: any) => [tp.id, { name: tp.name, email: tp.email }]),
    );

    let sent = 0;
    let failed = 0;
    const results: { employee_name: string; email: string | null; status: 'sent' | 'no_email' | 'error' }[] = [];

    for (const detail of detailsToSend) {
      const empInfo = emailMap.get(detail.third_party_id);
      if (!empInfo?.email) {
        results.push({ employee_name: detail.employee_name, email: null, status: 'no_email' });
        failed++;
        continue;
      }

      // In production, this would send an actual email via notification-service
      // For now, we mark it as sent (the notification service integration can be added later)
      results.push({ employee_name: detail.employee_name, email: empInfo.email, status: 'sent' });
      sent++;
    }

    return {
      total: detailsToSend.length,
      sent,
      failed,
      results,
    };
  }

  // ==================== PRIVATE HELPERS ====================

  private async addEmployeesInternal(
    tenantDb: any,
    settlementId: string,
    employeeIds: string[],
  ): Promise<number> {
    // Get existing details to avoid duplicates
    const existing = await tenantDb.payrollSettlementDetail.findMany({
      where: { payroll_settlement_id: settlementId },
      select: { third_party_id: true },
    });
    const existingIds = new Set(existing.map((e: any) => e.third_party_id));

    // Get employee data
    const employees = await tenantDb.thirdParty.findMany({
      where: {
        id: { in: employeeIds },
        roles: { has: 'EMPLOYEE' },
      },
      include: {
        current_contract: true,
        current_salary: true,
      },
    });

    let added = 0;
    for (const emp of employees) {
      if (existingIds.has(emp.id)) continue;

      const contract = emp.current_contract;
      const salary = emp.current_salary;

      await tenantDb.payrollSettlementDetail.create({
        data: {
          payroll_settlement_id: settlementId,
          third_party_id: emp.id,
          employee_name: `${emp.first_name ?? ''} ${emp.last_name ?? ''}`.trim() || emp.company_name || 'Sin nombre',
          employee_document: emp.identification_number,
          employee_position: contract?.position ?? null,
          employee_base_salary: salary?.salary ?? 0,
          employee_salary_type: salary?.salary_type ?? 'ORDINARIO',
          employee_contract_type: contract?.contract_type_id ?? null,
          employee_worker_type_code: contract?.worker_type_id ?? null,
          employee_worker_subtype_code: contract?.worker_subtype_id ?? null,
          employee_is_administrative: emp.is_administrative ?? false,
          employee_arl_rate: null, // Will be resolved during calculation
          employee_includes_transport: contract?.includes_transport ?? true,
        },
      });
      added++;
    }

    return added;
  }

  /**
   * Re-fetch current salary/contract data from ThirdParty and update the detail snapshot.
   * This ensures recalculations use the latest salary even if it changed after the employee was added.
   * Falls back to the most recent salary from history if current_salary is null (e.g. terminated and rehired).
   */
  private async refreshDetailSalary(tenantDb: any, detail: any): Promise<any> {
    const emp = await tenantDb.thirdParty.findUnique({
      where: { id: detail.third_party_id },
      include: {
        current_contract: true,
        current_salary: true,
      },
    });

    if (!emp) return detail;

    const contract = emp.current_contract;
    let salary = emp.current_salary;

    // If no current salary, try to find the most recent one from history
    if (!salary) {
      salary = await tenantDb.salaryHistory.findFirst({
        where: { third_party_id: detail.third_party_id },
        orderBy: { effective_date: 'desc' },
      });

      // Also fix the ThirdParty reference so this doesn't happen again
      if (salary) {
        await tenantDb.thirdParty.update({
          where: { id: emp.id },
          data: { current_salary_id: salary.id },
        });
        // Reactivate the salary record
        await tenantDb.salaryHistory.update({
          where: { id: salary.id },
          data: { is_current: true, end_date: null },
        });
      }
    }

    return {
      ...detail,
      employee_base_salary: salary?.salary ?? detail.employee_base_salary,
      employee_salary_type: salary?.salary_type ?? detail.employee_salary_type,
      employee_position: contract?.position ?? detail.employee_position,
      employee_contract_type: contract?.contract_type_id ?? detail.employee_contract_type,
      employee_worker_type_code: contract?.worker_type_id ?? detail.employee_worker_type_code,
      employee_worker_subtype_code: contract?.worker_subtype_id ?? detail.employee_worker_subtype_code,
      employee_includes_transport: contract?.includes_transport ?? detail.employee_includes_transport,
    };
  }

  private async loadCalculationConfig(companyId: string, year: number): Promise<{
    config: PayrollConfig;
    concepts: Map<string, PayrollConceptConfig>;
    uvtBrackets: UvtBracket[];
  }> {
    // Load all settings categories
    const [legalParams, socialSecurity, workSchedule] = await Promise.all([
      this.companySettings.getCategory(companyId, 'legal_params'),
      this.companySettings.getCategory(companyId, 'social_security'),
      this.companySettings.getCategory(companyId, 'work_schedule'),
    ]);

    const config = ConfigLoader.buildPayrollConfig({
      legal_params: legalParams,
      social_security: socialSecurity,
      work_schedule: workSchedule,
    }, year);

    // Load payroll concepts
    const conceptsResult = await this.payrollConcepts.findAll(companyId);
    const concepts = ConfigLoader.buildConceptsMap(conceptsResult.data);

    // Load UVT brackets
    const uvtResult = await this.payrollUvt.findByYear(companyId, year);
    const uvtBrackets = ConfigLoader.buildUvtBrackets(uvtResult.data);

    return { config, concepts, uvtBrackets };
  }

  private async calculateSingleEmployee(
    tenantDb: any,
    detail: any,
    settlement: any,
    config: PayrollConfig,
    concepts: Map<string, PayrollConceptConfig>,
    uvtBrackets: UvtBracket[],
  ): Promise<any> {
    // Build employee input from detail snapshot
    const baseSalary = Number(detail.employee_base_salary);
    if (!baseSalary || baseSalary <= 0) {
      throw new Error(
        `Empleado ${detail.employee_name} no tiene salario configurado. ` +
        `Verifique que el empleado tenga un salario vigente asignado.`,
      );
    }

    const employee: EmployeeInput = {
      thirdPartyId: detail.third_party_id,
      name: detail.employee_name,
      document: detail.employee_document,
      position: detail.employee_position,
      baseSalary,
      salaryType: detail.employee_salary_type as 'ORDINARIO' | 'INTEGRAL',
      contractType: detail.employee_contract_type,
      workerTypeCode: detail.employee_worker_type_code,
      workerSubtypeCode: detail.employee_worker_subtype_code,
      workerSubtypeId: detail.employee_worker_subtype_code, // Used for subtype rule lookup
      isAdministrative: detail.employee_is_administrative,
      arlRate: detail.employee_arl_rate ? Number(detail.employee_arl_rate) : null,
      includesTransport: detail.employee_includes_transport,
      contractStartDate: new Date(settlement.start_date),
      contractEndDate: null,
    };

    // Load subtype rule if applicable
    let subtypeRule = null;
    if (employee.workerSubtypeId) {
      subtypeRule = await tenantDb.workerSubtypeRule.findUnique({
        where: { sub_type_worker_id: employee.workerSubtypeId },
      }).catch(() => null);
    }

    // Load overtime records for the period
    const overtimeRecords = await tenantDb.overtimeRecord.findMany({
      where: {
        third_party_id: detail.third_party_id,
        date: {
          gte: settlement.start_date,
          lte: settlement.end_date,
        },
        status: 'APPROVED',
      },
    }).catch(() => []);

    // Aggregate overtime entries by type
    const overtimeMap = new Map<string, number>();
    for (const rec of overtimeRecords) {
      const type = rec.overtime_type;
      const hours = Number(rec.hours ?? 0);
      overtimeMap.set(type, (overtimeMap.get(type) ?? 0) + hours);
    }
    const overtimeEntries: OvertimeEntry[] = [];
    for (const [type, hours] of overtimeMap) {
      overtimeEntries.push({ type: type as any, hours });
    }

    // Build period (use detail.days_worked as override if set by user)
    const period: SettlementPeriod = {
      startDate: new Date(settlement.start_date),
      endDate: new Date(settlement.end_date),
      year: settlement.year,
      month: settlement.month,
      periodNumber: settlement.period_number,
      isLastOfMonth: settlement.is_last_of_month,
      settlementType: settlement.settlement_type,
      daysWorked: detail.days_worked > 0 ? detail.days_worked : undefined,
    };

    // ── Fetch accumulated/contextual data in parallel ──
    const [
      monthlyAccumulated,
      vacationEntries,
      liquidationFlags,
      additionalIncome,
      lastPaidCesantiasDate,
      vacationDays,
    ] = await Promise.all([
      this.getMonthlyAccumulated(tenantDb, detail.third_party_id, settlement.year, settlement.month, settlement.id),
      this.getVacationsForPeriod(tenantDb, detail.third_party_id, period.startDate, period.endDate, baseSalary, employee.salaryType),
      this.getLiquidationFlags(tenantDb, settlement.year, settlement.month),
      this.parseAdditionalIncome(detail),
      this.getLastPaidCesantiasDate(tenantDb, detail.third_party_id, period.startDate),
      this.getApprovedVacationDays(tenantDb, detail.third_party_id, settlement),
    ]);

    return SettlementDispatcher.calculate(
      employee,
      period,
      config,
      overtimeEntries,
      uvtBrackets,
      concepts,
      subtypeRule,
      {
        terminationReason: (settlement.termination_reason as TerminationReason) ?? undefined,
        vacationDays: vacationDays ?? undefined,
        lastPaidCesantiasDate,
      },
      monthlyAccumulated,
      vacationEntries,
      additionalIncome,
      liquidationFlags,
    );
  }

  // ==================== MONTHLY ACCUMULATION QUERIES ====================

  /**
   * Get accumulated payroll values from previous REGULAR settlements in the same calendar month.
   * Used by DeductionCalculator (FSP, withholding) and EmployerCalculator (health, ICBF, SENA).
   */
  private async getMonthlyAccumulated(
    tenantDb: any,
    thirdPartyId: string,
    year: number,
    month: number,
    currentSettlementId: string,
  ): Promise<MonthlyAccumulated> {
    try {
      // Find all REGULAR settlement details for this employee in the same month
      // excluding the current settlement, with status CALCULATED/APPROVED/PAID
      const details = await tenantDb.payrollSettlementDetail.findMany({
        where: {
          third_party_id: thirdPartyId,
          status: { in: ['CALCULATED', 'APPROVED', 'PAID'] },
          payroll_settlement: {
            id: { not: currentSettlementId },
            settlement_type: 'REGULAR',
            year,
            month,
            status: { in: ['CALCULATED', 'APPROVED', 'PAID'] },
          },
        },
        select: { payroll_data: true, total_accrued: true },
      });

      if (!details || details.length === 0) return EMPTY_MONTHLY_ACCUMULATED;

      let totalAccrued = 0;
      let totalEps = 0;
      let totalPension = 0;
      let totalFsp = 0;
      let totalWithholding = 0;
      let totalIbc = 0;

      for (const d of details) {
        totalAccrued += Number(d.total_accrued ?? 0);
        const pd = d.payroll_data as any;
        if (pd) {
          totalEps += Number(pd.deductions?.eps_deduction ?? 0);
          totalPension += Number(pd.deductions?.pension_deduction ?? 0);
          totalFsp += Number(pd.deductions?.fondosp_deduction_SP ?? 0);
          totalWithholding += Number(pd.deductions?.withholding_at_source ?? 0);
          totalIbc += Number(pd.metadata?.ibc ?? 0);
        }
      }

      return { totalAccrued, totalEps, totalPension, totalFsp, totalWithholding, totalIbc };
    } catch {
      return EMPTY_MONTHLY_ACCUMULATED;
    }
  }

  /**
   * Get approved vacation and vacation-monetized leave requests that overlap the payroll period.
   * These are included as part of accrued earnings in regular payroll.
   */
  private async getVacationsForPeriod(
    tenantDb: any,
    thirdPartyId: string,
    periodStart: Date,
    periodEnd: Date,
    baseSalary: number,
    salaryType: 'ORDINARIO' | 'INTEGRAL',
  ): Promise<VacationEntry[]> {
    try {
      const leaves = await tenantDb.leaveRequest.findMany({
        where: {
          third_party_id: thirdPartyId,
          leave_type: { in: ['VACATION', 'VACATION_MONETIZED'] },
          status: 'APPROVED',
          // Overlap: leave starts before period ends AND leave ends after period starts
          start_date: { lte: periodEnd },
          end_date: { gte: periodStart },
        },
        select: {
          leave_type: true,
          start_date: true,
          end_date: true,
          days: true,
        },
      });

      if (!leaves || leaves.length === 0) return [];

      const dailyRate = salaryType === 'INTEGRAL'
        ? BaseCalculator.dailyRate(BaseCalculator.integralBase(baseSalary))
        : BaseCalculator.dailyRate(baseSalary);

      return leaves.map((leave: any) => {
        const leaveStart = new Date(leave.start_date);
        const leaveEnd = new Date(leave.end_date);
        // Calculate days that overlap with the payroll period
        const days = BaseCalculator.commercialDaysInPeriod(
          leaveStart, leaveEnd, periodStart, periodEnd,
        );
        const amount = BaseCalculator.round(dailyRate * days);

        return {
          leaveType: leave.leave_type as 'VACATION' | 'VACATION_MONETIZED',
          startDate: leaveStart,
          endDate: leaveEnd,
          days,
          dailyRate,
          amount,
        };
      });
    } catch {
      // Table may not exist yet; return empty
      return [];
    }
  }

  /**
   * Get flags indicating which benefit settlements exist in the current period.
   * Used by ProvisionCalculator to skip provisions for already-liquidated benefits.
   */
  private async getLiquidationFlags(
    tenantDb: any,
    year: number,
    month: number,
  ): Promise<LiquidationFlags> {
    try {
      // Prima: check if there's a PRIMA settlement this semester (APPROVED or PAID)
      const semesterStartMonth = month <= 6 ? 1 : 7;
      const semesterEndMonth = month <= 6 ? 6 : 12;

      const [primaCount, cesantiasCount, vacacionesCount] = await Promise.all([
        tenantDb.payrollSettlement.count({
          where: {
            settlement_type: 'PRIMA',
            year,
            month: { gte: semesterStartMonth, lte: semesterEndMonth },
            status: { in: ['APPROVED', 'PAID'] },
          },
        }),
        tenantDb.payrollSettlement.count({
          where: {
            settlement_type: 'CESANTIAS',
            year,
            status: { in: ['APPROVED', 'PAID'] },
          },
        }),
        tenantDb.payrollSettlement.count({
          where: {
            settlement_type: 'VACACIONES',
            year,
            month,
            status: { in: ['APPROVED', 'PAID'] },
          },
        }),
      ]);

      return {
        hasPrimaThisSemester: primaCount > 0,
        hasCesantiasThisYear: cesantiasCount > 0,
        hasVacacionesThisMonth: vacacionesCount > 0,
      };
    } catch {
      return EMPTY_LIQUIDATION_FLAGS;
    }
  }

  /**
   * Parse additional income (bonuses, aids, other income, commissions) from input_data JSON.
   */
  private async parseAdditionalIncome(detail: any): Promise<AdditionalIncome> {
    try {
      const inputData = detail.input_data;
      if (!inputData || typeof inputData !== 'object') return EMPTY_ADDITIONAL_INCOME;

      return {
        bonuses: Number(inputData.bonuses ?? 0),
        aids: Number(inputData.aids ?? 0),
        otherIncome: Number(inputData.other_income ?? inputData.otherIncome ?? 0),
        commissions: Number(inputData.commissions ?? 0),
      };
    } catch {
      return EMPTY_ADDITIONAL_INCOME;
    }
  }

  /**
   * Find the end date of the last paid cesantías settlement for an employee.
   * Used by CesantiasCalculator to avoid double-counting accrued days.
   */
  private async getLastPaidCesantiasDate(
    tenantDb: any,
    thirdPartyId: string,
    beforeDate: Date,
  ): Promise<Date | null> {
    try {
      const lastCesantias = await tenantDb.payrollSettlementDetail.findFirst({
        where: {
          third_party_id: thirdPartyId,
          status: { in: ['APPROVED', 'PAID'] },
          payroll_settlement: {
            settlement_type: 'CESANTIAS',
            status: { in: ['APPROVED', 'PAID'] },
            end_date: { lt: beforeDate },
          },
        },
        orderBy: {
          payroll_settlement: { end_date: 'desc' },
        },
        select: {
          payroll_settlement: { select: { end_date: true } },
        },
      });

      if (lastCesantias?.payroll_settlement?.end_date) {
        return new Date(lastCesantias.payroll_settlement.end_date);
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Reads approved vacation leave records for the employee in the settlement's year.
   * Returns total approved vacation days, or null if no records exist (dispatcher uses 15-day fallback).
   */
  private async getApprovedVacationDays(
    tenantDb: any,
    thirdPartyId: string,
    settlement: any,
  ): Promise<number | null> {
    if (settlement.settlement_type !== 'VACACIONES') return null;

    try {
      const leaves = await tenantDb.leaveRequest.findMany({
        where: {
          third_party_id: thirdPartyId,
          leave_type: 'VACATION',
          status: 'APPROVED',
          start_date: { gte: new Date(settlement.year, 0, 1) },
          end_date: { lte: new Date(settlement.year, 11, 31) },
        },
        select: { days: true },
      });

      if (!leaves || leaves.length === 0) return null;

      const total = leaves.reduce((sum: number, l: any) => sum + Number(l.days ?? 0), 0);
      return total > 0 ? total : null;
    } catch {
      // Table may not exist yet (leaves module not migrated); fallback to null → 15 days
      return null;
    }
  }

  private async recalculateSettlementTotals(tenantDb: any, settlementId: string): Promise<void> {
    const details = await tenantDb.payrollSettlementDetail.findMany({
      where: { payroll_settlement_id: settlementId },
    });

    let totalAccrued = 0;
    let totalDeductions = 0;
    let totalNetSalary = 0;
    let totalEmployerContributions = 0;
    let totalProvisions = 0;
    let totalPayrollCost = 0;

    for (const d of details) {
      totalAccrued += Number(d.total_accrued ?? 0);
      totalDeductions += Number(d.total_deductions ?? 0);
      totalNetSalary += Number(d.net_salary ?? 0);
      totalEmployerContributions += Number(d.total_employer_contributions ?? 0);
      totalProvisions += Number(d.total_provisions ?? 0);
      totalPayrollCost += Number(d.total_cost ?? 0);
    }

    await tenantDb.payrollSettlement.update({
      where: { id: settlementId },
      data: {
        total_accrued: totalAccrued,
        total_deductions: totalDeductions,
        total_net_salary: totalNetSalary,
        total_employer_contributions: totalEmployerContributions,
        total_provisions: totalProvisions,
        total_payroll_cost: totalPayrollCost,
      },
    });
  }

  /**
   * Sends a notification to the notification service after payroll calculation.
   */
  private async sendCalculationNotification(
    companyId: string,
    settlementName: string,
    settlementId: string,
    calculatedCount: number,
    errorCount: number,
    totalNetSalary: number,
  ): Promise<void> {
    const hasErrors = errorCount > 0;
    const type = hasErrors ? 'payroll_calculated_with_errors' : 'payroll_calculated';
    const totalFormatted = new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(totalNetSalary);

    const title = hasErrors
      ? `Nomina calculada con ${errorCount} error(es)`
      : 'Nomina calculada exitosamente';

    const message = hasErrors
      ? `"${settlementName}": ${calculatedCount} empleados calculados, ${errorCount} con errores. Neto total: ${totalFormatted}`
      : `"${settlementName}": ${calculatedCount} empleados calculados. Neto a pagar: ${totalFormatted}`;

    await this.sendNotification(companyId, {
      type,
      title,
      message,
      action_url: `/dashboard/payroll/settlements/${settlementId}`,
    });
  }

  /**
   * Generic notification helper — POSTs to notification service.
   */
  private async sendNotification(
    companyId: string,
    notification: { type: string; title: string; message: string; action_url?: string },
  ): Promise<void> {
    const payload = { company_id: companyId, ...notification };

    const response = await fetch(
      `${this.notificationServiceUrl}/api/notifications`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(5000),
      },
    );

    if (!response.ok) {
      throw new Error(`Notification service responded with ${response.status}`);
    }
  }
}
