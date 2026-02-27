/**
 * Config Loader — Loads PayrollConcept rates and company settings into engine-ready structures.
 * Source of truth: PayrollConcept.default_percentage from the database.
 */

import type { PayrollConceptConfig, PayrollConfig, UvtBracket } from './types';

export class ConfigLoader {
  /**
   * Convert raw PayrollConcept records from DB into a Map<key, PayrollConceptConfig>
   */
  static buildConceptsMap(rawConcepts: any[]): Map<string, PayrollConceptConfig> {
    const map = new Map<string, PayrollConceptConfig>();

    for (const c of rawConcepts) {
      map.set(c.key, {
        key: c.key,
        name: c.name,
        conceptType: c.concept_type,
        defaultPercentage: Number(c.default_percentage ?? 0),
        defaultValue: Number(c.default_value ?? 0),
      });
    }

    return map;
  }

  /**
   * Get a concept's percentage from the map, with a safety fallback
   */
  static getRate(
    concepts: Map<string, PayrollConceptConfig>,
    key: string,
    fallback: number = 0,
  ): number {
    return concepts.get(key)?.defaultPercentage ?? fallback;
  }

  /**
   * Build PayrollConfig from company settings
   * @param year - Settlement year to select the correct UVT value
   */
  static buildPayrollConfig(settings: Record<string, Record<string, any>>, year?: number): PayrollConfig {
    const legal = settings.legal_params ?? {};
    const social = settings.social_security ?? {};
    const work = settings.work_schedule ?? {};

    // Select UVT by year (falls back to current year 2026)
    const uvtKey = `uvt_value_${year ?? 2026}`;
    const uvtValue = Number(legal[uvtKey] ?? legal.uvt_value ?? 52374);

    return {
      smlv: Number(legal.smlv ?? 1750905),
      transportationAllowance: Number(legal.transportation_allowance ?? 249095),
      uvtValue,
      fspThresholdSmmlv: Number(social.fsp_threshold_smmlv ?? 4),
      exonerationThresholdSmmlv: Number(social.exoneration_threshold_smmlv ?? 10),
      exonerationEnabled: social.exoneration_enabled ?? true,
      workHoursPerDay: Number(work.work_hours_per_day ?? 8),
      workDaysPerMonth: Number(work.work_days_per_month ?? 30),
    };
  }

  /**
   * Convert raw UVT bracket records from DB into typed array
   */
  static buildUvtBrackets(rawBrackets: any[]): UvtBracket[] {
    return rawBrackets.map((b) => ({
      fromUvt: Number(b.from_uvt),
      toUvt: b.to_uvt != null ? Number(b.to_uvt) : null,
      fixedFeeUvt: Number(b.fixed_fee_uvt ?? 0),
      marginalRate: Number(b.marginal_rate),
      subtractUvt: Number(b.subtract_uvt ?? 0),
      procedure: Number(b.procedure ?? 1),
    }));
  }
}
