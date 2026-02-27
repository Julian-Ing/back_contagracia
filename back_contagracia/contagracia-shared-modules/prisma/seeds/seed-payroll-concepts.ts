import { PrismaClient, PayrollConceptType } from '@prisma/client-master';

// Conceptos de nómina con sus cuentas contables y configuraciones
const PAYROLL_CONCEPTS = [
  { key: 'advances_minus', name: 'Anticipos Deducible', debit_account_code: '250505', credit_account_code: '238001', administrative_debit_account_code: '529900', is_percentage: false, default_value: '0.00', default_percentage: '0.00', is_array: false, is_legal: false, concept_type: 'ACCRUED' as PayrollConceptType },
  { key: 'advances_plus', name: 'Anticipos Devengado', debit_account_code: '510517', credit_account_code: '250505', administrative_debit_account_code: '520517', is_percentage: false, default_value: '0.00', default_percentage: '0.00', is_array: false, is_legal: false, concept_type: 'ACCRUED' as PayrollConceptType },
  { key: 'afc', name: 'AFC', debit_account_code: '250505', credit_account_code: '238040', administrative_debit_account_code: '529900', is_percentage: false, default_value: '0.00', default_percentage: '0.00', is_array: false, is_legal: false, concept_type: 'DEDUCTION' as PayrollConceptType },
  { key: 'aid', name: 'Auxilios', debit_account_code: '513030', credit_account_code: '250505', administrative_debit_account_code: '523030', is_percentage: false, default_value: '0.00', default_percentage: '0.00', is_array: true, is_legal: false, concept_type: 'ACCRUED' as PayrollConceptType },
  { key: 'arl', name: 'ARL', debit_account_code: '513005', credit_account_code: '237055', administrative_debit_account_code: '523005', is_percentage: true, default_value: '0.00', default_percentage: '0.52', is_array: false, is_legal: true, concept_type: 'PARAFISCAL' as PayrollConceptType },
  { key: 'bonuses', name: 'Bonificaciones', debit_account_code: '510576', credit_account_code: '250505', administrative_debit_account_code: '520576', is_percentage: false, default_value: '0.00', default_percentage: '0.00', is_array: true, is_legal: false, concept_type: 'ACCRUED' as PayrollConceptType },
  { key: 'ccf', name: 'Caja de Compensacion Familiar', debit_account_code: '513050', credit_account_code: '237060', administrative_debit_account_code: '523050', is_percentage: true, default_value: '0.00', default_percentage: '4.00', is_array: false, is_legal: true, concept_type: 'PARAFISCAL' as PayrollConceptType },
  { key: 'commissions', name: 'Comisiones', debit_account_code: '513025', credit_account_code: '250505', administrative_debit_account_code: '523025', is_percentage: false, default_value: '0.00', default_percentage: '0.00', is_array: true, is_legal: false, concept_type: 'ACCRUED' as PayrollConceptType },
  { key: 'common_vacation', name: 'Vacaciones Comunes', debit_account_code: '519900', credit_account_code: '250505', administrative_debit_account_code: '529900', is_percentage: true, default_value: '0.00', default_percentage: '0.00', is_array: true, is_legal: true, concept_type: 'ACCRUED' as PayrollConceptType },
  { key: 'compensations', name: 'Compensaciones', debit_account_code: '510582', credit_account_code: '250505', administrative_debit_account_code: '520582', is_percentage: false, default_value: '0.00', default_percentage: '0.00', is_array: true, is_legal: false, concept_type: 'ACCRUED' as PayrollConceptType },
  { key: 'cooperative', name: 'Cooperativa', debit_account_code: '250505', credit_account_code: '238065', administrative_debit_account_code: '529900', is_percentage: false, default_value: '0.00', default_percentage: '0.00', is_array: false, is_legal: false, concept_type: 'DEDUCTION' as PayrollConceptType },
  { key: 'debt', name: 'Deudas', debit_account_code: '250505', credit_account_code: '238085', administrative_debit_account_code: '529900', is_percentage: false, default_value: '0.00', default_percentage: '0.00', is_array: false, is_legal: false, concept_type: 'DEDUCTION' as PayrollConceptType },
  { key: 'education', name: 'Educacion', debit_account_code: '250505', credit_account_code: '238080', administrative_debit_account_code: '529900', is_percentage: false, default_value: '0.00', default_percentage: '0.00', is_array: false, is_legal: false, concept_type: 'DEDUCTION' as PayrollConceptType },
  { key: 'employer_health', name: 'Aporte Empleador Salud', debit_account_code: '512560', credit_account_code: '237035', administrative_debit_account_code: '522560', is_percentage: true, default_value: '0.00', default_percentage: '8.50', is_array: false, is_legal: true, concept_type: 'PARAFISCAL' as PayrollConceptType },
  { key: 'employer_pension', name: 'Aporte Empleador Pension', debit_account_code: '512580', credit_account_code: '237040', administrative_debit_account_code: '522580', is_percentage: true, default_value: '0.00', default_percentage: '12.00', is_array: false, is_legal: true, concept_type: 'PARAFISCAL' as PayrollConceptType },
  { key: 'endowment', name: 'Dotacion', debit_account_code: '513040', credit_account_code: '250505', administrative_debit_account_code: '523040', is_percentage: false, default_value: '0.00', default_percentage: '0.00', is_array: false, is_legal: true, concept_type: 'ACCRUED' as PayrollConceptType },
  { key: 'epctv_bonuses', name: 'Bonos EPCTV', debit_account_code: '510514', credit_account_code: '250505', administrative_debit_account_code: '520514', is_percentage: false, default_value: '0.00', default_percentage: '0.00', is_array: true, is_legal: false, concept_type: 'ACCRUED' as PayrollConceptType },
  { key: 'eps_deduction', name: 'Deduccion Salud', debit_account_code: '250505', credit_account_code: '237035', administrative_debit_account_code: '529900', is_percentage: true, default_value: '0.00', default_percentage: '4.00', is_array: false, is_legal: true, concept_type: 'DEDUCTION' as PayrollConceptType },
  { key: 'fondosp_deduction_SP', name: 'Fondo de Solidaridad Pensional', debit_account_code: '250505', credit_account_code: '238099', administrative_debit_account_code: '529900', is_percentage: true, default_value: '0.00', default_percentage: '1.00', is_array: false, is_legal: true, concept_type: 'DEDUCTION' as PayrollConceptType },
  { key: 'fondosp_deduction_sub', name: 'Fondo Subsistencia', debit_account_code: '250505', credit_account_code: '238099', administrative_debit_account_code: '529900', is_percentage: false, default_value: '0.00', default_percentage: '0.00', is_array: false, is_legal: false, concept_type: 'ACCRUED' as PayrollConceptType },
  { key: 'HEDDFs', name: 'Horas Extras Diurnas Dominicales/Festivas', debit_account_code: '510529', credit_account_code: '250505', administrative_debit_account_code: '520529', is_percentage: true, default_value: '0.00', default_percentage: '100.00', is_array: true, is_legal: true, concept_type: 'ACCRUED' as PayrollConceptType },
  { key: 'HEDs', name: 'Horas Extras Diurnas', debit_account_code: '512590', credit_account_code: '250505', administrative_debit_account_code: '522590', is_percentage: true, default_value: '0.00', default_percentage: '25.00', is_array: true, is_legal: true, concept_type: 'ACCRUED' as PayrollConceptType },
  { key: 'HENDFs', name: 'Horas Extras Nocturnas Dominicales/Festivas', debit_account_code: '519900', credit_account_code: '250505', administrative_debit_account_code: '529900', is_percentage: true, default_value: '0.00', default_percentage: '150.00', is_array: true, is_legal: true, concept_type: 'ACCRUED' as PayrollConceptType },
  { key: 'HENs', name: 'Horas Extras Nocturnas', debit_account_code: '513045', credit_account_code: '250505', administrative_debit_account_code: '523045', is_percentage: true, default_value: '0.00', default_percentage: '75.00', is_array: true, is_legal: true, concept_type: 'ACCRUED' as PayrollConceptType },
  { key: 'HRDDFs', name: 'Recargo Diurno Dominical/Festivo', debit_account_code: '519900', credit_account_code: '250505', administrative_debit_account_code: '529900', is_percentage: true, default_value: '0.00', default_percentage: '75.00', is_array: true, is_legal: true, concept_type: 'ACCRUED' as PayrollConceptType },
  { key: 'HRNDFs', name: 'Recargo Nocturno Dominical/Festivo', debit_account_code: '519900', credit_account_code: '250505', administrative_debit_account_code: '529900', is_percentage: true, default_value: '0.00', default_percentage: '110.00', is_array: true, is_legal: true, concept_type: 'ACCRUED' as PayrollConceptType },
  { key: 'HRNs', name: 'Recargo Nocturno', debit_account_code: '510529', credit_account_code: '250505', administrative_debit_account_code: '520529', is_percentage: true, default_value: '0.00', default_percentage: '35.00', is_array: true, is_legal: true, concept_type: 'ACCRUED' as PayrollConceptType },
  { key: 'icbf', name: 'ICBF', debit_account_code: '143501', credit_account_code: '237045', administrative_debit_account_code: '522540', is_percentage: true, default_value: '0.00', default_percentage: '3.00', is_array: false, is_legal: true, concept_type: 'PARAFISCAL' as PayrollConceptType },
  { key: 'labor_union', name: 'Sindicatos', debit_account_code: '250505', credit_account_code: '238060', administrative_debit_account_code: '529900', is_percentage: false, default_value: '0.00', default_percentage: '0.00', is_array: true, is_legal: false, concept_type: 'DEDUCTION' as PayrollConceptType },
  { key: 'legal_strike', name: 'Huelga Legal', debit_account_code: '510599', credit_account_code: '250505', administrative_debit_account_code: '520599', is_percentage: false, default_value: '0.00', default_percentage: '0.00', is_array: true, is_legal: true, concept_type: 'ACCRUED' as PayrollConceptType },
  { key: 'maternity_leave', name: 'Licencia de Maternidad', debit_account_code: '510597', credit_account_code: '250505', administrative_debit_account_code: '520597', is_percentage: false, default_value: '0.00', default_percentage: '0.00', is_array: true, is_legal: false, concept_type: 'ACCRUED' as PayrollConceptType },
  { key: 'non_paid_leave', name: 'Licencias No Remuneradas', debit_account_code: '510593', credit_account_code: '250505', administrative_debit_account_code: '520593', is_percentage: false, default_value: '0.00', default_percentage: '0.00', is_array: true, is_legal: false, concept_type: 'ACCRUED' as PayrollConceptType },
  { key: 'non_salary_viatics', name: 'Viaticos No Salariales', debit_account_code: '51550502', credit_account_code: '250505', administrative_debit_account_code: '52959505', is_percentage: false, default_value: '0.00', default_percentage: '0.00', is_array: false, is_legal: false, concept_type: 'ACCRUED' as PayrollConceptType },
  { key: 'orders', name: 'Libranzas', debit_account_code: '250505', credit_account_code: '238050', administrative_debit_account_code: '529900', is_percentage: false, default_value: '0.00', default_percentage: '0.00', is_array: true, is_legal: false, concept_type: 'DEDUCTION' as PayrollConceptType },
  { key: 'other_concepts', name: 'Otros Conceptos', debit_account_code: '519900', credit_account_code: '250505', administrative_debit_account_code: '529900', is_percentage: false, default_value: '0.00', default_percentage: '0.00', is_array: true, is_legal: false, concept_type: 'ACCRUED' as PayrollConceptType },
  { key: 'other_deductions', name: 'Otras Deducciones', debit_account_code: '250505', credit_account_code: '238099', administrative_debit_account_code: '529900', is_percentage: false, default_value: '0.00', default_percentage: '0.00', is_array: true, is_legal: false, concept_type: 'DEDUCTION' as PayrollConceptType },
  { key: 'paid_leave', name: 'Licencias Remuneradas', debit_account_code: '510589', credit_account_code: '250505', administrative_debit_account_code: '520589', is_percentage: false, default_value: '0.00', default_percentage: '0.00', is_array: true, is_legal: false, concept_type: 'ACCRUED' as PayrollConceptType },
  { key: 'paid_vacation', name: 'Vacaciones Compensadas', debit_account_code: '510587', credit_account_code: '250505', administrative_debit_account_code: '520587', is_percentage: false, default_value: '0.00', default_percentage: '0.00', is_array: true, is_legal: false, concept_type: 'ACCRUED' as PayrollConceptType },
  { key: 'pension_deduction', name: 'Deduccion de Pension', debit_account_code: '250505', credit_account_code: '237040', administrative_debit_account_code: '529900', is_percentage: true, default_value: '0.00', default_percentage: '4.00', is_array: false, is_legal: false, concept_type: 'DEDUCTION' as PayrollConceptType },
  { key: 'refund', name: 'Reintegros', debit_account_code: '250505', credit_account_code: '238098', administrative_debit_account_code: '529900', is_percentage: false, default_value: '0.00', default_percentage: '0.00', is_array: false, is_legal: false, concept_type: 'DEDUCTION' as PayrollConceptType },
  { key: 'salary', name: 'Salario', debit_account_code: '510505', credit_account_code: '250505', administrative_debit_account_code: '520505', is_percentage: false, default_value: '0.00', default_percentage: '0.00', is_array: false, is_legal: true, concept_type: 'ACCRUED' as PayrollConceptType },
  { key: 'salary_viatics', name: 'Viaticos Salariales', debit_account_code: '51550502', credit_account_code: '250505', administrative_debit_account_code: '52959505', is_percentage: false, default_value: '0.00', default_percentage: '0.00', is_array: false, is_legal: false, concept_type: 'ACCRUED' as PayrollConceptType },
  { key: 'sanctions', name: 'Sanciones', debit_account_code: '250505', credit_account_code: '238004', administrative_debit_account_code: '529900', is_percentage: false, default_value: '0.00', default_percentage: '0.00', is_array: true, is_legal: false, concept_type: 'DEDUCTION' as PayrollConceptType },
  { key: 'sena', name: 'SENA', debit_account_code: '512545', credit_account_code: '237050', administrative_debit_account_code: '522545', is_percentage: true, default_value: '0.00', default_percentage: '2.00', is_array: false, is_legal: true, concept_type: 'PARAFISCAL' as PayrollConceptType },
  { key: 'service_bonus', name: 'Prima de Servicios', debit_account_code: '513060', credit_account_code: '250505', administrative_debit_account_code: '523060', is_percentage: true, default_value: '0.00', default_percentage: '0.00', is_array: true, is_legal: true, concept_type: 'ACCRUED' as PayrollConceptType },
  { key: 'service_bonus_provision', name: 'Provision Prima de Servicios', debit_account_code: '519940', credit_account_code: '279999', administrative_debit_account_code: '529940', is_percentage: true, default_value: '0.00', default_percentage: '8.33', is_array: false, is_legal: true, concept_type: 'PROVISION' as PayrollConceptType },
  { key: 'severance', name: 'Cesantias', debit_account_code: '510600', credit_account_code: '250505', administrative_debit_account_code: '520600', is_percentage: true, default_value: '0.00', default_percentage: '0.00', is_array: true, is_legal: true, concept_type: 'ACCRUED' as PayrollConceptType },
  { key: 'severance_interest_provision', name: 'Provision Intereses de Cesantias', debit_account_code: '519950', credit_account_code: '279999', administrative_debit_account_code: '529950', is_percentage: true, default_value: '0.00', default_percentage: '1.00', is_array: false, is_legal: true, concept_type: 'PROVISION' as PayrollConceptType },
  { key: 'severance_provision', name: 'Provision Cesantias', debit_account_code: '519930', credit_account_code: '270505', administrative_debit_account_code: '529930', is_percentage: true, default_value: '0.00', default_percentage: '8.33', is_array: false, is_legal: true, concept_type: 'PROVISION' as PayrollConceptType },
  { key: 'supplementary_plan', name: 'Plan Complementario', debit_account_code: '250505', credit_account_code: '238075', administrative_debit_account_code: '529900', is_percentage: false, default_value: '0.00', default_percentage: '0.00', is_array: false, is_legal: false, concept_type: 'DEDUCTION' as PayrollConceptType },
  { key: 'sustenance_support', name: 'Auxilio Alimentacion', debit_account_code: '510574', credit_account_code: '250505', administrative_debit_account_code: '520574', is_percentage: false, default_value: '0.00', default_percentage: '0.00', is_array: false, is_legal: false, concept_type: 'ACCRUED' as PayrollConceptType },
  { key: 'tax_liens', name: 'Gravamenes', debit_account_code: '250505', credit_account_code: '238070', administrative_debit_account_code: '529900', is_percentage: false, default_value: '0.00', default_percentage: '0.00', is_array: false, is_legal: false, concept_type: 'DEDUCTION' as PayrollConceptType },
  { key: 'telecommuting', name: 'Teletrabajo', debit_account_code: '512575', credit_account_code: '250505', administrative_debit_account_code: '522575', is_percentage: false, default_value: '0.00', default_percentage: '0.00', is_array: false, is_legal: false, concept_type: 'ACCRUED' as PayrollConceptType },
  { key: 'third_party_payments', name: 'Pagos de Terceros', debit_account_code: '250505', credit_account_code: '238090', administrative_debit_account_code: '529900', is_percentage: false, default_value: '0.00', default_percentage: '0.00', is_array: true, is_legal: false, concept_type: 'ACCRUED' as PayrollConceptType },
  { key: 'transportation_allowance', name: 'Auxilio de Transporte', debit_account_code: '513065', credit_account_code: '250505', administrative_debit_account_code: '523065', is_percentage: false, default_value: '0.00', default_percentage: '0.00', is_array: false, is_legal: true, concept_type: 'ACCRUED' as PayrollConceptType },
  { key: 'vacation_provision', name: 'Provision Vacaciones', debit_account_code: '519920', credit_account_code: '270515', administrative_debit_account_code: '529920', is_percentage: true, default_value: '0.00', default_percentage: '4.17', is_array: false, is_legal: true, concept_type: 'PROVISION' as PayrollConceptType },
  { key: 'voluntary_pension', name: 'Pension Voluntaria', debit_account_code: '250505', credit_account_code: '238020', administrative_debit_account_code: '529900', is_percentage: false, default_value: '0.00', default_percentage: '0.00', is_array: false, is_legal: false, concept_type: 'DEDUCTION' as PayrollConceptType },
  { key: 'withdrawal_bonus', name: 'Bonificacion de Retiro', debit_account_code: '512570', credit_account_code: '250505', administrative_debit_account_code: '522570', is_percentage: false, default_value: '0.00', default_percentage: '0.00', is_array: false, is_legal: false, concept_type: 'ACCRUED' as PayrollConceptType },
  { key: 'withholding_at_source', name: 'Retencion en la Fuente', debit_account_code: '250505', credit_account_code: '236555', administrative_debit_account_code: '529900', is_percentage: false, default_value: '0.00', default_percentage: '0.00', is_array: false, is_legal: true, concept_type: 'DEDUCTION' as PayrollConceptType },
  { key: 'work_disabilities', name: 'Incapacidades', debit_account_code: '513075', credit_account_code: '250505', administrative_debit_account_code: '523075', is_percentage: false, default_value: '0.00', default_percentage: '0.00', is_array: true, is_legal: false, concept_type: 'ACCRUED' as PayrollConceptType },
  { key: 'worked_days', name: 'Dias Trabajados', debit_account_code: '510505', credit_account_code: '250505', administrative_debit_account_code: '520505', is_percentage: false, default_value: '0.00', default_percentage: '0.00', is_array: false, is_legal: true, concept_type: 'ACCRUED' as PayrollConceptType },
];

