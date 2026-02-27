/**
 * Types for the Payroll Calculation Engine
 * All rates are loaded from PayrollConcept.default_percentage — nothing hardcoded.
 */

// ==================== INPUT TYPES ====================

export interface PayrollConceptConfig {
  key: string;
  name: string;
  conceptType: string; // ACCRUED | DEDUCTION | PROVISION | PARAFISCAL
  defaultPercentage: number;
  defaultValue: number;
}

export interface UvtBracket {
  fromUvt: number;
  toUvt: number | null; // null = last bracket (infinity)
  fixedFeeUvt: number;
  marginalRate: number;
  subtractUvt: number;
  procedure: number;
}

export interface SubtypeOverrides {
  healthEmployeeRate: number | null;
  healthEmployerRate: number | null;
  pensionEmployeeRate: number | null;
  pensionEmployerRate: number | null;
  healthEmployeePays: boolean;
  pensionEmployeePays: boolean;
  ccfApplies: boolean;
  icbfApplies: boolean;
  senaApplies: boolean;
  arlApplies: boolean;
  fspApplies: boolean;
  fspSpecialRate: number | null;
  ibcMinSmmlvPercentage: number | null;
}

export interface PayrollConfig {
  smlv: number;
  transportationAllowance: number;
  uvtValue: number;
  fspThresholdSmmlv: number;
  exonerationThresholdSmmlv: number;
  exonerationEnabled: boolean;
  workHoursPerDay: number;
  workDaysPerMonth: number;
}

export interface EmployeeInput {
  thirdPartyId: string;
  name: string;
  document: string | null;
  position: string | null;
  baseSalary: number;
  salaryType: 'ORDINARIO' | 'INTEGRAL';
  contractType: string | null;
  workerTypeCode: string | null;
  workerSubtypeCode: string | null;
  workerSubtypeId: string | null;
  isAdministrative: boolean;
  arlRate: number | null;
  includesTransport: boolean;
  contractStartDate: Date;
  contractEndDate: Date | null;
}

export interface OvertimeEntry {
  type: 'HED' | 'HEN' | 'HEDDF' | 'HENDF' | 'HRN' | 'HRDDF' | 'HRNDF';
  hours: number;
}

export interface SettlementPeriod {
  startDate: Date;
  endDate: Date;
  year: number;
  month: number;
  periodNumber: number;
  isLastOfMonth: boolean;
  daysWorked?: number;
  settlementType: 'REGULAR' | 'PRIMA' | 'CESANTIAS' | 'VACACIONES' | 'TERMINACION';
}

/** Must match TerminacionCalculator's accepted reason values */
export type TerminationReason =
  | 'SIN_JUSTA_CAUSA'      // Triggers indemnification
  | 'JUSTA_CAUSA'          // No indemnification
  | 'MUTUO_ACUERDO'        // No indemnification
  | 'RENUNCIA'             // No indemnification
  | 'VENCIMIENTO_CONTRATO'; // No indemnification (fixed-term expiry)

/** Options specific to settlement type, resolved before calling the dispatcher */
export interface SettlementOptions {
  /** For TERMINACION: reason determines whether indemnification applies */
  terminationReason?: TerminationReason;
  /** For VACACIONES: approved days from leave records (fallback: 15) */
  vacationDays?: number;
  /** For CESANTIAS: end date of last paid cesantías (avoid double-counting) */
  lastPaidCesantiasDate?: Date | null;
}

// ==================== MONTHLY ACCUMULATION TYPES ====================

/** Accumulated values from previous payrolls in the same calendar month */
export interface MonthlyAccumulated {
  totalAccrued: number;
  totalEps: number;
  totalPension: number;
  totalFsp: number;
  totalWithholding: number;
  totalIbc: number;
}

/** A vacation/vacation_monetized leave overlapping the payroll period */
export interface VacationEntry {
  leaveType: 'VACATION' | 'VACATION_MONETIZED';
  startDate: Date;
  endDate: Date;
  days: number;
  dailyRate: number;
  amount: number;
}

/** Additional income provided by user via input_data JSON */
export interface AdditionalIncome {
  bonuses: number;
  aids: number;
  otherIncome: number;
  commissions: number;
}

/** Flags indicating which benefit settlements exist in the current period */
export interface LiquidationFlags {
  hasPrimaThisSemester: boolean;
  hasCesantiasThisYear: boolean;
  hasVacacionesThisMonth: boolean;
}

export const EMPTY_MONTHLY_ACCUMULATED: MonthlyAccumulated = {
  totalAccrued: 0, totalEps: 0, totalPension: 0,
  totalFsp: 0, totalWithholding: 0, totalIbc: 0,
};

export const EMPTY_ADDITIONAL_INCOME: AdditionalIncome = {
  bonuses: 0, aids: 0, otherIncome: 0, commissions: 0,
};

export const EMPTY_LIQUIDATION_FLAGS: LiquidationFlags = {
  hasPrimaThisSemester: false, hasCesantiasThisYear: false, hasVacacionesThisMonth: false,
};

// ==================== OUTPUT TYPES ====================

