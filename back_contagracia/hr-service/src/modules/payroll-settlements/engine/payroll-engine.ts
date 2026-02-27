/**
 * Payroll Engine — Orchestrates the full payroll calculation for a single employee.
 * Pure calculation logic, no DB access.
 */

import { BaseCalculator } from './base-calculator';
import { AccruedCalculator } from './accrued-calculator';
import { DeductionCalculator } from './deduction-calculator';
import { EmployerCalculator } from './employer-calculator';
import { ProvisionCalculator } from './provision-calculator';
import { SubtypeResolver } from './subtype-resolver';
import { ConfigLoader } from './config-loader';
import type {
  AdditionalIncome,
  EmployeeInput,
  EmployeePayrollResult,
  LiquidationFlags,
  MonthlyAccumulated,
  OvertimeEntry,
  PayrollConceptConfig,
  PayrollConfig,
  PayrollDataJson,
  SettlementPeriod,
  SubtypeOverrides,
  UvtBracket,
  VacationEntry,
} from './types';
import {
  EMPTY_ADDITIONAL_INCOME,
  EMPTY_LIQUIDATION_FLAGS,
  EMPTY_MONTHLY_ACCUMULATED,
} from './types';

export class PayrollEngine {
  /**
   * Calculate the full payroll for a single employee in a regular period.
   *
   * @param monthlyAccumulated  Accumulated values from previous payrolls in the same month
   * @param vacationEntries     Approved vacation/vacation-monetized leaves overlapping the period
   * @param additionalIncome    Bonuses, aids, other income from input_data JSON
   * @param liquidationFlags    Flags indicating which benefits have already been liquidated
   */
  static calculateEmployee(
    employee: EmployeeInput,
    period: SettlementPeriod,
    config: PayrollConfig,
    overtimeEntries: OvertimeEntry[],
    uvtBrackets: UvtBracket[],
    concepts: Map<string, PayrollConceptConfig>,
    subtypeRule: any | null,
    monthlyAccumulated: MonthlyAccumulated = EMPTY_MONTHLY_ACCUMULATED,
    vacationEntries: VacationEntry[] = [],
    additionalIncome: AdditionalIncome = EMPTY_ADDITIONAL_INCOME,
    liquidationFlags: LiquidationFlags = EMPTY_LIQUIDATION_FLAGS,
  ): EmployeePayrollResult {
    // Use real days from the detail if provided, otherwise fallback to 15/30 convention
    const defaultDays = period.isLastOfMonth ? 30 : 15;
    const daysWorked = (period.daysWorked && period.daysWorked > 0)
      ? period.daysWorked
      : defaultDays;

    // 1. Resolve subtype overrides (considers both SubTypeWorker rule and TypeWorker)
    const overrides = SubtypeResolver.resolveWithWorkerType(subtypeRule, employee.workerTypeCode);

    // 2. Calculate accrued earnings (with vacations and additional income)
    const accrued = AccruedCalculator.calculate(
      employee,
      daysWorked,
      overtimeEntries,
      config,
      concepts,
      vacationEntries,
      additionalIncome,
    );

    // 3. Calculate IBC (respects ibcMinSmmlvPercentage for special worker types)
    const ibc = BaseCalculator.calculateIBC(
      employee.baseSalary,
      accrued.overtimeTotal,
      employee.salaryType,
      config.smlv,
      daysWorked,
      overrides.ibcMinSmmlvPercentage,
    );

    // 4. Calculate deductions (with monthly accumulated for FSP and withholding)
    const deductions = DeductionCalculator.calculate(
      ibc,
      accrued.accruedTotal,
      config,
      concepts,
      overrides,
      uvtBrackets,
      period.isLastOfMonth,
      employee.salaryType,
      monthlyAccumulated,
    );

    // 5. Calculate employer contributions (health/ICBF/SENA only on last payroll)
    const employerContributions = EmployerCalculator.calculate(
      ibc,
      employee.baseSalary,
      config,
      concepts,
      overrides,
      employee.arlRate,
      period.isLastOfMonth,
      monthlyAccumulated,
    );

    // 6. Calculate provisions (only on last payroll, respects liquidation flags)
    const transportForProvisions =
      employee.includesTransport &&
      employee.salaryType === 'ORDINARIO' &&
      BaseCalculator.qualifiesForTransport(employee.baseSalary, config.smlv)
        ? config.transportationAllowance
        : 0;

    const provisions = ProvisionCalculator.calculate(
      employee.baseSalary,
      transportForProvisions,
      daysWorked,
      concepts,
      period.isLastOfMonth,
      liquidationFlags,
    );

    // 7. Net salary and total cost
    const netSalary = BaseCalculator.round(accrued.accruedTotal - deductions.deductionsTotal);
    const totalCost = BaseCalculator.round(
      accrued.accruedTotal +
      employerContributions.totalEmployerContributions +
      provisions.totalProvisions,
    );

    // 8. Build payroll_data JSON
    const payrollData = PayrollEngine.buildPayrollData(
      accrued,
      deductions,
      employerContributions,
      provisions,
      ibc,
      employee,
      config,
      overrides,
      concepts,
    );

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

      daysWorked,
      ibc,

      accrued,
      deductions,
      employerContributions,
      provisions,

      totalAccrued: accrued.accruedTotal,
      totalDeductions: deductions.deductionsTotal,
      netSalary,
      totalEmployerContributions: employerContributions.totalEmployerContributions,
      totalProvisions: provisions.totalProvisions,
      totalCost,

      payrollData,
    };
  }

  /**
   * Build the payroll_data JSON structure for storage.
   */
  private static buildPayrollData(
    accrued: any,
    deductions: any,
    employer: any,
    provisions: any,
    ibc: number,
    employee: EmployeeInput,
    config: PayrollConfig,
    overrides: SubtypeOverrides,
    concepts: Map<string, PayrollConceptConfig>,
  ): PayrollDataJson {
    // Group overtime by type
    const overtimeByType: Record<string, any[]> = {
      HEDs: [], HENs: [], HEDDFs: [], HENDFs: [],
      HRNs: [], HRDDFs: [], HRNDFs: [],
    };

    for (const ot of accrued.overtime) {
      const key = `${ot.type}s`;
      if (overtimeByType[key]) {
        overtimeByType[key].push({
          type: ot.type,
          quantity: ot.quantity,
          rate: ot.rate,
          payment: ot.payment,
        });
      }
    }

    const exonerationApplies =
      config.exonerationEnabled &&
      employee.baseSalary < config.smlv * config.exonerationThresholdSmmlv;

    // Build vacation entries for JSON
    const vacationEntriesJson = (accrued.vacationEntries ?? []).map((v: any) => ({
      leave_type: v.leaveType,
      days: v.days,
      amount: v.amount,
    }));

    // Additional income
    const ai = accrued.additionalIncome ?? EMPTY_ADDITIONAL_INCOME;

    return {
      accrued: {
        worked_days: accrued.workedDays,
        salary: accrued.salary,
        transportation_allowance: accrued.transportationAllowance,
        HEDs: overtimeByType.HEDs,
        HENs: overtimeByType.HENs,
        HEDDFs: overtimeByType.HEDDFs,
        HENDFs: overtimeByType.HENDFs,
        HRNs: overtimeByType.HRNs,
        HRDDFs: overtimeByType.HRDDFs,
        HRNDFs: overtimeByType.HRNDFs,
        vacation_entries: vacationEntriesJson,
        bonuses: ai.bonuses,
        aids: ai.aids,
        other_income: ai.otherIncome,
        commissions: ai.commissions,
        other_concepts: [],
        accrued_total: accrued.accruedTotal,
      },
      deductions: {
        eps_deduction: deductions.epsDeduction,
        pension_deduction: deductions.pensionDeduction,
        fondosp_deduction_SP: deductions.fspDeduction,
        withholding_at_source: deductions.withholdingAtSource,
        other_deductions: [],
        deductions_total: deductions.deductionsTotal,
      },
      employer_contributions: {
        employer_health: employer.employerHealth,
        employer_pension: employer.employerPension,
        arl: employer.arl,
        ccf: employer.ccf,
        icbf: employer.icbf,
        sena: employer.sena,
        total_employer_contributions: employer.totalEmployerContributions,
      },
      provisions: {
        vacation_provision: provisions.vacationProvision,
        severance_provision: provisions.severanceProvision,
        severance_interest_provision: provisions.severanceInterestProvision,
        service_bonus_provision: provisions.serviceBonusProvision,
        total_provisions: provisions.totalProvisions,
      },
      metadata: {
        ibc,
        salary_type: employee.salaryType,
        smlv: config.smlv,
        uvt_value: config.uvtValue,
        transportation_limit: config.smlv * 2,
        exoneration_applied: exonerationApplies,
        // Deduction rates (employee)
        eps_rate: overrides.healthEmployeePays
          ? (overrides.healthEmployeeRate ?? ConfigLoader.getRate(concepts, 'eps_deduction', 4.0))
          : 0,
        pension_rate: overrides.pensionEmployeePays
          ? (overrides.pensionEmployeeRate ?? ConfigLoader.getRate(concepts, 'pension_deduction', 4.0))
          : 0,
        fsp_rate: overrides.fspApplies
          ? (overrides.fspSpecialRate ?? DeductionCalculator.getProgressiveFspRate(ibc, config.smlv))
          : 0,
        // Employer contribution rates
        employer_health_rate: overrides.healthEmployerRate
          ?? ConfigLoader.getRate(concepts, 'employer_health', 8.5),
        employer_pension_rate: overrides.pensionEmployerRate
          ?? ConfigLoader.getRate(concepts, 'employer_pension', 12.0),
        arl_rate: employee.arlRate,
        ccf_rate: overrides.ccfApplies ? ConfigLoader.getRate(concepts, 'ccf', 4.0) : 0,
        icbf_rate: overrides.icbfApplies ? ConfigLoader.getRate(concepts, 'icbf', 3.0) : 0,
        sena_rate: overrides.senaApplies ? ConfigLoader.getRate(concepts, 'sena', 2.0) : 0,
        // Provision rates
        vacation_provision_rate: ConfigLoader.getRate(concepts, 'vacation_provision', 4.17),
        severance_provision_rate: ConfigLoader.getRate(concepts, 'severance_provision', 8.33),
        severance_interest_provision_rate: ConfigLoader.getRate(concepts, 'severance_interest_provision', 1.0),
        service_bonus_provision_rate: ConfigLoader.getRate(concepts, 'service_bonus_provision', 8.33),
        // Worker type info
        worker_type_code: employee.workerTypeCode,
        worker_subtype_code: employee.workerSubtypeCode,
      },
    };
  }
}
