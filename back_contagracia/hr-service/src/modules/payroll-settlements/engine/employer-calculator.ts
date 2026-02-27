/**
 * Employer Calculator — Calculates employer social security contributions
 * Rates from PayrollConcept.default_percentage:
 *   employer_health = 8.50%, employer_pension = 12.00%, arl = 0.52%
 *   ccf = 4.00%, icbf = 3.00%, sena = 2.00%
 *
 * Ley 1607 / Ley 1819 Exoneration (salary < 10 SMLMV):
 *   EXEMPT: employer_health, icbf, sena
 *   NOT exempt: employer_pension, arl, ccf
 *
 * Per-payroll vs Last-of-month:
 *   EACH PAYROLL: employer_pension, arl, ccf (on current IBC)
 *   LAST OF MONTH ONLY: employer_health, icbf, sena (on accumulated monthly IBC)
 *
 * Special worker types (SENA, pensionados, etc.) may override or disable specific contributions
 * via SubtypeOverrides flags and rate overrides.
 */

import { BaseCalculator } from './base-calculator';
import { ConfigLoader } from './config-loader';
import type {
  EmployerContributionResult,
  MonthlyAccumulated,
  PayrollConceptConfig,
  PayrollConfig,
  SubtypeOverrides,
} from './types';
import { EMPTY_MONTHLY_ACCUMULATED } from './types';

export class EmployerCalculator {
  /**
   * Calculate all employer contributions for an employee.
   *
   * @param isLastOfMonth      Whether this is the last payroll of the month
   * @param monthlyAccumulated Accumulated IBC from previous payrolls in the same month
   */
  static calculate(
    ibc: number,
    salary: number,
    config: PayrollConfig,
    concepts: Map<string, PayrollConceptConfig>,
    overrides: SubtypeOverrides,
    arlRate: number | null,
    isLastOfMonth: boolean = true,
    monthlyAccumulated: MonthlyAccumulated = EMPTY_MONTHLY_ACCUMULATED,
  ): EmployerContributionResult {
    // Monthly accumulated IBC for contributions that only apply on last payroll
    const monthlyIbc = monthlyAccumulated.totalIbc + ibc;

    // Check Ley 1607 exoneration — use monthly salary for accurate threshold check
    const exonerationApplies =
      config.exonerationEnabled &&
      salary < config.smlv * config.exonerationThresholdSmmlv;

    // ── Per-payroll contributions (always calculated) ──

    // 1. Employer Pension (each payroll, on current IBC)
    let employerPension = 0;
    if (overrides.pensionEmployerRate != null) {
      employerPension = BaseCalculator.round(ibc * overrides.pensionEmployerRate / 100);
    } else if (overrides.pensionEmployeePays) {
      const pensionRate = ConfigLoader.getRate(concepts, 'employer_pension', 12.0);
      employerPension = BaseCalculator.round(ibc * pensionRate / 100);
    }

    // 2. ARL (each payroll, on current IBC — never exempt)
    let arl = 0;
    if (overrides.arlApplies) {
      const aRate = arlRate ?? ConfigLoader.getRate(concepts, 'arl', 0.522);
      arl = BaseCalculator.round(ibc * aRate / 100);
    }

    // 3. CCF (each payroll, on current IBC — never exempt under Ley 1607)
    let ccf = 0;
    if (overrides.ccfApplies) {
      const ccfRate = ConfigLoader.getRate(concepts, 'ccf', 4.0);
      ccf = BaseCalculator.round(ibc * ccfRate / 100);
    }

    // ── Last-of-month contributions (only on final payroll, using accumulated monthly IBC) ──

    // 4. Employer Health — only last payroll, on monthly accumulated IBC
    let employerHealth = 0;
    if (isLastOfMonth) {
      if (overrides.healthEmployerRate != null) {
        // Explicit rate from subtype/type rule (e.g., SENA lectiva 12.5%) — always applies
        employerHealth = BaseCalculator.round(monthlyIbc * overrides.healthEmployerRate / 100);
      } else if (!exonerationApplies && overrides.healthEmployeePays) {
        const rate = ConfigLoader.getRate(concepts, 'employer_health', 8.5);
        employerHealth = BaseCalculator.round(monthlyIbc * rate / 100);
      }
    }

    // 5. ICBF — only last payroll, on monthly accumulated IBC
    let icbf = 0;
    if (isLastOfMonth && !exonerationApplies && overrides.icbfApplies) {
      const icbfRate = ConfigLoader.getRate(concepts, 'icbf', 3.0);
      icbf = BaseCalculator.round(monthlyIbc * icbfRate / 100);
    }

    // 6. SENA — only last payroll, on monthly accumulated IBC
    let sena = 0;
    if (isLastOfMonth && !exonerationApplies && overrides.senaApplies) {
      const senaRate = ConfigLoader.getRate(concepts, 'sena', 2.0);
      sena = BaseCalculator.round(monthlyIbc * senaRate / 100);
    }

    const total = employerHealth + employerPension + arl + ccf + icbf + sena;

    return {
      employerHealth,
      employerPension,
      arl,
      ccf,
      icbf,
      sena,
      totalEmployerContributions: BaseCalculator.round(total),
    };
  }
}
