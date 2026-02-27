/**
 * Terminación (Contract Termination) Settlement Calculator
 * Calculates all proportional benefits + indemnification (if applicable).
 *
 * Components:
 * 1. Proportional salary for remaining days
 * 2. Prima proporcional
 * 3. Cesantías proporcionales + intereses
 * 4. Vacaciones proporcionales
 * 5. Indemnización (only SIN_JUSTA_CAUSA):
 *    - Fijo: remaining salary until contract end
 *    - Indefinido < 10 SMLMV: 30 days/1st year + 20 days/additional
 *    - Indefinido ≥ 10 SMLMV: 20 days/1st year + 15 days/additional
 */

import { BaseCalculator } from '../base-calculator';
import { PrimaCalculator } from './prima.calculator';
import { CesantiasCalculator } from './cesantias.calculator';
import { VacacionesCalculator } from './vacaciones.calculator';
import type {
  EmployeeInput,
  PayrollConfig,
  TerminacionResult,
  PrimaResult,
  CesantiasResult,
  VacacionesResult,
  TerminationReason,
} from '../types';

export class TerminacionCalculator {
  /**
   * Calculate full termination settlement.
   * @param terminationDate Date of contract termination
   * @param reason Termination reason (affects indemnification)
   */
  static calculate(
    employee: EmployeeInput,
    config: PayrollConfig,
    terminationDate: Date,
    reason: TerminationReason,
  ): TerminacionResult {
    const contractStart = employee.contractStartDate;
    const yearStart = new Date(terminationDate.getFullYear(), 0, 1);
    const semesterMonth = terminationDate.getMonth() < 6 ? 0 : 6;
    const semesterStart = new Date(terminationDate.getFullYear(), semesterMonth, 1);

    // Days worked from contract start to termination
    const totalDaysWorked = BaseCalculator.days30(contractStart, terminationDate);
    const daysInYear = CesantiasCalculator.daysInYear(contractStart, null, yearStart, terminationDate);
    const daysInSemester = PrimaCalculator.daysInSemester(contractStart, null, semesterStart, terminationDate);

    // 1. Proportional salary (days worked in current month)
    const dayOfMonth = Math.min(terminationDate.getDate(), 30);
    const proportionalSalary = BaseCalculator.proportional(employee.baseSalary, dayOfMonth);

    // 2. Prima proporcional
    const prima: PrimaResult = PrimaCalculator.calculate(employee, config, daysInSemester);

    // 3. Cesantías proporcionales + intereses
    const cesantias: CesantiasResult = CesantiasCalculator.calculate(employee, config, daysInYear);

    // 4. Vacaciones proporcionales
    const vacationDays = VacacionesCalculator.proportionalDays(totalDaysWorked);
    const vacaciones: VacacionesResult = VacacionesCalculator.calculate(employee, vacationDays);

    // 5. Indemnification (only SIN_JUSTA_CAUSA)
    let indemnification = 0;
    let indemnificationReason: string | null = null;

    // Only SIN_JUSTA_CAUSA triggers indemnification (Art. 64 CST)
    // JUSTA_CAUSA, MUTUO_ACUERDO, RENUNCIA, VENCIMIENTO_CONTRATO → no indemnification
    if (reason === 'SIN_JUSTA_CAUSA') {
      indemnification = TerminacionCalculator.calculateIndemnification(
        employee,
        config,
        totalDaysWorked,
      );
      indemnificationReason = 'SIN_JUSTA_CAUSA';
    }

    const total =
      proportionalSalary +
      prima.primaAmount +
      cesantias.total +
      vacaciones.vacationAmount +
      indemnification;

    return {
      proportionalSalary,
      prima,
      cesantias,
      vacaciones,
      indemnification,
      indemnificationReason,
      total: BaseCalculator.round(total),
    };
  }

  /**
   * Calculate indemnification for unjust termination (SIN_JUSTA_CAUSA).
   * Art. 64 CST:
   *
   * Contrato fijo:
   *   - Remaining salary until contract end date
   *
   * Contrato indefinido, salary < 10 SMLMV:
   *   - 30 days per first year + 20 days per additional year (proportional)
   *
   * Contrato indefinido, salary ≥ 10 SMLMV:
   *   - 20 days per first year + 15 days per additional year (proportional)
   */
  private static calculateIndemnification(
    employee: EmployeeInput,
    config: PayrollConfig,
    totalDaysWorked: number,
  ): number {
    const dailyRate = BaseCalculator.dailyRate(employee.baseSalary);
    const isFixedTerm = employee.contractEndDate !== null;

    if (isFixedTerm && employee.contractEndDate) {
      // Fixed term: remaining salary until contract end
      const remainingDays = BaseCalculator.days30(new Date(), employee.contractEndDate);
      if (remainingDays <= 0) return 0;
      return BaseCalculator.round(dailyRate * remainingDays);
    }

    // Indefinite term
    const yearsWorked = totalDaysWorked / 360;
    const isHighSalary = employee.baseSalary >= config.smlv * 10;

    if (isHighSalary) {
      // ≥ 10 SMLMV: 20 days/1st year + 15 days/additional
      const firstYear = 20;
      const additionalYears = Math.max(0, yearsWorked - 1);
      const additionalDays = additionalYears * 15;
      return BaseCalculator.round(dailyRate * (firstYear + additionalDays));
    } else {
      // < 10 SMLMV: 30 days/1st year + 20 days/additional
      const firstYear = 30;
      const additionalYears = Math.max(0, yearsWorked - 1);
      const additionalDays = additionalYears * 20;
      return BaseCalculator.round(dailyRate * (firstYear + additionalDays));
    }
  }
}
