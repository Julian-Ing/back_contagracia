/**
 * Cesantías (Severance) Settlement Calculator
 * Cesantías:  (salary + transport) × daysInYear / 360
 * Intereses:  cesantías × 12% × daysInYear / 360
 *
 * Colombian law: Cesantías are deposited to the severance fund by Feb 14 each year.
 * Interests on cesantías are paid directly to the employee by Jan 31.
 *
 * To avoid double-counting, daysInYear accepts a lastPaidCesantiasDate parameter
 * which adjusts the start of the accrual period.
 */

import { BaseCalculator } from '../base-calculator';
import type { EmployeeInput, PayrollConfig, CesantiasResult } from '../types';

export class CesantiasCalculator {
  /**
   * Calculate cesantías and interest for an employee.
   * @param daysInYear Number of days worked in the year (max 360)
   */
  static calculate(
    employee: EmployeeInput,
    config: PayrollConfig,
    daysInYear: number,
  ): CesantiasResult {
    const salary = employee.baseSalary;

    let transportAllowance = 0;
    if (
      employee.includesTransport &&
      employee.salaryType === 'ORDINARIO' &&
      BaseCalculator.qualifiesForTransport(salary, config.smlv)
    ) {
      transportAllowance = config.transportationAllowance;
    }

    let base = salary;
    if (employee.salaryType === 'INTEGRAL') {
      base = BaseCalculator.integralBase(salary);
      transportAllowance = 0;
    }

    const days = Math.min(daysInYear, 360);

    // Cesantías = (salary + transport) × days / 360
    const cesantiasAmount = BaseCalculator.round((base + transportAllowance) * days / 360);

    // Intereses = cesantías × 12% × days / 360
    const interestAmount = BaseCalculator.round(cesantiasAmount * 0.12 * days / 360);

    return {
      baseSalary: base,
      transportAllowance,
      daysInYear: days,
      cesantiasAmount,
      interestAmount,
      total: cesantiasAmount + interestAmount,
    };
  }

  /**
   * Calculate days in year based on contract dates.
   *
   * @param lastPaidCesantiasDate  If provided, the period starts the day after the last paid
   *                                cesantías settlement (avoids double-counting accrued days).
   *                                If null/undefined, the period starts from yearStart.
   */
  static daysInYear(
    contractStart: Date,
    contractEnd: Date | null,
    yearStart: Date,
    yearEnd: Date,
    lastPaidCesantiasDate?: Date | null,
  ): number {
    // If there was a previous cesantías settlement, start from the day after
    let periodStart = yearStart;
    if (lastPaidCesantiasDate) {
      const dayAfter = new Date(lastPaidCesantiasDate);
      dayAfter.setDate(dayAfter.getDate() + 1);
      if (dayAfter > periodStart) {
        periodStart = dayAfter;
      }
    }

    const effectiveStart = contractStart > periodStart ? contractStart : periodStart;
    const effectiveEnd = contractEnd && contractEnd < yearEnd ? contractEnd : yearEnd;

    if (effectiveStart > effectiveEnd) return 0;

    return BaseCalculator.days30(effectiveStart, effectiveEnd);
  }
}
