/**
 * Subtype Resolver — Resolves WorkerSubtypeRule overrides for special worker types
 * (apprentices, pensioners, etc.) that have different rates or exemptions.
 *
 * Resolution order:
 * 1. WorkerSubtypeRule from DB (custom per SubTypeWorker)
 * 2. Built-in TypeWorker rules (SENA apprentices, etc. per Ley 2466/2025)
 * 3. Defaults (standard dependent worker)
 */

import type { SubtypeOverrides } from './types';

/** Default overrides when no subtype rule exists */
const DEFAULT_OVERRIDES: SubtypeOverrides = {
  healthEmployeeRate: null,
  healthEmployerRate: null,
  pensionEmployeeRate: null,
  pensionEmployerRate: null,
  healthEmployeePays: true,
  pensionEmployeePays: true,
  ccfApplies: true,
  icbfApplies: true,
  senaApplies: true,
  arlApplies: true,
  fspApplies: true,
  fspSpecialRate: null,
  ibcMinSmmlvPercentage: null,
};

/**
 * Built-in TypeWorker overrides — for worker types that have special rules
 * regardless of their subtype. Based on Colombian law.
 *
 * TypeWorker IDs (from typeWorkers seed):
 *   '4' = Aprendices del Sena en etapa lectiva (code 12)
 *   '6' = Aprendices del SENA en etapa productiva (code 19)
 *   '9' = Estudiantes aportes solo riesgos laborales (code 23)
 */
const WORKER_TYPE_OVERRIDES: Record<string, SubtypeOverrides> = {
  // Aprendices SENA - Etapa Lectiva (Ley 2466/2025)
  // Empleador paga 12.5% salud, NO pensión, solo ARL, NO parafiscales
  '4': {
    healthEmployeeRate: null,
    healthEmployerRate: 12.5,
    pensionEmployeeRate: null,
    pensionEmployerRate: null,
    healthEmployeePays: false,    // Empleado NO paga salud
    pensionEmployeePays: false,   // NO cotiza pensión
    ccfApplies: false,
    icbfApplies: false,
    senaApplies: false,
    arlApplies: true,             // Solo ARL
    fspApplies: false,
    fspSpecialRate: null,
    ibcMinSmmlvPercentage: 75,    // Base mínima: 75% SMLV
  },

  // Aprendices SENA - Etapa Productiva (Ley 2466/2025)
  // Aportes normales (8.5%+4% salud, 12%+4% pensión), parafiscales aplican
  '6': {
    healthEmployeeRate: null,     // 4% estándar
    healthEmployerRate: null,     // 8.5% estándar
    pensionEmployeeRate: null,    // 4% estándar
    pensionEmployerRate: null,    // 12% estándar
    healthEmployeePays: true,
    pensionEmployeePays: true,
    ccfApplies: true,
    icbfApplies: true,
    senaApplies: true,
    arlApplies: true,
    fspApplies: false,            // Salario = 1 SMLV, no supera umbral
    fspSpecialRate: null,
    ibcMinSmmlvPercentage: 100,   // Base mínima: 100% SMLV
  },

  // Estudiantes - solo riesgos laborales (code 23)
  '9': {
    healthEmployeeRate: null,
    healthEmployerRate: null,
    pensionEmployeeRate: null,
    pensionEmployerRate: null,
    healthEmployeePays: false,
    pensionEmployeePays: false,
    ccfApplies: false,
    icbfApplies: false,
    senaApplies: false,
    arlApplies: true,
    fspApplies: false,
    fspSpecialRate: null,
    ibcMinSmmlvPercentage: null,
  },
};

export class SubtypeResolver {
  /**
   * Convert a raw WorkerSubtypeRule record into SubtypeOverrides.
   * If rule is null/undefined, returns defaults (no overrides).
   */
  static resolve(rule: any | null): SubtypeOverrides {
    if (!rule) {
      return { ...DEFAULT_OVERRIDES };
    }

    return {
      healthEmployeeRate: rule.health_employee_rate != null ? Number(rule.health_employee_rate) : null,
      healthEmployerRate: rule.health_employer_rate != null ? Number(rule.health_employer_rate) : null,
      pensionEmployeeRate: rule.pension_employee_rate != null ? Number(rule.pension_employee_rate) : null,
      pensionEmployerRate: rule.pension_employer_rate != null ? Number(rule.pension_employer_rate) : null,
      healthEmployeePays: rule.health_employee_pays ?? true,
      pensionEmployeePays: rule.pension_employee_pays ?? true,
      ccfApplies: rule.ccf_applies ?? true,
      icbfApplies: rule.icbf_applies ?? true,
      senaApplies: rule.sena_applies ?? true,
      arlApplies: rule.arl_applies ?? true,
      fspApplies: rule.fsp_applies ?? true,
      fspSpecialRate: rule.fsp_special_rate != null ? Number(rule.fsp_special_rate) : null,
      ibcMinSmmlvPercentage: rule.ibc_min_smmlv_percentage != null ? Number(rule.ibc_min_smmlv_percentage) : null,
    };
  }

  /**
   * Resolve overrides considering both WorkerType and WorkerSubtypeRule.
   * Priority: SubtypeRule (DB) > TypeWorker (built-in) > Defaults
   *
   * @param subtypeRule - Raw WorkerSubtypeRule from DB (or null)
   * @param workerTypeId - TypeWorker ID (e.g., '4' for SENA lectiva)
   */
  static resolveWithWorkerType(subtypeRule: any | null, workerTypeId: string | null): SubtypeOverrides {
    // 1. If there's a DB subtype rule, it takes priority
    if (subtypeRule) {
      return SubtypeResolver.resolve(subtypeRule);
    }

    // 2. Check built-in TypeWorker overrides
    if (workerTypeId && WORKER_TYPE_OVERRIDES[workerTypeId]) {
      return { ...WORKER_TYPE_OVERRIDES[workerTypeId] };
    }

    // 3. Defaults
    return { ...DEFAULT_OVERRIDES };
  }
}
