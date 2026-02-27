/**
 * Prima (Service Bonus) Settlement Calculator
 * Formula: (salary + transport_allowance) × daysInSemester / 360
 *
 * Colombian law: Prima is paid twice a year (June 30 and December 20).
 * Each semester: Jan-Jun or Jul-Dec.
 */

import { BaseCalculator } from '../base-calculator';
import type { EmployeeInput, PayrollConfig, PrimaResult } from '../types';

export class PrimaCalculator {
  /**
   * Calculate prima for an employee.
   * @param daysInSemester Number of days worked in the semester (max 180)
   */
  static calculate(
    employee: EmployeeInput,
    config: PayrollConfig,
    daysInSemester: number,
  ): PrimaResult {
    const salary = employee.baseSalary;

    // Transport applies if salary ≤ 2 SMLMV and contract includes it
    let transportAllowance = 0;
    if (
      employee.includesTransport &&
      employee.salaryType === 'ORDINARIO' &&
      BaseCalculator.qualifiesForTransport(salary, config.smlv)
    ) {
      transportAllowance = config.transportationAllowance;
    }

    // Integral salary: prima is already included in the 30% factor
    // but by law it's still calculated on the 70% base
    let base = salary;
    if (employee.salaryType === 'INTEGRAL') {
      base = BaseCalculator.integralBase(salary);
      transportAllowance = 0;
    }

    const days = Math.min(daysInSemester, 180);
    const primaAmount = BaseCalculator.round((base + transportAllowance) * days / 360);

    return {
      baseSalary: base,
      transportAllowance,
      daysInSemester: days,
      primaAmount,
    };
  }

  /**
   * Calculate days in semester based on contract dates and semester period.
   */
  static daysInSemester(
    contractStart: Date,
    contractEnd: Date | null,
    semesterStart: Date,
    semesterEnd: Date,
  ): number {
    const effectiveStart = contractStart > semesterStart ? contractStart : semesterStart;
    const effectiveEnd = contractEnd && contractEnd < semesterEnd ? contractEnd : semesterEnd;

    if (effectiveStart > effectiveEnd) return 0;

    return BaseCalculator.days30(effectiveStart, effectiveEnd);
  }
}
