/**
 * Accrued Calculator — Calculates employee earnings (devengados)
 * All overtime rates read from PayrollConcept.default_percentage.
 *
 * Overtime types:
 * - HED:   Hora Extra Diurna           = hourRate × (1 + rate/100)
 * - HEN:   Hora Extra Nocturna         = hourRate × (1 + rate/100)
 * - HEDDF: Hora Extra Diurna Dom/Fest  = hourRate × (1 + rate/100)
 * - HENDF: Hora Extra Nocturna Dom/Fest= hourRate × (1 + rate/100)
 * - HRN:   Recargo Nocturno            = hourRate × (rate/100)  (solo recargo)
 * - HRDDF: Recargo Diurno Dom/Fest     = hourRate × (rate/100)  (solo recargo)
 * - HRNDF: Recargo Nocturno Dom/Fest   = hourRate × (rate/100)  (solo recargo)
 */

import { BaseCalculator } from './base-calculator';
import { ConfigLoader } from './config-loader';
import type {
  AccruedResult,
  AdditionalIncome,
  OvertimeDetail,
  OvertimeEntry,
  PayrollConceptConfig,
  PayrollConfig,
  EmployeeInput,
  VacationEntry,
} from './types';
import { EMPTY_ADDITIONAL_INCOME } from './types';

/** Overtime types that include base hour (extra hours) */
const EXTRA_HOUR_TYPES = ['HED', 'HEN', 'HEDDF', 'HENDF'];

/** Overtime types that are surcharge only (recargos) */
const SURCHARGE_TYPES = ['HRN', 'HRDDF', 'HRNDF'];

/** Map overtime type to PayrollConcept key — they use the same key with 's' suffix in DB */
const OVERTIME_CONCEPT_KEYS: Record<string, string> = {
  HED: 'HEDs',
  HEN: 'HENs',
  HEDDF: 'HEDDFs',
  HENDF: 'HENDFs',
  HRN: 'HRNs',
  HRDDF: 'HRDDFs',
  HRNDF: 'HRNDFs',
};

export class AccruedCalculator {
  /**
   * Calculate all accrued earnings for an employee in a period.
   *
   * @param vacationEntries  Approved vacation/vacation-monetized leaves overlapping the period
   * @param additionalIncome Bonuses, aids, other income from input_data JSON
   */
  static calculate(
    employee: EmployeeInput,
    daysWorked: number,
    overtimeEntries: OvertimeEntry[],
    config: PayrollConfig,
    concepts: Map<string, PayrollConceptConfig>,
    vacationEntries: VacationEntry[] = [],
    additionalIncome: AdditionalIncome = EMPTY_ADDITIONAL_INCOME,
  ): AccruedResult {
    // 1. Base salary proportional to days worked
    const salary = BaseCalculator.proportional(employee.baseSalary, daysWorked);

    // 2. Transportation allowance (if eligible and contract includes it)
    let transportationAllowance = 0;
    if (
      employee.includesTransport &&
      employee.salaryType === 'ORDINARIO' &&
      BaseCalculator.qualifiesForTransport(employee.baseSalary, config.smlv)
    ) {
      transportationAllowance = BaseCalculator.proportional(
        config.transportationAllowance,
        daysWorked,
      );
    }

    // 3. Overtime calculations
    const hourRate = BaseCalculator.hourlyRate(
      employee.baseSalary,
      config.workHoursPerDay,
      config.workDaysPerMonth,
    );

    const overtimeDetails: OvertimeDetail[] = [];
    let overtimeTotal = 0;

    for (const entry of overtimeEntries) {
      if (entry.hours <= 0) continue;

      const conceptKey = OVERTIME_CONCEPT_KEYS[entry.type];
      const rate = ConfigLoader.getRate(concepts, conceptKey, 0);

      let payment: number;

      if (EXTRA_HOUR_TYPES.includes(entry.type)) {
        // Extra hours: base hour + surcharge
        payment = BaseCalculator.round(hourRate * entry.hours * (1 + rate / 100));
      } else {
        // Surcharge only (recargos): just the additional percentage
        payment = BaseCalculator.round(hourRate * entry.hours * (rate / 100));
      }

      overtimeDetails.push({
        type: entry.type,
        quantity: entry.hours,
        rate,
        payment,
      });

      overtimeTotal += payment;
    }

    // 4. Vacation total from approved leave records
    const vacationTotal = vacationEntries.reduce((sum, v) => sum + v.amount, 0);

    // 5. Additional income total (bonuses, aids, other income, commissions)
    const additionalIncomeTotal =
      additionalIncome.bonuses +
      additionalIncome.aids +
      additionalIncome.otherIncome +
      additionalIncome.commissions;

    // 6. Total accrued = salary + transport + overtime + vacations + additional income
    const accruedTotal = salary + transportationAllowance + overtimeTotal
      + vacationTotal + additionalIncomeTotal;

    return {
      workedDays: daysWorked,
      salary: BaseCalculator.round(salary),
      transportationAllowance: BaseCalculator.round(transportationAllowance),
      overtime: overtimeDetails,
      overtimeTotal: BaseCalculator.round(overtimeTotal),
      vacationEntries,
      vacationTotal: BaseCalculator.round(vacationTotal),
      additionalIncome,
      additionalIncomeTotal: BaseCalculator.round(additionalIncomeTotal),
      accruedTotal: BaseCalculator.round(accruedTotal),
    };
  }
}