export interface OvertimeDetail {
  type: string;
  quantity: number;
  rate: number;
  payment: number;
}

export interface AccruedResult {
  workedDays: number;
  salary: number;
  transportationAllowance: number;
  overtime: OvertimeDetail[];
  overtimeTotal: number;
  vacationEntries: VacationEntry[];
  vacationTotal: number;
  additionalIncome: AdditionalIncome;
  additionalIncomeTotal: number;
  accruedTotal: number;
}

export interface DeductionResult {
  epsDeduction: number;
  pensionDeduction: number;
  fspDeduction: number;
  withholdingAtSource: number;
  deductionsTotal: number;
}

export interface EmployerContributionResult {
  employerHealth: number;
  employerPension: number;
  arl: number;
  ccf: number;
  icbf: number;
  sena: number;
  totalEmployerContributions: number;
}

export interface ProvisionResult {
  vacationProvision: number;
  severanceProvision: number;
  severanceInterestProvision: number;
  serviceBonusProvision: number;
  totalProvisions: number;
}

export interface EmployeePayrollResult {
  thirdPartyId: string;
  employeeName: string;
  employeeDocument: string | null;
  employeePosition: string | null;
  employeeBaseSalary: number;
  employeeSalaryType: string;
  employeeContractType: string | null;
  employeeWorkerTypeCode: string | null;
  employeeWorkerSubtypeCode: string | null;
  employeeIsAdministrative: boolean;
  employeeArlRate: number | null;
  employeeIncludesTransport: boolean;

  daysWorked: number;
  ibc: number;

  accrued: AccruedResult;
  deductions: DeductionResult;
  employerContributions: EmployerContributionResult;
  provisions: ProvisionResult;

  totalAccrued: number;
  totalDeductions: number;
  netSalary: number;
  totalEmployerContributions: number;
  totalProvisions: number;
  totalCost: number;

  payrollData: PayrollDataJson;
}

// ==================== payroll_data JSON Structure ====================

export interface PayrollDataJson {
  accrued: {
    worked_days: number;
    salary: number;
    transportation_allowance: number;
    HEDs: OvertimeJsonEntry[];
    HENs: OvertimeJsonEntry[];
    HEDDFs: OvertimeJsonEntry[];
    HENDFs: OvertimeJsonEntry[];
    HRNs: OvertimeJsonEntry[];
    HRDDFs: OvertimeJsonEntry[];
    HRNDFs: OvertimeJsonEntry[];
    vacation_entries: { leave_type: string; days: number; amount: number }[];
    bonuses: number;
    aids: number;
    other_income: number;
    commissions: number;
    other_concepts: ConceptJsonEntry[];
    accrued_total: number;
  };
  deductions: {
    eps_deduction: number;
    pension_deduction: number;
    fondosp_deduction_SP: number;
    withholding_at_source: number;
    other_deductions: ConceptJsonEntry[];
    deductions_total: number;
  };
  employer_contributions: {
    employer_health: number;
    employer_pension: number;
    arl: number;
    ccf: number;
    icbf: number;
    sena: number;
    total_employer_contributions: number;
  };
  provisions: {
    vacation_provision: number;
    severance_provision: number;
    severance_interest_provision: number;
    service_bonus_provision: number;
    total_provisions: number;
  };
  metadata: {
    ibc: number;
    salary_type: string;
    smlv: number;
    uvt_value: number;
    transportation_limit: number;
    exoneration_applied: boolean;
    // Deduction rates (employee)
    eps_rate?: number;
    pension_rate?: number;
    fsp_rate?: number;
    // Employer contribution rates
    employer_health_rate?: number;
    employer_pension_rate?: number;
    arl_rate?: number | null;
    ccf_rate?: number;
    icbf_rate?: number;
    sena_rate?: number;
    // Provision rates (from PayrollConcept)
    vacation_provision_rate?: number;
    severance_provision_rate?: number;
    severance_interest_provision_rate?: number;
    service_bonus_provision_rate?: number;
    // Worker type info
    worker_type_code?: string | null;
    worker_subtype_code?: string | null;
  };
}

export interface OvertimeJsonEntry {
  type: string;
  quantity: number;
  rate: number;
  payment: number;
}

export interface ConceptJsonEntry {
  concept_code: string;
  concept_name: string;
  amount: number;
}

// ==================== SETTLEMENT-SPECIFIC TYPES ====================

export interface PrimaResult {
  baseSalary: number;
  transportAllowance: number;
  daysInSemester: number;
  primaAmount: number;
}

export interface CesantiasResult {
  baseSalary: number;
  transportAllowance: number;
  daysInYear: number;
  cesantiasAmount: number;
  interestAmount: number;
  total: number;
}

export interface VacacionesResult {
  baseSalary: number;
  daysVacation: number;
  vacationAmount: number;
}

export interface TerminacionResult {
  proportionalSalary: number;
  prima: PrimaResult;
  cesantias: CesantiasResult;
  vacaciones: VacacionesResult;
  indemnification: number;
  indemnificationReason: string | null;
  total: number;
}
