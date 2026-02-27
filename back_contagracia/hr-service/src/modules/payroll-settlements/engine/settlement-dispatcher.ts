/**
 * Settlement Dispatcher — Unified entry point for all settlement types.
 *
 * Routes each settlement type to the correct calculator:
 *   REGULAR      → PayrollEngine (full deductions + employer + provisions)
 *   PRIMA        → PrimaCalculator (semester service bonus)
 *   CESANTIAS    → CesantiasCalculator (severance + interest)
 *   VACACIONES   → VacacionesCalculator (vacation payment)
 *   TERMINACION  → TerminacionCalculator (all proportional benefits + indemnification)
 *
 * All settlement-type-specific details (terminationReason, vacationDays)
 * are passed via SettlementOptions, keeping the calculators pure.
 */

import { PayrollEngine } from './payroll-engine';
import { PrimaCalculator } from './settlement-calculators/prima.calculator';
import { CesantiasCalculator } from './settlement-calculators/cesantias.calculator';
import { VacacionesCalculator } from './settlement-calculators/vacaciones.calculator';
import { TerminacionCalculator } from './settlement-calculators/terminacion.calculator';
import { BaseCalculator } from './base-calculator';

import type {
  AdditionalIncome,
  EmployeeInput,
  EmployeePayrollResult,
  LiquidationFlags,
  MonthlyAccumulated,
  OvertimeEntry,
  PayrollConceptConfig,
  PayrollConfig,
  SettlementOptions,
  SettlementPeriod,
  UvtBracket,
  VacationEntry,
} from './types';
import {
  EMPTY_ADDITIONAL_INCOME,
  EMPTY_LIQUIDATION_FLAGS,
  EMPTY_MONTHLY_ACCUMULATED,
} from './types';

/** Empty payroll data shell used for non-regular settlement types */
function emptyPayrollData(
  employee: EmployeeInput,
  config: PayrollConfig,
): EmployeePayrollResult['payrollData'] {
  return {
    accrued: {
      worked_days: 0,
      salary: 0,
      transportation_allowance: 0,
      HEDs: [],
      HENs: [],
      HEDDFs: [],
      HENDFs: [],
      HRNs: [],
      HRDDFs: [],
      HRNDFs: [],
      vacation_entries: [],
      bonuses: 0,
      aids: 0,
      other_income: 0,
      commissions: 0,
      other_concepts: [],
      accrued_total: 0,
    },
    deductions: {
      eps_deduction: 0,
      pension_deduction: 0,
      fondosp_deduction_SP: 0,
      withholding_at_source: 0,
      other_deductions: [],
      deductions_total: 0,
    },
    employer_contributions: {
      employer_health: 0,
      employer_pension: 0,
      arl: 0,
      ccf: 0,
      icbf: 0,
      sena: 0,
      total_employer_contributions: 0,
    },
    provisions: {
      vacation_provision: 0,
      severance_provision: 0,
      severance_interest_provision: 0,
      service_bonus_provision: 0,
      total_provisions: 0,
    },
    metadata: {
      ibc: 0,
      salary_type: employee.salaryType,
      smlv: config.smlv,
      uvt_value: config.uvtValue,
      transportation_limit: config.smlv * 2,
      exoneration_applied: false,
    },
  };
}

/** Base skeleton for non-regular results */
function baseResult(employee: EmployeeInput): Omit<
  EmployeePayrollResult,
  'daysWorked' | 'ibc' | 'accrued' | 'deductions' | 'employerContributions' | 'provisions' |
  'totalAccrued' | 'totalDeductions' | 'netSalary' | 'totalEmployerContributions' | 'totalProvisions' | 'totalCost' | 'payrollData'
> {
  return {
    thirdPartyId: employee.thirdPartyId,
    employeeName: employee.name,
    employeeDocument: employee.document,
    employeePosition: employee.position,
    employeeBaseSalary: employee.baseSalary,
    employeeSalaryType: employee.salaryType,
    employeeContractType: employee.contractType,
    employeeWorkerTypeCode: employee.workerTypeCode,
    employeeWorkerSubtypeCode: employee.workerSubtypeCode,
    employeeIsAdministrative: employee.isAdministrative,
    employeeArlRate: employee.arlRate,
    employeeIncludesTransport: employee.includesTransport,
  };
}

/** Empty accrued result for non-regular settlements */
function emptyAccrued(days: number, total: number, salary = 0) {
  return {
    workedDays: days,
    salary,
    transportationAllowance: 0,
    overtime: [],
    overtimeTotal: 0,
    vacationEntries: [] as VacationEntry[],
    vacationTotal: 0,
    additionalIncome: EMPTY_ADDITIONAL_INCOME,
    additionalIncomeTotal: 0,
    accruedTotal: total,
  };
}

