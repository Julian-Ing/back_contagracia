/**
 * Provision Calculator — Calculates monthly provisions for social benefits
 * Rates from PayrollConcept.default_percentage:
 *   vacation_provision = 4.17%, severance_provision = 8.33%
 *   severance_interest_provision = 1.00%, service_bonus_provision = 8.33%
 *
 * Base for provisions:
 *   Vacaciones: solo salario (no transport)
 *   Cesantías, Prima: salario + transporte
 *   Intereses cesantías: 1% mensual (12% anual) sobre cesantías provisionadas
 *
 * IMPORTANT: Provisions are ONLY calculated on the last payroll of the month.
 * If a benefit has already been liquidated (prima/cesantías/vacaciones),
 * the corresponding provision is skipped via LiquidationFlags.
 */

import { BaseCalculator } from './base-calculator';
import { ConfigLoader } from './config-loader';
import type { ProvisionResult, PayrollConceptConfig, LiquidationFlags } from './types';
import { EMPTY_LIQUIDATION_FLAGS } from './types';

export class ProvisionCalculator {
  /**
   * Calculate monthly provisions for an employee.
   *
   * @param isLastOfMonth    Whether this is the last payroll of the month
   * @param liquidationFlags Flags indicating which benefits have already been liquidated
   */
  static calculate(
    salary: number,
    transportAllowance: number,
    daysWorked: number,
    concepts: Map<string, PayrollConceptConfig>,
    isLastOfMonth: boolean = true,
    liquidationFlags: LiquidationFlags = EMPTY_LIQUIDATION_FLAGS,
  ): ProvisionResult {
    // Provisions only calculated on the last payroll of the month
    if (!isLastOfMonth) {
      return {
        vacationProvision: 0,
        severanceProvision: 0,
        severanceInterestProvision: 0,
        serviceBonusProvision: 0,
        totalProvisions: 0,
      };
    }

    // Proportional salary and transport for the period
    const propSalary = BaseCalculator.proportional(salary, daysWorked);
    const propTransport = BaseCalculator.proportional(transportAllowance, daysWorked);

    // 1. Vacation provision (base = only salary)
    //    Skip if vacaciones already liquidated this month
    let vacationProvision = 0;
    if (!liquidationFlags.hasVacacionesThisMonth) {
      const vacationRate = ConfigLoader.getRate(concepts, 'vacation_provision', 4.17);
      vacationProvision = BaseCalculator.round(propSalary * vacationRate / 100);
    }

    // 2. Severance provision (base = salary + transport)
    //    Skip if cesantías already liquidated this year
    let severanceProvision = 0;
    if (!liquidationFlags.hasCesantiasThisYear) {
      const severanceRate = ConfigLoader.getRate(concepts, 'severance_provision', 8.33);
      severanceProvision = BaseCalculator.round(
        (propSalary + propTransport) * severanceRate / 100,
      );
    }

    // 3. Severance interest provision (1% monthly = 12% annual over severance)
    //    Skip if cesantías already liquidated this year (no severance = no interest)
    let severanceInterestProvision = 0;
    if (!liquidationFlags.hasCesantiasThisYear) {
      const interestRate = ConfigLoader.getRate(concepts, 'severance_interest_provision', 1.0);
      severanceInterestProvision = BaseCalculator.round(
        severanceProvision * interestRate / 100,
      );
    }

    // 4. Service bonus (prima) provision (base = salary + transport)
    //    Skip if prima already liquidated this semester
    let serviceBonusProvision = 0;
    if (!liquidationFlags.hasPrimaThisSemester) {
      const bonusRate = ConfigLoader.getRate(concepts, 'service_bonus_provision', 8.33);
      serviceBonusProvision = BaseCalculator.round(
        (propSalary + propTransport) * bonusRate / 100,
      );
    }

    const total =
      vacationProvision +
      severanceProvision +
      severanceInterestProvision +
      serviceBonusProvision;

    return {
      vacationProvision,
      severanceProvision,
      severanceInterestProvision,
      serviceBonusProvision,
      totalProvisions: BaseCalculator.round(total),
    };
  }
}
