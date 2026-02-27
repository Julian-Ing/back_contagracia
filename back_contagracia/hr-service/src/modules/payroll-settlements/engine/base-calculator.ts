/**
 * Base Calculator — Utility functions for payroll calculations
 * All financial values are stored with up to 4 decimal places.
 * Display precision depends on the tenant's displayDecimals setting (frontend).
 */

export class BaseCalculator {
  /**
   * Round a value to N decimal places (default 4 for storage precision)
   */
  static round(value: number, decimals: number = 4): number {
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
  }

  /**
   * Calculate days using 30-day month convention (Colombian standard)
   * Each month = 30 days, each year = 360 days
   */
  static days30(start: Date, end: Date): number {
    const y1 = start.getFullYear();
    const m1 = start.getMonth() + 1;
    const d1 = Math.min(start.getDate(), 30);

    const y2 = end.getFullYear();
    const m2 = end.getMonth() + 1;
    const d2 = Math.min(end.getDate(), 30);

    return (y2 - y1) * 360 + (m2 - m1) * 30 + (d2 - d1);
  }

  /**
   * Calculate hourly rate from monthly salary
   */
  static hourlyRate(
    monthlySalary: number,
    hoursPerDay: number = 8,
    daysPerMonth: number = 30,
  ): number {
    return monthlySalary / (daysPerMonth * hoursPerDay);
  }

  /**
   * Calculate daily rate from monthly salary
   */
  static dailyRate(monthlySalary: number, daysPerMonth: number = 30): number {
    return monthlySalary / daysPerMonth;
  }

  /**
   * Calculate IBC (Ingreso Base de Cotización) — Base for social security contributions
   * - ORDINARIO: salary + overtime (transport NOT included in IBC)
   * - INTEGRAL: salary × 0.70 (prestational factor excluded)
   */
  static calculateIBC(
    salary: number,
    overtimeTotal: number,
    salaryType: 'ORDINARIO' | 'INTEGRAL',
    smlv: number,
    daysWorked: number = 30,
    ibcMinSmmlvPercentage: number | null = null,
  ): number {
    let ibc: number;

    if (salaryType === 'INTEGRAL') {
      ibc = BaseCalculator.integralBase(salary);
    } else {
      ibc = salary + overtimeTotal;
    }

    // Proportional to days worked
    if (daysWorked < 30) {
      ibc = (ibc / 30) * daysWorked;
    }

    // IBC minimum: uses ibcMinSmmlvPercentage if set (e.g. 75% for SENA lectiva), else 100% SMLV
    const minSmmlvFactor = ibcMinSmmlvPercentage != null ? ibcMinSmmlvPercentage / 100 : 1;
    const minIbc = (smlv * minSmmlvFactor / 30) * daysWorked;
    if (ibc < minIbc) {
      ibc = minIbc;
    }

    return BaseCalculator.round(ibc);
  }

  /**
   * Integral salary base = salary × 0.70
   * The 30% factor prestacional is excluded from IBC
   */
  static integralBase(salary: number): number {
    return salary * 0.70;
  }

  /**
   * Check if employee qualifies for transportation allowance
   * Eligible if salary ≤ 2 SMLMV
   */
  static qualifiesForTransport(salary: number, smlv: number): boolean {
    return salary <= smlv * 2;
  }

  /**
   * Calculate proportional amount for partial periods
   */
  static proportional(monthlyAmount: number, daysWorked: number): number {
    return BaseCalculator.round((monthlyAmount / 30) * daysWorked);
  }

  /**
   * Calculate commercial days (30-day convention) of an event that overlaps a payroll period.
   * Clamps the event to the period boundaries and returns days30.
   */
  static commercialDaysInPeriod(
    eventStart: Date,
    eventEnd: Date,
    periodStart: Date,
    periodEnd: Date,
  ): number {
    const clampedStart = eventStart < periodStart ? periodStart : eventStart;
    const clampedEnd = eventEnd > periodEnd ? periodEnd : eventEnd;
    if (clampedStart > clampedEnd) return 0;
    return Math.max(1, BaseCalculator.days30(clampedStart, clampedEnd));
  }
}
