/**
 * Vacaciones (Vacation) Settlement Calculator
 * Formula: salary × daysVacation / 30
 * Note: Transportation allowance is NOT included in vacation base.
 *
 * Colombian law: 15 hábiles (business days) per year = approximately 15 calendar days.
 * For calculation purposes: salary / 30 × vacation days.
 */

import { BaseCalculator } from '../base-calculator';
import type { EmployeeInput, VacacionesResult } from '../types';

export class VacacionesCalculator {
  /**
   * Calculate vacation payment for an employee.
   * @param daysVacation Number of vacation days to liquidate
   */
  static calculate(
    employee: EmployeeInput,
    daysVacation: number,
  ): VacacionesResult {
    let baseSalary = employee.baseSalary;

    // Integral salary: use 70% base
    if (employee.salaryType === 'INTEGRAL') {
      baseSalary = BaseCalculator.integralBase(employee.baseSalary);
    }

    // Vacation = salary × days / 30 (no transport)
    const vacationAmount = BaseCalculator.round(baseSalary * daysVacation / 30);

    return {
      baseSalary,
      daysVacation,
      vacationAmount,
    };
  }

  /**
   * Calculate proportional vacation days.
   * 15 business days per year worked = 15 days per 360 days.
   */
  static proportionalDays(daysWorked: number): number {
    return BaseCalculator.round(15 * daysWorked / 360, 2);
  }
}
