/**
 * Tooltips para conceptos de nomina colombiana
 * Incluye titulo, descripcion, formula de calculo y referencia legal
 */

export interface PayrollTooltipInfo {
  title: string;
  description?: string;
  formula?: string;
  legalRef?: string;
  note?: string;
}

export const PAYROLL_TOOLTIPS: Record<string, PayrollTooltipInfo> = {
  // ═══════════════════════════════════════
  // DEVENGADOS (Accrued Income)
  // ═══════════════════════════════════════
  salary: {
    title: 'Salario',
    description: 'Base salarial mensual del empleado, proporcional a los dias trabajados.',
    formula: '(Salario Base / 30) x Dias Trabajados',
    legalRef: 'Art. 127 CST',
  },
  transportation_allowance: {
    title: 'Auxilio de Transporte',
    description: 'Subsidio legal de transporte para empleados que devenguen hasta 2 SMLMV.',
    formula: '(Aux. Transporte / 30) x Dias Trabajados',
    legalRef: 'Ley 15/1959',
    note: 'No aplica para salarios integrales ni superiores a 2 SMLMV',
  },
  bonuses: {
    title: 'Bonificaciones',
    description: 'Pagos adicionales por desempeno, productividad u otros conceptos.',
  },
  aids: {
    title: 'Auxilios',
    description: 'Ayudas economicas temporales o de emergencia otorgadas al empleado.',
  },
  commissions: {
    title: 'Comisiones',
    description: 'Pagos basados en ventas, productividad o metas alcanzadas.',
    note: 'Se integran al calculo del CRM automaticamente si esta configurado',
  },
  other_income: {
    title: 'Otros Ingresos',
    description: 'Ingresos adicionales que no corresponden a las categorias anteriores.',
  },

  // ═══════════════════════════════════════
  // HORAS EXTRAS (Overtime)
  // ═══════════════════════════════════════
  HED: {
    title: 'Hora Extra Diurna (HED)',
    description: 'Trabajo extra en horario diurno (6:00 AM - 9:00 PM).',
    formula: 'Valor Hora x 1.25 x Cantidad',
    legalRef: 'Art. 168 CST',
    note: 'Recargo del 25% sobre el valor hora ordinaria',
  },
  HEN: {
    title: 'Hora Extra Nocturna (HEN)',
    description: 'Trabajo extra en horario nocturno (9:00 PM - 6:00 AM).',
    formula: 'Valor Hora x 1.75 x Cantidad',
    legalRef: 'Art. 168 CST',
    note: 'Recargo del 75% sobre el valor hora ordinaria',
  },
  HEDDF: {
    title: 'HE Diurna Dominical/Festiva',
    description: 'Trabajo extra diurno en domingos o festivos.',
    formula: 'Valor Hora x 2.00 x Cantidad',
    legalRef: 'Art. 168, 179 CST',
    note: 'Recargo del 100% sobre el valor hora ordinaria',
  },
  HENDF: {
    title: 'HE Nocturna Dominical/Festiva',
    description: 'Trabajo extra nocturno en domingos o festivos.',
    formula: 'Valor Hora x 2.50 x Cantidad',
    legalRef: 'Art. 168, 179 CST',
    note: 'Recargo del 150% sobre el valor hora ordinaria',
  },

  // ═══════════════════════════════════════
  // RECARGOS (Surcharges)
  // ═══════════════════════════════════════
  HRN: {
    title: 'Recargo Nocturno (HRN)',
    description: 'Recargo por trabajo en jornada nocturna ordinaria.',
    formula: 'Valor Hora x 0.35 x Cantidad',
    legalRef: 'Art. 168 CST',
    note: 'Recargo del 35% sobre el valor hora ordinaria',
  },
  HRDDF: {
    title: 'Recargo Diurno Dominical/Festivo',
    description: 'Recargo por trabajo diurno ordinario en domingos o festivos.',
    formula: 'Valor Hora x 0.75 x Cantidad',
    legalRef: 'Art. 179 CST',
    note: 'Recargo del 75% sobre el valor hora ordinaria',
  },
  HRNDF: {
    title: 'Recargo Nocturno Dominical/Festivo',
    description: 'Recargo por trabajo nocturno ordinario en domingos o festivos.',
    formula: 'Valor Hora x 1.10 x Cantidad',
    legalRef: 'Art. 168, 179 CST',
    note: 'Recargo del 110% sobre el valor hora ordinaria',
  },

  // ═══════════════════════════════════════
  // VACACIONES
  // ═══════════════════════════════════════
  common_vacation: {
    title: 'Vacaciones Comunes',
    description: 'Dias de descanso remunerado disfrutados por el empleado.',
    formula: '(Salario / 30) x Dias de Vacaciones',
    legalRef: 'Art. 186 CST',
    note: '15 dias habiles de vacaciones por cada ano trabajado',
  },
  paid_vacation: {
    title: 'Vacaciones Compensadas',
    description: 'Vacaciones monetizadas (pagadas sin disfrute efectivo).',
    formula: '(Salario / 30) x Dias',
    legalRef: 'Art. 189 CST',
  },

  // ═══════════════════════════════════════
  // DEDUCCIONES (Deductions)
  // ═══════════════════════════════════════
  eps_deduction: {
    title: 'Aporte Salud (EPS)',
    description: 'Contribucion obligatoria del empleado al sistema de salud.',
    formula: 'IBC x 4%',
    legalRef: 'Art. 204 Ley 100/1993',
    note: 'El empleador aporta un 8.5% adicional',
  },
  pension_deduction: {
    title: 'Aporte Pension',
    description: 'Contribucion obligatoria del empleado al sistema de pensiones.',
    formula: 'IBC x 4%',
    legalRef: 'Art. 20 Ley 100/1993',
    note: 'El empleador aporta un 12% adicional',
  },
  fondosp_deduction_SP: {
    title: 'Fondo de Solidaridad Pensional (FSP)',
    description: 'Aporte adicional obligatorio para empleados con salarios superiores a 4 SMLMV.',
    formula: 'IBC x 1% (progresivo hasta 2% segun rango)',
    legalRef: 'Art. 25 Ley 100/1993',
    note: 'Solo aplica en la ultima nomina del mes. Progresivo: 4-16 SMLMV=1%, 16-17=1.2%, 17-18=1.4%, 18-19=1.6%, 19-20=1.8%, >20=2%',
  },
  withholding_at_source: {
    title: 'Retencion en la Fuente',
    description: 'Impuesto sobre la renta retenido anticipadamente segun tabla de UVT.',
    formula: 'Tabla progresiva UVT (Procedimiento 1)',
    legalRef: 'Art. 383 E.T.',
    note: 'Se calcula sobre la base gravable mensual en UVT. Solo aplica en la ultima nomina del mes.',
  },
  afc: {
    title: 'AFC (Ahorro Fomento Construccion)',
    description: 'Ahorro voluntario para adquisicion de vivienda.',
    note: 'Beneficio tributario: reduce la base gravable de retencion',
  },
  voluntary_pension: {
    title: 'Pension Voluntaria',
    description: 'Aportes voluntarios adicionales al fondo de pensiones.',
    note: 'Beneficio tributario: reduce la base gravable de retencion',
  },
  cooperative: {
    title: 'Cooperativa',
    description: 'Deducciones por afiliacion a cooperativas o fondos de empleados.',
  },
  loans: {
    title: 'Prestamos',
    description: 'Cuotas de prestamos otorgados al empleado por la empresa.',
  },

  // ═══════════════════════════════════════
  // APORTES EMPLEADOR (Employer Contributions)
  // ═══════════════════════════════════════
  employer_health: {
    title: 'Salud Empleador',
    description: 'Contribucion del empleador al sistema de salud.',
    formula: 'IBC x 8.5%',
    legalRef: 'Art. 204 Ley 100/1993',
    note: 'Exonerado si salario < 10 SMLMV (Ley 1607/2012, Art. 114-1 E.T.)',
  },
  employer_pension: {
    title: 'Pension Empleador',
    description: 'Contribucion del empleador al sistema de pensiones.',
    formula: 'IBC x 12%',
    legalRef: 'Art. 20 Ley 100/1993',
  },
  arl: {
    title: 'ARL (Riesgos Laborales)',
    description: 'Seguro contra accidentes de trabajo y enfermedades laborales.',
    formula: 'IBC x Tasa segun nivel de riesgo (I: 0.522%, II: 1.044%, III: 2.436%, IV: 4.350%, V: 6.960%)',
    legalRef: 'Decreto 1295/1994',
  },
  ccf: {
    title: 'Caja de Compensacion (CCF)',
    description: 'Contribucion a la caja de compensacion familiar.',
    formula: 'IBC x 4%',
    legalRef: 'Ley 21/1982',
    note: 'Siempre aplica, incluso bajo exoneracion Ley 1607',
  },
  icbf: {
    title: 'ICBF',
    description: 'Contribucion al Instituto Colombiano de Bienestar Familiar.',
    formula: 'IBC x 3%',
    legalRef: 'Ley 89/1988',
    note: 'Exonerado si salario < 10 SMLMV (Ley 1607/2012)',
  },
  sena: {
    title: 'SENA',
    description: 'Contribucion al Servicio Nacional de Aprendizaje.',
    formula: 'IBC x 2%',
    legalRef: 'Ley 21/1982',
    note: 'Exonerado si salario < 10 SMLMV (Ley 1607/2012)',
  },

  // ═══════════════════════════════════════
  // PROVISIONES (Provisions/Accruals)
  // ═══════════════════════════════════════
  vacation_provision: {
    title: 'Provision Vacaciones',
    description: 'Acumulacion mensual para el pago futuro de vacaciones.',
    formula: 'Salario x 4.17%',
    legalRef: 'Art. 186 CST',
    note: '15 dias habiles por ano = 4.17% mensual',
  },
  severance_provision: {
    title: 'Provision Cesantias',
    description: 'Acumulacion mensual para el pago de cesantias anuales.',
    formula: '(Salario + Aux. Transporte) x 8.33%',
    legalRef: 'Art. 249 CST',
    note: 'Un mes de salario por cada ano trabajado = 8.33% mensual',
  },
  severance_interest_provision: {
    title: 'Intereses sobre Cesantias',
    description: 'Intereses legales sobre las cesantias acumuladas.',
    formula: 'Provision Cesantias x 1% mensual (12% anual)',
    legalRef: 'Ley 52/1975',
    note: 'Se pagan a mas tardar el 31 de enero de cada ano',
  },
  service_bonus_provision: {
    title: 'Provision Prima de Servicios',
    description: 'Acumulacion mensual para el pago de la prima semestral.',
    formula: '(Salario + Aux. Transporte) x 8.33%',
    legalRef: 'Art. 306 CST',
    note: 'Se paga en dos cuotas: 30 de junio y 20 de diciembre',
  },

  // ═══════════════════════════════════════
  // METADATA / PARAMETROS DE CALCULO
  // ═══════════════════════════════════════
  ibc: {
    title: 'IBC (Ingreso Base de Cotizacion)',
    description: 'Base sobre la cual se calculan los aportes a seguridad social.',
    formula: 'Salario + Horas Extras + Recargos + Comisiones',
    note: 'Excluye: auxilio de transporte, vacaciones, bonificaciones no salariales',
  },
  smlv: {
    title: 'SMLMV (Salario Minimo)',
    description: 'Salario minimo legal mensual vigente. Se usa como referencia para umbrales de aportes y exoneraciones.',
    note: 'Se actualiza cada 1 de enero por decreto del gobierno',
  },
  uvt: {
    title: 'UVT (Unidad de Valor Tributario)',
    description: 'Unidad de medida para estandarizar las obligaciones tributarias.',
    note: 'Se usa en el calculo de retencion en la fuente. Se actualiza anualmente.',
  },
  exoneration: {
    title: 'Exoneracion Ley 1607',
    description: 'Exonera al empleador de aportes a salud, ICBF y SENA para empleados con salario inferior a 10 SMLMV.',
    legalRef: 'Art. 114-1 E.T. (Ley 1607/2012)',
    note: 'CCF (4%) siempre se paga. Pension y ARL no se exoneran.',
  },
  salary_type: {
    title: 'Tipo de Salario',
    description: 'Ordinario: salario base + prestaciones separadas. Integral: incluye factor prestacional (70% base + 30% prestaciones).',
    legalRef: 'Art. 132 CST',
    note: 'Salario integral aplica si es >= 13 SMLMV + factor prestacional',
  },
  transportation_limit: {
    title: 'Limite Auxilio Transporte',
    description: 'Tope salarial para tener derecho al auxilio de transporte.',
    formula: '2 x SMLMV',
    note: 'Solo empleados con salario menor o igual a este valor reciben auxilio',
  },

  // ═══════════════════════════════════════
  // RESUMEN DE TARJETAS KPI
  // ═══════════════════════════════════════
  total_accrued: {
    title: 'Total Devengados',
    description: 'Suma de todos los ingresos del empleado en el periodo.',
    formula: 'Salario + Aux. Transporte + Horas Extras + Recargos + Bonos + Comisiones + Otros',
  },
  total_deductions: {
    title: 'Total Deducciones',
    description: 'Suma de todas las deducciones legales y voluntarias.',
    formula: 'EPS (4%) + Pension (4%) + FSP (1%) + Retencion + Otras Deducciones',
  },
  net_salary: {
    title: 'Neto a Pagar',
    description: 'Monto que recibe el empleado despues de todas las deducciones.',
    formula: 'Total Devengados - Total Deducciones',
  },
  total_cost: {
    title: 'Costo Total Empresa',
    description: 'Costo total que asume la empresa por el empleado.',
    formula: 'Devengados + Aportes Patronales + Provisiones',
    note: 'Incluye aportes a salud, pension, ARL, parafiscales y provisiones de prestaciones',
  },
  employer_contributions: {
    title: 'Aportes Patronales',
    description: 'Contribuciones obligatorias del empleador a la seguridad social.',
    formula: 'Salud (8.5%) + Pension (12%) + ARL + CCF (4%) + ICBF (3%) + SENA (2%)',
    note: 'Algunos aportes se exoneran bajo Ley 1607 si salario < 10 SMLMV',
  },
  total_provisions: {
    title: 'Provisiones',
    description: 'Acumulaciones mensuales para prestaciones sociales futuras.',
    formula: 'Vacaciones (4.17%) + Cesantias (8.33%) + Int. Cesantias (1%) + Prima (8.33%)',
    legalRef: 'Arts. 186, 249, 306 CST; Ley 52/1975',
  },

  // ═══════════════════════════════════════
  // LIQUIDACIONES ESPECIALES
  // ═══════════════════════════════════════
  prima: {
    title: 'Prima de Servicios',
    description: 'Prestacion social equivalente a un mes de salario por ano, pagada en dos cuotas semestrales.',
    formula: '(Salario + Aux. Transporte) x Dias Trabajados / 360',
    legalRef: 'Art. 306 CST',
    note: 'Pagos: 30 de junio (1er semestre) y 20 de diciembre (2do semestre)',
  },
  cesantias: {
    title: 'Cesantias',
    description: 'Prestacion social equivalente a un mes de salario por cada ano trabajado.',
    formula: '(Salario + Aux. Transporte) x Dias / 360',
    legalRef: 'Art. 249 CST',
    note: 'Se consignan al fondo de cesantias antes del 14 de febrero de cada ano',
  },
  cesantias_interest: {
    title: 'Intereses sobre Cesantias',
    description: 'Intereses del 12% anual sobre las cesantias.',
    formula: 'Cesantias x Dias x 12% / 360',
    legalRef: 'Ley 52/1975',
  },
  vacaciones_liquidation: {
    title: 'Liquidacion de Vacaciones',
    description: 'Pago por dias de vacaciones acumulados.',
    formula: '(Salario / 30) x Dias',
    legalRef: 'Art. 186 CST',
  },
  terminacion: {
    title: 'Liquidacion por Terminacion',
    description: 'Liquidacion final de contrato que incluye todas las prestaciones proporcionales.',
    formula: 'Salario Proporcional + Prima + Cesantias + Int. Cesantias + Vacaciones + Indemnizacion (si aplica)',
    legalRef: 'Arts. 249, 306, 186 CST',
  },
};

/** Colores por categoria de tooltip */
export const TOOLTIP_CATEGORY_COLORS = {
  accrued: 'bg-emerald-600',
  deductions: 'bg-red-600',
  employer: 'bg-blue-600',
  provisions: 'bg-purple-600',
  metadata: 'bg-slate-600',
  summary: 'bg-indigo-600',
  settlement: 'bg-amber-600',
} as const;