export async function seedPayrollConcepts(prisma: PrismaClient) {
  console.log('Seeding Payroll Concepts...');

  for (const concept of PAYROLL_CONCEPTS) {
    await prisma.payrollConcept.upsert({
      where: { key: concept.key },
      update: {
        name: concept.name,
        debit_account_code: concept.debit_account_code,
        credit_account_code: concept.credit_account_code,
        administrative_debit_account_code: concept.administrative_debit_account_code,
        default_value: concept.default_value,
        default_percentage: concept.default_percentage,
        is_percentage: concept.is_percentage,
        is_array: concept.is_array,
        is_legal: concept.is_legal,
        concept_type: concept.concept_type,
      },
      create: {
        key: concept.key,
        name: concept.name,
        debit_account_code: concept.debit_account_code,
        credit_account_code: concept.credit_account_code,
        administrative_debit_account_code: concept.administrative_debit_account_code,
        default_value: concept.default_value,
        default_percentage: concept.default_percentage,
        is_percentage: concept.is_percentage,
        is_array: concept.is_array,
        is_legal: concept.is_legal,
        concept_type: concept.concept_type,
      },
    });
  }

  console.log(`   ${PAYROLL_CONCEPTS.length} conceptos de nómina creados`);
}

// Exportar datos para seed-all-tenants
export { PAYROLL_CONCEPTS };
