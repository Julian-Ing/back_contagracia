/**
 * Deduction Calculator — Calculates employee deductions
 * Rates from PayrollConcept.default_percentage:
 *   eps_deduction = 4.00%, pension_deduction = 4.00%, fondosp_deduction_SP = 1.00%
 *
 * Rules:
 * - EPS & Pension: always apply (can be overridden by subtype or worker type)
 * - FSP: progressive 1%-2% if salary > 4 SMLV AND is_last_of_month (Ley 100 Art.25 / Ley 797 Art.20)
 *        Uses MONTHLY accumulated IBC to determine rate, subtracts what was already withheld
 * - Withholding tax: only on last payroll of month, uses MONTHLY accumulated income
 *        Subtracts withholding already applied in previous payrolls of the same month
 */

import { BaseCalculator } from './base-calculator';
import { ConfigLoader } from './config-loader';
import type {
  DeductionResult,
  MonthlyAccumulated,
  PayrollConceptConfig,
  PayrollConfig,
  SubtypeOverrides,
  UvtBracket,
} from './types';
import { EMPTY_MONTHLY_ACCUMULATED } from './types';

export class DeductionCalculator {
  /**
   * Calculate all deductions for an employee.
   *
   * @param monthlyAccumulated  Accumulated values from previous payrolls in the same calendar month
   */
  static calculate(
    ibc: number,
    totalIncome: number,
    config: PayrollConfig,
    concepts: Map<string, PayrollConceptConfig>,
    overrides: SubtypeOverrides,
    uvtBrackets: UvtBracket[],
    isLastOfMonth: boolean,
    salaryType: 'ORDINARIO' | 'INTEGRAL',
    monthlyAccumulated: MonthlyAccumulated = EMPTY_MONTHLY_ACCUMULATED,
  ): DeductionResult {
    // 1. EPS deduction (each payroll, on current IBC)
    let epsDeduction = 0;
    if (overrides.healthEmployeePays) {
      const epsRate = overrides.healthEmployeeRate
        ?? ConfigLoader.getRate(concepts, 'eps_deduction', 4.0);
      epsDeduction = BaseCalculator.round(ibc * epsRate / 100);
    }

    // 2. Pension deduction (each payroll, on current IBC)
    let pensionDeduction = 0;
    if (overrides.pensionEmployeePays) {
      const pensionRate = overrides.pensionEmployeeRate
        ?? ConfigLoader.getRate(concepts, 'pension_deduction', 4.0);
      pensionDeduction = BaseCalculator.round(ibc * pensionRate / 100);
    }

    // 3. FSP (Fondo de Solidaridad Pensional) — only last payroll of month
    // Uses MONTHLY accumulated IBC to determine progressive rate
    let fspDeduction = 0;
    if (isLastOfMonth && overrides.fspApplies) {
      const monthlyIbc = monthlyAccumulated.totalIbc + ibc;
      const fspThreshold = config.smlv * config.fspThresholdSmmlv;

      if (monthlyIbc >= fspThreshold) {
        // Use special subtype rate if defined, otherwise calculate progressive rate
        const fspRate = overrides.fspSpecialRate
          ?? DeductionCalculator.getProgressiveFspRate(monthlyIbc, config.smlv);
        const fspGross = BaseCalculator.round(monthlyIbc * fspRate / 100);
        // Subtract what was already withheld in previous payrolls this month
        fspDeduction = Math.max(0, fspGross - monthlyAccumulated.totalFsp);
      }
    }

    // 4. Withholding tax (retención en la fuente) — only last payroll of month
    // Uses MONTHLY accumulated income, EPS, and pension
    let withholdingAtSource = 0;
    if (isLastOfMonth && uvtBrackets.length > 0) {
      const monthlyIncome = monthlyAccumulated.totalAccrued + totalIncome;
      const monthlyEps = monthlyAccumulated.totalEps + epsDeduction;
      const monthlyPension = monthlyAccumulated.totalPension + pensionDeduction;

      const monthlyWithholding = DeductionCalculator.calculateWithholding(
        monthlyIncome,
        monthlyEps,
        monthlyPension,
        config.uvtValue,
        uvtBrackets,
      );
      // Subtract what was already withheld in previous payrolls this month
      withholdingAtSource = Math.max(0, monthlyWithholding - monthlyAccumulated.totalWithholding);
    }

    const deductionsTotal = epsDeduction + pensionDeduction + fspDeduction + withholdingAtSource;

    return {
      epsDeduction,
      pensionDeduction,
      fspDeduction,
      withholdingAtSource,
      deductionsTotal: BaseCalculator.round(deductionsTotal),
    };
  }