const ZERO_DEDUCTIONS = { epsDeduction: 0, pensionDeduction: 0, fspDeduction: 0, withholdingAtSource: 0, deductionsTotal: 0 };
const ZERO_EMPLOYER = { employerHealth: 0, employerPension: 0, arl: 0, ccf: 0, icbf: 0, sena: 0, totalEmployerContributions: 0 };
const ZERO_PROVISIONS = { vacationProvision: 0, severanceProvision: 0, severanceInterestProvision: 0, serviceBonusProvision: 0, totalProvisions: 0 };

export class SettlementDispatcher {
  /**
   * Calculate payroll result for any settlement type.
   * Dispatches to the appropriate calculator based on period.settlementType.
   */
  static calculate(
    employee: EmployeeInput,
    period: SettlementPeriod,
    config: PayrollConfig,
    overtimeEntries: OvertimeEntry[],
    uvtBrackets: UvtBracket[],
    concepts: Map<string, PayrollConceptConfig>,
    subtypeRule: any | null,
    options: SettlementOptions = {},
    monthlyAccumulated: MonthlyAccumulated = EMPTY_MONTHLY_ACCUMULATED,
    vacationEntries: VacationEntry[] = [],
    additionalIncome: AdditionalIncome = EMPTY_ADDITIONAL_INCOME,
    liquidationFlags: LiquidationFlags = EMPTY_LIQUIDATION_FLAGS,
  ): EmployeePayrollResult {
    switch (period.settlementType) {
      case 'REGULAR':
        return PayrollEngine.calculateEmployee(
          employee, period, config, overtimeEntries, uvtBrackets, concepts, subtypeRule,
          monthlyAccumulated, vacationEntries, additionalIncome, liquidationFlags,
        );

      case 'PRIMA':
        return SettlementDispatcher.calcPrima(employee, period, config);

      case 'CESANTIAS':
        return SettlementDispatcher.calcCesantias(employee, period, config, options);

      case 'VACACIONES':
        return SettlementDispatcher.calcVacaciones(employee, options.vacationDays ?? 15);

      case 'TERMINACION':
        return SettlementDispatcher.calcTerminacion(employee, period, config, options);

      default:
        throw new Error(`Tipo de liquidación no soportado: ${(period as any).settlementType}`);
    }
  }

  // ─── Private calculators ───────────────────────────────────────────────────

  private static calcPrima(
    employee: EmployeeInput,
    period: SettlementPeriod,
    config: PayrollConfig,
  ): EmployeePayrollResult {
    const semesterMonth = period.month <= 6 ? 0 : 6;
    const semesterStart = new Date(period.year, semesterMonth, 1);
    const semesterEnd = period.endDate;

    const days = PrimaCalculator.daysInSemester(
      employee.contractStartDate, employee.contractEndDate, semesterStart, semesterEnd,
    );
    const prima = PrimaCalculator.calculate(employee, config, days);
    const payrollData = emptyPayrollData(employee, config);

    payrollData.accrued.worked_days = days;
    payrollData.accrued.other_concepts = [{
      concept_code: 'service_bonus',
      concept_name: 'Prima de Servicios',
      amount: prima.primaAmount,
    }];
    payrollData.accrued.accrued_total = prima.primaAmount;

    return {
      ...baseResult(employee),
      daysWorked: days,
      ibc: 0,
      accrued: emptyAccrued(days, prima.primaAmount),
      deductions: ZERO_DEDUCTIONS,
      employerContributions: ZERO_EMPLOYER,
      provisions: ZERO_PROVISIONS,
      totalAccrued: prima.primaAmount,
      totalDeductions: 0,
      netSalary: prima.primaAmount,
      totalEmployerContributions: 0,
      totalProvisions: 0,
      totalCost: prima.primaAmount,
      payrollData,
    };
  }

  private static calcCesantias(
    employee: EmployeeInput,
    period: SettlementPeriod,
    config: PayrollConfig,
    options: SettlementOptions,
  ): EmployeePayrollResult {
    const yearStart = new Date(period.year, 0, 1);
    const days = CesantiasCalculator.daysInYear(
      employee.contractStartDate, employee.contractEndDate, yearStart, period.endDate,
      options.lastPaidCesantiasDate,
    );
    const cesantias = CesantiasCalculator.calculate(employee, config, days);
    const payrollData = emptyPayrollData(employee, config);

    payrollData.accrued.worked_days = days;
    payrollData.accrued.other_concepts = [
      { concept_code: 'severance', concept_name: 'Cesantías', amount: cesantias.cesantiasAmount },
      { concept_code: 'severance_interest', concept_name: 'Intereses sobre Cesantías', amount: cesantias.interestAmount },
    ];
    payrollData.accrued.accrued_total = cesantias.total;

    return {
      ...baseResult(employee),
      daysWorked: days,
      ibc: 0,
      accrued: emptyAccrued(days, cesantias.total),
      deductions: ZERO_DEDUCTIONS,
      employerContributions: ZERO_EMPLOYER,
      provisions: ZERO_PROVISIONS,
      totalAccrued: cesantias.total,
      totalDeductions: 0,
      netSalary: cesantias.total,
      totalEmployerContributions: 0,
      totalProvisions: 0,
      totalCost: cesantias.total,
      payrollData,
    };
  }

