/**
 * Regular Settlement Calculator
 * Uses the full PayrollEngine for standard monthly/biweekly payroll.
 */

import { PayrollEngine } from '../payroll-engine';
import type {
  EmployeeInput,
  EmployeePayrollResult,
  OvertimeEntry,
  PayrollConceptConfig,
  PayrollConfig,
  SettlementPeriod,
  UvtBracket,
} from '../types';

export class RegularCalculator {
  static calculate(
    employee: EmployeeInput,
    period: SettlementPeriod,
    config: PayrollConfig,
    overtimeEntries: OvertimeEntry[],
    uvtBrackets: UvtBracket[],
    concepts: Map<string, PayrollConceptConfig>,
    subtypeRule: any | null,
  ): EmployeePayrollResult {
    return PayrollEngine.calculateEmployee(
      employee,
      period,
      config,
      overtimeEntries,
      uvtBrackets,
      concepts,
      subtypeRule,
    );
  }
}