  /**
   * Progressive FSP rate based on IBC in SMLV multiples.
   * Ley 100/1993 Art.25 (Solidaridad 1%) + Ley 797/2003 Art.20 (Subsistencia 0%-1%)
   *
   * | IBC Range      | Solidaridad | Subsistencia | Total |
   * |----------------|-------------|--------------|-------|
   * | 4 - 16 SMLV    | 1.0%        | 0.0%         | 1.0%  |
   * | 16 - 17 SMLV   | 1.0%        | 0.2%         | 1.2%  |
   * | 17 - 18 SMLV   | 1.0%        | 0.4%         | 1.4%  |
   * | 18 - 19 SMLV   | 1.0%        | 0.6%         | 1.6%  |
   * | 19 - 20 SMLV   | 1.0%        | 0.8%         | 1.8%  |
   * | > 20 SMLV      | 1.0%        | 1.0%         | 2.0%  |
   */
  static getProgressiveFspRate(ibc: number, smlv: number): number {
    const smmlvMultiple = ibc / smlv;

    if (smmlvMultiple < 4) return 0;
    if (smmlvMultiple < 16) return 1.0;
    if (smmlvMultiple < 17) return 1.2;
    if (smmlvMultiple < 18) return 1.4;
    if (smmlvMultiple < 19) return 1.6;
    if (smmlvMultiple < 20) return 1.8;
    return 2.0; // > 20 SMLV
  }

  /**
   * Calculate withholding tax using UVT progressive table (Procedimiento 1)
   * 1. gravable = total_income - EPS - pension
   * 2. uvt = gravable / UVT_VALUE
   * 3. Find bracket → (uvt - subtract_uvt) × marginal_rate + fixed_fee_uvt
   * 4. withholding = result × UVT_VALUE
   */
  static calculateWithholding(
    totalIncome: number,
    epsDeduction: number,
    pensionDeduction: number,
    uvtValue: number,
    brackets: UvtBracket[],
  ): number {
    if (uvtValue <= 0 || brackets.length === 0) return 0;

    // Procedure 1 brackets only
    const proc1 = brackets
      .filter((b) => b.procedure === 1)
      .sort((a, b) => a.fromUvt - b.fromUvt);

    if (proc1.length === 0) return 0;

    // Taxable income = total income - social security deductions
    const gravable = totalIncome - epsDeduction - pensionDeduction;
    if (gravable <= 0) return 0;

    // Convert to UVT
    const uvt = gravable / uvtValue;

    // Find applicable bracket
    let bracket: UvtBracket | null = null;
    for (const b of proc1) {
      if (b.toUvt === null) {
        // Last bracket (infinite)
        if (uvt >= b.fromUvt) bracket = b;
      } else {
        if (uvt >= b.fromUvt && uvt < b.toUvt) bracket = b;
      }
    }

    if (!bracket || bracket.marginalRate === 0) return 0;

    // Calculate: (uvt - subtract_uvt) × marginal_rate + fixed_fee_uvt
    const taxUvt = (uvt - bracket.subtractUvt) * Number(bracket.marginalRate) + bracket.fixedFeeUvt;

    // Convert back to pesos
    const withholding = taxUvt * uvtValue;

    return BaseCalculator.round(Math.max(0, withholding));
  }
}