  private static calcVacaciones(
    employee: EmployeeInput,
    vacationDays: number,
  ): EmployeePayrollResult {
    const vacaciones = VacacionesCalculator.calculate(employee, vacationDays);
    const payrollData: any = {
      accrued: {
        worked_days: vacationDays,
        salary: 0,
        transportation_allowance: 0,
        HEDs: [], HENs: [], HEDDFs: [], HENDFs: [], HRNs: [], HRDDFs: [], HRNDFs: [],
        vacation_entries: [],
        bonuses: 0, aids: 0, other_income: 0, commissions: 0,
        other_concepts: [{ concept_code: 'vacation', concept_name: 'Vacaciones', amount: vacaciones.vacationAmount }],
        accrued_total: vacaciones.vacationAmount,
      },
      deductions: { eps_deduction: 0, pension_deduction: 0, fondosp_deduction_SP: 0, withholding_at_source: 0, other_deductions: [], deductions_total: 0 },
      employer_contributions: { employer_health: 0, employer_pension: 0, arl: 0, ccf: 0, icbf: 0, sena: 0, total_employer_contributions: 0 },
      provisions: { vacation_provision: 0, severance_provision: 0, severance_interest_provision: 0, service_bonus_provision: 0, total_provisions: 0 },
      metadata: { ibc: 0, salary_type: employee.salaryType, smlv: 0, uvt_value: 0, transportation_limit: 0, exoneration_applied: false },
    };

    return {
      ...baseResult(employee),
      daysWorked: vacationDays,
      ibc: 0,
      accrued: emptyAccrued(vacationDays, vacaciones.vacationAmount),
      deductions: ZERO_DEDUCTIONS,
      employerContributions: ZERO_EMPLOYER,
      provisions: ZERO_PROVISIONS,
      totalAccrued: vacaciones.vacationAmount,
      totalDeductions: 0,
      netSalary: vacaciones.vacationAmount,
      totalEmployerContributions: 0,
      totalProvisions: 0,
      totalCost: vacaciones.vacationAmount,
      payrollData,
    };
  }

  private static calcTerminacion(
    employee: EmployeeInput,
    period: SettlementPeriod,
    config: PayrollConfig,
    options: SettlementOptions,
  ): EmployeePayrollResult {
    const terminationDate = period.endDate;
    const reason = options.terminationReason ?? 'SIN_JUSTA_CAUSA';
    const terminacion = TerminacionCalculator.calculate(employee, config, terminationDate, reason);

    const otherConcepts = [
      { concept_code: 'proportional_salary', concept_name: 'Salario Proporcional', amount: terminacion.proportionalSalary },
      { concept_code: 'service_bonus', concept_name: 'Prima Proporcional', amount: terminacion.prima.primaAmount },
      { concept_code: 'severance', concept_name: 'Cesantías Proporcionales', amount: terminacion.cesantias.cesantiasAmount },
      { concept_code: 'severance_interest', concept_name: 'Intereses Cesantías', amount: terminacion.cesantias.interestAmount },
      { concept_code: 'vacation', concept_name: 'Vacaciones Proporcionales', amount: terminacion.vacaciones.vacationAmount },
      ...(terminacion.indemnification > 0
        ? [{ concept_code: 'indemnification', concept_name: 'Indemnización', amount: terminacion.indemnification }]
        : []),
    ];

    const payrollData = emptyPayrollData(employee, config);
    payrollData.accrued.salary = terminacion.proportionalSalary;
    payrollData.accrued.other_concepts = otherConcepts;
    payrollData.accrued.accrued_total = terminacion.total;

    return {
      ...baseResult(employee),
      daysWorked: 0,
      ibc: 0,
      accrued: emptyAccrued(0, terminacion.total, terminacion.proportionalSalary),
      deductions: ZERO_DEDUCTIONS,
      employerContributions: ZERO_EMPLOYER,
      provisions: ZERO_PROVISIONS,
      totalAccrued: terminacion.total,
      totalDeductions: 0,
      netSalary: terminacion.total,
      totalEmployerContributions: 0,
      totalProvisions: 0,
      totalCost: terminacion.total,
      payrollData,
    };
  }
}
