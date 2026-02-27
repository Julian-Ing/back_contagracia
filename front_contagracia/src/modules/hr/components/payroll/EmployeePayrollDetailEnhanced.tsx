'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Badge } from '@/shared/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { FormattedNumber } from '@/shared/components/ui/formatted-number';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/shared/components/ui/collapsible';
import { User, ChevronDown, AlertTriangle, Info } from 'lucide-react';
import { TooltipProvider } from '@/shared/components/ui/tooltip';
import { PayrollTooltip } from './PayrollTooltip';
import { SETTLEMENT_STATUS_COLORS, SETTLEMENT_STATUS_LABELS } from '../../types';
import type { PayrollSettlementDetail as DetailType, SettlementStatus } from '../../types';

/** Mapping of TypeWorker IDs to labels (from seed-catalogs) */
const WORKER_TYPE_LABELS: Record<string, string> = {
  '1': 'Dependiente',
  '2': 'Servicio doméstico',
  '3': 'Madre comunitaria',
  '4': 'Aprendiz SENA (Lectiva)',
  '5': 'Func. público sin tope IBC',
  '6': 'Aprendiz SENA (Productiva)',
  '7': 'Estudiante postgrado salud',
  '8': 'Profesor establ. particular',
  '9': 'Estudiante (solo ARL)',
  '10': 'Régimen especial salud',
  '11': 'Cooperado/pre-cooperativa',
  '12': 'Depend. SGP aportes patronales',
  '13': 'Tiempo parcial',
  '14': 'Pre-pensionado entidad liquidación',
  '15': 'Pre-pensionado aporte vol. salud',
  '16': 'Estudiante prácticas sector público',
};

/** Mapping of SubTypeWorker IDs to labels */
const WORKER_SUBTYPE_LABELS: Record<string, string> = {
  '1': 'No Aplica',
  '2': 'Pensionado vejez activo (dep.)',
  '3': 'Pensionado vejez activo (indep.)',
  '4': 'No obligado pensión por edad',
  '5': 'Requisitos cumplidos pensión',
  '6': 'Indemnización sustitutiva',
  '7': 'Régimen exceptuado pensiones',
  '8': 'Mesada > 25 SMLMV',
  '9': 'Residente exterior afil. voluntario',
  '10': 'Conductor taxi Dec. 1047',
  '11': 'Conductor taxi sin pensión',
};

interface EmployeePayrollDetailEnhancedProps {
  detail: DetailType;
  open: boolean;
  onClose: () => void;
}

type ConceptCategory = 'Devengado' | 'Provision' | 'Deduccion' | 'Parafiscal';

interface ConceptDef {
  name: string;
  code: string;
  category: ConceptCategory;
  getValue: (data: any) => number;
  isLegal?: boolean;
  /** Always show even if value is 0 */
  alwaysShow?: boolean;
}

const BADGE_STYLES: Record<ConceptCategory, string> = {
  Devengado: 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700',
  Provision: 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700',
  Deduccion: 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400 border-red-300 dark:border-red-700',
  Parafiscal: 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-400 border-purple-300 dark:border-purple-700',
};

// Helper to sum array fields
function sumArray(arr: any[] | undefined, ...fields: string[]): number {
  if (!arr?.length) return 0;
  return arr.reduce((sum: number, item: any) => {
    let val = 0;
    for (const f of fields) {
      val += Number(item[f]) || 0;
    }
    return sum + val;
  }, 0);
}

// ── Concept definitions separated by section ──

const ACCRUED_CONCEPTS: ConceptDef[] = [
  { name: 'Salario', code: 'salary', category: 'Devengado', isLegal: true, alwaysShow: true, getValue: (d) => d.accrued?.salary ?? 0 },
  { name: 'Dias Trabajados', code: 'worked_days', category: 'Devengado', isLegal: true, alwaysShow: true, getValue: (d) => d.accrued?.worked_days ?? 0 },
  { name: 'Auxilio de Transporte', code: 'transportation_allowance', category: 'Devengado', isLegal: true, getValue: (d) => d.accrued?.transportation_allowance ?? 0 },
  { name: 'Bonificaciones', code: 'bonuses', category: 'Devengado', getValue: (d) => sumArray(d.accrued?.bonuses, 'salary_bonus', 'non_salary_bonus') },
  { name: 'Auxilios', code: 'aid', category: 'Devengado', getValue: (d) => sumArray(d.accrued?.aid, 'salary_assistance', 'non_salary_assistance') },
  { name: 'Comisiones', code: 'commissions', category: 'Devengado', getValue: (d) => sumArray(d.accrued?.commissions, 'commission') },
  { name: 'Compensaciones', code: 'compensations', category: 'Devengado', getValue: (d) => sumArray(d.accrued?.compensations, 'ordinary', 'extraordinary') },
  { name: 'Bonos EPCTV', code: 'epctv_bonuses', category: 'Devengado', getValue: (d) => sumArray(d.accrued?.epctv_bonuses, 'payment_s', 'payment_ns') },
  { name: 'Pagos de Terceros', code: 'third_party_payments', category: 'Devengado', getValue: (d) => sumArray(d.accrued?.third_party_payments, 'payment') },
  { name: 'Auxilio Alimentacion', code: 'sustenance_support', category: 'Devengado', getValue: (d) => d.accrued?.sustenance_support ?? 0 },
  { name: 'Teletrabajo', code: 'telecommuting', category: 'Devengado', getValue: (d) => d.accrued?.telecommuting ?? 0 },
  { name: 'Bonificacion de Retiro', code: 'withdrawal_bonus', category: 'Devengado', getValue: (d) => d.accrued?.withdrawal_bonus ?? 0 },
  { name: 'Viaticos Salariales', code: 'salary_viatics', category: 'Devengado', getValue: (d) => d.accrued?.salary_viatics ?? 0 },
  { name: 'Viaticos No Salariales', code: 'non_salary_viatics', category: 'Devengado', getValue: (d) => d.accrued?.non_salary_viatics ?? 0 },
  { name: 'Dotacion', code: 'endowment', category: 'Devengado', isLegal: true, getValue: (d) => d.accrued?.endowment ?? 0 },
  { name: 'Indemnizacion por Retiro', code: 'indemnification', category: 'Devengado', getValue: (d) => d.accrued?.indemnification ?? 0 },
  { name: 'Otros Conceptos', code: 'other_concepts', category: 'Devengado', getValue: (d) => sumArray(d.accrued?.other_concepts, 'salary_concept', 'non_salary_concept', 'amount') },
  // Overtime
  { name: 'Horas Extras Diurnas', code: 'HEDs', category: 'Devengado', isLegal: true, getValue: (d) => sumArray(d.accrued?.HEDs, 'payment') },
  { name: 'Horas Extras Nocturnas', code: 'HENs', category: 'Devengado', isLegal: true, getValue: (d) => sumArray(d.accrued?.HENs, 'payment') },
  { name: 'Recargo Nocturno', code: 'HRNs', category: 'Devengado', isLegal: true, getValue: (d) => sumArray(d.accrued?.HRNs, 'payment') },
  { name: 'Horas Extras Diurnas Dom/Fest', code: 'HEDDFs', category: 'Devengado', isLegal: true, getValue: (d) => sumArray(d.accrued?.HEDDFs, 'payment') },
  { name: 'Horas Extras Nocturnas Dom/Fest', code: 'HENDFs', category: 'Devengado', isLegal: true, getValue: (d) => sumArray(d.accrued?.HENDFs, 'payment') },
  { name: 'Recargo Diurno Dom/Fest', code: 'HRDDFs', category: 'Devengado', isLegal: true, getValue: (d) => sumArray(d.accrued?.HRDDFs, 'payment') },
  { name: 'Recargo Nocturno Dom/Fest', code: 'HRNDFs', category: 'Devengado', isLegal: true, getValue: (d) => sumArray(d.accrued?.HRNDFs, 'payment') },
  // Leaves
  { name: 'Vacaciones Comunes', code: 'common_vacation', category: 'Devengado', isLegal: true, getValue: (d) => sumArray(d.accrued?.common_vacation, 'payment') },
  { name: 'Vacaciones Compensadas', code: 'paid_vacation', category: 'Devengado', getValue: (d) => sumArray(d.accrued?.paid_vacation, 'payment') },
  { name: 'Incapacidades', code: 'work_disabilities', category: 'Devengado', getValue: (d) => sumArray(d.accrued?.work_disabilities, 'payment') },
  { name: 'Licencias Remuneradas', code: 'paid_leave', category: 'Devengado', getValue: (d) => sumArray(d.accrued?.paid_leave, 'payment') },
  { name: 'Licencia de Maternidad', code: 'maternity_leave', category: 'Devengado', getValue: (d) => sumArray(d.accrued?.maternity_leave, 'payment') },
  // Liquidation benefits (accrued)
  { name: 'Prima de Servicios', code: 'service_bonus', category: 'Devengado', isLegal: true, getValue: (d) => sumArray(d.accrued?.service_bonus, 'payment', 'paymentNS') },
  { name: 'Cesantias', code: 'severance', category: 'Devengado', isLegal: true, getValue: (d) => sumArray(d.accrued?.severance, 'payment', 'interest_payment') },
];

const PROVISION_CONCEPTS: ConceptDef[] = [
  { name: 'Provision Vacaciones', code: 'vacation_provision', category: 'Provision', isLegal: true, getValue: (d) => d.provisions?.vacation_provision ?? 0 },
  { name: 'Provision Cesantias', code: 'severance_provision', category: 'Provision', isLegal: true, getValue: (d) => d.provisions?.severance_provision ?? 0 },
  { name: 'Provision Intereses de Cesantias', code: 'severance_interest_provision', category: 'Provision', isLegal: true, getValue: (d) => d.provisions?.severance_interest_provision ?? 0 },
  { name: 'Provision Prima de Servicios', code: 'service_bonus_provision', category: 'Provision', isLegal: true, getValue: (d) => d.provisions?.service_bonus_provision ?? 0 },
];

const DEDUCTION_CONCEPTS: ConceptDef[] = [
  { name: 'Deduccion Salud (EPS)', code: 'eps_deduction', category: 'Deduccion', isLegal: true, alwaysShow: true, getValue: (d) => d.deductions?.eps_deduction ?? 0 },
  { name: 'Deduccion de Pension', code: 'pension_deduction', category: 'Deduccion', isLegal: true, alwaysShow: true, getValue: (d) => d.deductions?.pension_deduction ?? 0 },
  { name: 'Fondo de Solidaridad Pensional', code: 'fondosp_deduction_SP', category: 'Deduccion', isLegal: true, getValue: (d) => d.deductions?.fondosp_deduction_SP ?? 0 },
  { name: 'Retencion en la Fuente', code: 'withholding_at_source', category: 'Deduccion', isLegal: true, getValue: (d) => d.deductions?.withholding_at_source ?? 0 },
  { name: 'Anticipos', code: 'advances', category: 'Deduccion', getValue: (d) => sumArray(d.deductions?.advances, 'advance') },
  { name: 'AFC', code: 'afc', category: 'Deduccion', getValue: (d) => d.deductions?.afc ?? 0 },
  { name: 'Cooperativa', code: 'cooperative', category: 'Deduccion', getValue: (d) => d.deductions?.cooperative ?? 0 },
  { name: 'Deudas', code: 'debt', category: 'Deduccion', getValue: (d) => d.deductions?.debt ?? 0 },
  { name: 'Educacion', code: 'education', category: 'Deduccion', getValue: (d) => d.deductions?.education ?? 0 },
  { name: 'Gravamenes', code: 'tax_liens', category: 'Deduccion', getValue: (d) => d.deductions?.tax_liens ?? 0 },
  { name: 'Libranzas', code: 'orders', category: 'Deduccion', getValue: (d) => sumArray(d.deductions?.orders, 'deduction') },
  { name: 'Otras Deducciones', code: 'other_deductions', category: 'Deduccion', getValue: (d) => {
    const arr = d.deductions?.other_deductions;
    if (!arr?.length) return 0;
    return arr.reduce((s: number, x: any) => s + (Number(x.other_deduction) || Number(x.amount) || 0), 0);
  }},
  { name: 'Pagos de Terceros', code: 'third_party_payments_ded', category: 'Deduccion', getValue: (d) => sumArray(d.deductions?.third_party_payments, 'payment') },
  { name: 'Pension Voluntaria', code: 'voluntary_pension', category: 'Deduccion', getValue: (d) => d.deductions?.voluntary_pension ?? 0 },
  { name: 'Plan Complementario', code: 'supplementary_plan', category: 'Deduccion', getValue: (d) => d.deductions?.supplementary_plan ?? 0 },
  { name: 'Reintegros', code: 'refund', category: 'Deduccion', getValue: (d) => d.deductions?.refund ?? 0 },
  { name: 'Sanciones', code: 'sanctions', category: 'Deduccion', getValue: (d) => sumArray(d.deductions?.sanctions, 'sanction_public', 'sanction_private') },
  { name: 'Sindicatos', code: 'labor_union', category: 'Deduccion', getValue: (d) => sumArray(d.deductions?.labor_union, 'deduction') },
];

const PARAFISCAL_CONCEPTS: ConceptDef[] = [
  { name: 'Aporte Empleador Salud', code: 'employer_health', category: 'Parafiscal', isLegal: true, alwaysShow: true, getValue: (d) => d.employer_contributions?.employer_health ?? 0 },
  { name: 'Aporte Empleador Pension', code: 'employer_pension', category: 'Parafiscal', isLegal: true, alwaysShow: true, getValue: (d) => d.employer_contributions?.employer_pension ?? 0 },
  { name: 'ARL', code: 'arl', category: 'Parafiscal', isLegal: true, alwaysShow: true, getValue: (d) => d.employer_contributions?.arl ?? 0 },
  { name: 'Caja de Compensacion Familiar', code: 'ccf', category: 'Parafiscal', isLegal: true, alwaysShow: true, getValue: (d) => d.employer_contributions?.ccf ?? 0 },
  { name: 'ICBF', code: 'icbf', category: 'Parafiscal', isLegal: true, alwaysShow: true, getValue: (d) => d.employer_contributions?.icbf ?? 0 },
  { name: 'SENA', code: 'sena', category: 'Parafiscal', isLegal: true, alwaysShow: true, getValue: (d) => d.employer_contributions?.sena ?? 0 },
];

/** Filters concepts: show those with value != 0 or marked as alwaysShow */
function filterConcepts(concepts: ConceptDef[], data: any): ConceptDef[] {
  return concepts.filter((c) => c.alwaysShow || c.getValue(data) !== 0);
}

function ConceptRow({ concept, data }: { concept: ConceptDef; data: any }) {
  const value = concept.getValue(data);
  const isDays = concept.code === 'worked_days';

  return (
    <div className="px-4 py-2.5 flex items-center justify-between transition-colors hover:bg-muted/30 border-b border-border last:border-b-0">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold">{concept.name}</span>
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${BADGE_STYLES[concept.category]}`}>
              {concept.category}
            </Badge>
            {concept.isLegal && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-700">
                Legal
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground font-mono">
            Codigo: {concept.code}
          </p>
        </div>
      </div>
      <span className="text-sm font-semibold ml-4 shrink-0">
        {isDays ? (
          value
        ) : (
          <FormattedNumber value={value} type="currency" />
        )}
      </span>
    </div>
  );
}

function SectionHeader({
  color,
  label,
  count,
  total,
  tooltip,
}: {
  color: string;
  label: string;
  count: number;
  total?: number;
  tooltip?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full bg-${color}-500 dark:bg-${color}-400`} />
        <span className={`flex items-center gap-1 text-sm font-semibold text-${color}-700 dark:text-${color}-400`}>
          {label} ({count})
          {tooltip}
        </span>
      </div>
      {total !== undefined && (
        <FormattedNumber
          value={total}
          type="currency"
          className={`text-sm font-bold text-${color}-700 dark:text-${color}-400`}
        />
      )}
    </div>
  );
}

export function EmployeePayrollDetailEnhanced({ detail, open, onClose }: EmployeePayrollDetailEnhancedProps) {
  const data = detail.payroll_data;
  const [metadataOpen, setMetadataOpen] = useState(false);

  // Filter concepts to only show non-zero or always-show
  const visibleAccrued = data ? filterConcepts(ACCRUED_CONCEPTS, data) : [];
  const visibleProvisions = data ? filterConcepts(PROVISION_CONCEPTS, data) : [];
  const visibleDeductions = data ? filterConcepts(DEDUCTION_CONCEPTS, data) : [];
  const visibleParafiscals = data ? filterConcepts(PARAFISCAL_CONCEPTS, data) : [];

  const totalVisible = visibleAccrued.length + visibleProvisions.length + visibleDeductions.length + visibleParafiscals.length;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
      <TooltipProvider delayDuration={200}>
        {/* Header */}
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-3">
            <User className="h-6 w-6 text-muted-foreground flex-shrink-0" />
            <div className="flex flex-col">
              <span className="text-lg font-bold">{detail.employee_name}</span>
              <span className="text-xs text-muted-foreground font-normal">
                {detail.employee_document ?? '-'} · {detail.employee_position ?? '-'}
              </span>
            </div>
            <Badge className={`ml-auto ${SETTLEMENT_STATUS_COLORS[detail.status as SettlementStatus]}`}>
              {SETTLEMENT_STATUS_LABELS[detail.status as SettlementStatus] ?? detail.status}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Error message (top, prominent) */}
        {detail.error_message && (
          <div className="flex items-start gap-3 p-3 rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/30">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-700 dark:text-red-400">Error en el calculo</p>
              <p className="text-sm text-red-600 dark:text-red-400 mt-0.5">{detail.error_message}</p>
            </div>
          </div>
        )}

        {/* Summary mini-cards */}
        {data && (
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            <div className="p-2.5 rounded-lg border bg-muted/30">
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Salario Base<PayrollTooltip conceptKey="salary" color="bg-emerald-600" /></span>
              <FormattedNumber value={detail.employee_base_salary ?? 0} type="currency" className="text-sm font-bold block" />
            </div>
            <div className="p-2.5 rounded-lg border border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30">
              <span className="flex items-center gap-1 text-[10px] text-green-700 dark:text-green-400 font-medium uppercase tracking-wide">Devengado<PayrollTooltip conceptKey="total_accrued" color="bg-emerald-600" /></span>
              <FormattedNumber value={data.accrued?.accrued_total ?? 0} type="currency" className="text-sm font-bold text-green-700 dark:text-green-400 block" />
            </div>
            <div className="p-2.5 rounded-lg border border-red-200 dark:border-red-800 bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/30">
              <span className="flex items-center gap-1 text-[10px] text-red-700 dark:text-red-400 font-medium uppercase tracking-wide">Deducciones<PayrollTooltip conceptKey="total_deductions" color="bg-red-600" /></span>
              <FormattedNumber value={data.deductions?.deductions_total ?? 0} type="currency" className="text-sm font-bold text-red-700 dark:text-red-400 block" />
            </div>
            <div className="p-2.5 rounded-lg border border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30">
              <span className="flex items-center gap-1 text-[10px] text-amber-700 dark:text-amber-400 font-medium uppercase tracking-wide">Provisiones<PayrollTooltip conceptKey="total_provisions" color="bg-purple-600" /></span>
              <FormattedNumber value={data.provisions?.total_provisions ?? 0} type="currency" className="text-sm font-bold text-amber-700 dark:text-amber-400 block" />
            </div>
            <div className="p-2.5 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-950/30">
              <span className="flex items-center gap-1 text-[10px] text-indigo-700 dark:text-indigo-400 font-medium uppercase tracking-wide">Neto a Pagar<PayrollTooltip conceptKey="net_salary" color="bg-indigo-600" /></span>
              <FormattedNumber value={detail.net_salary ?? 0} type="currency" className="text-sm font-bold text-indigo-700 dark:text-indigo-400 block" />
            </div>
            <div className="p-2.5 rounded-lg border bg-muted/30">
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Horas Extras</p>
              <p className="text-sm font-bold">
                {(() => {
                  const ot = ['HEDs', 'HENs', 'HRNs', 'HEDDFs', 'HENDFs', 'HRDDFs', 'HRNDFs'];
                  let total = 0;
                  for (const k of ot) total += ((data.accrued as any)?.[k]?.length ?? 0);
                  return total;
                })()}h
              </p>
            </div>
          </div>
        )}

        {data ? (
          <div className="space-y-4">
            {/* Title */}
            <h4 className="text-sm font-semibold text-foreground">
              Conceptos Aplicados ({totalVisible})
            </h4>

            {/* ── Devengados ── */}
            {visibleAccrued.length > 0 && (
              <div>
                <SectionHeader
                  color="green"
                  label="Devengados"
                  count={visibleAccrued.length}
                  total={data.accrued?.accrued_total ?? 0}
                  tooltip={<PayrollTooltip conceptKey="total_accrued" color="bg-emerald-600" />}
                />
                <div className="border border-green-200 dark:border-green-800 rounded-lg overflow-hidden bg-green-50/30 dark:bg-green-950/10">
                  {visibleAccrued.map((concept) => (
                    <ConceptRow key={concept.code} concept={concept} data={data} />
                  ))}
                </div>
              </div>
            )}

            {/* ── Prestaciones Sociales (Provisions) ── */}
            {visibleProvisions.length > 0 && (
              <div>
                <SectionHeader
                  color="amber"
                  label="Prestaciones Sociales"
                  count={visibleProvisions.length}
                  total={data.provisions?.total_provisions ?? 0}
                  tooltip={<PayrollTooltip conceptKey="total_provisions" color="bg-purple-600" />}
                />
                <div className="p-2 mb-1">
                  <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/20 rounded p-2">
                    Provisiones mensuales para prestaciones sociales del empleado.
                  </p>
                </div>
                <div className="border border-amber-200 dark:border-amber-800 rounded-lg overflow-hidden bg-amber-50/30 dark:bg-amber-950/10">
                  {visibleProvisions.map((concept) => (
                    <ConceptRow key={concept.code} concept={concept} data={data} />
                  ))}
                </div>
              </div>
            )}

            {/* ── Deducciones ── */}
            {visibleDeductions.length > 0 && (
              <div>
                <SectionHeader
                  color="red"
                  label="Deducciones"
                  count={visibleDeductions.length}
                  total={data.deductions?.deductions_total ?? 0}
                  tooltip={<PayrollTooltip conceptKey="total_deductions" color="bg-red-600" />}
                />
                <div className="border border-red-200 dark:border-red-800 rounded-lg overflow-hidden bg-red-50/30 dark:bg-red-950/10">
                  {visibleDeductions.map((concept) => (
                    <ConceptRow key={concept.code} concept={concept} data={data} />
                  ))}
                </div>
              </div>
            )}

            {/* ── Parafiscales ── */}
            {visibleParafiscals.length > 0 && (
              <div>
                <SectionHeader
                  color="purple"
                  label="Parafiscales - Costos Patronales"
                  count={visibleParafiscals.length}
                  total={data.employer_contributions?.total_employer_contributions ?? 0}
                  tooltip={<PayrollTooltip conceptKey="employer_contributions" color="bg-blue-600" />}
                />
                <div className="p-2 mb-1">
                  <p className="text-xs text-purple-700 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/20 rounded p-2">
                    Costos adicionales a cargo del empleador. No afectan el neto a pagar del empleado.
                  </p>
                </div>
                <div className="border border-purple-200 dark:border-purple-800 rounded-lg overflow-hidden bg-purple-50/30 dark:bg-purple-950/10">
                  {visibleParafiscals.map((concept) => (
                    <ConceptRow key={concept.code} concept={concept} data={data} />
                  ))}
                </div>
              </div>
            )}

            {/* ── Net Salary Card ── */}
            <div className="border-2 border-indigo-300 dark:border-indigo-700 rounded-lg p-4 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-950/30 text-center">
              <p className="text-sm text-muted-foreground">Neto a Pagar al Empleado</p>
              <FormattedNumber
                value={detail.net_salary ?? 0}
                type="currency"
                className="text-3xl font-bold text-indigo-700 dark:text-indigo-300"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Devengado - Deducciones
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <AlertTriangle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">Sin datos de calculo disponibles</p>
            <p className="text-xs text-muted-foreground mt-1">
              Ejecute el calculo de la liquidacion para ver el desglose de conceptos.
            </p>
          </div>
        )}

        {/* Collapsible Metadata */}
        {data?.metadata && (
          <Collapsible open={metadataOpen} onOpenChange={setMetadataOpen}>
            <CollapsibleTrigger asChild>
              <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                <CardHeader className="py-2 px-4">
                  <CardTitle className="text-sm flex items-center justify-between">
                    Parametros del Calculo
                    <ChevronDown className={`h-4 w-4 transition-transform ${metadataOpen ? 'rotate-180' : ''}`} />
                  </CardTitle>
                </CardHeader>
              </Card>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <Card className="border-t-0 rounded-t-none">
                <CardContent className="py-3 px-4 space-y-4">
                  {/* Row 1: General parameters */}
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-3 text-xs">
                    <div>
                      <span className="flex items-center gap-1 text-muted-foreground">IBC<PayrollTooltip conceptKey="ibc" color="bg-slate-600" /></span>
                      <FormattedNumber value={data.metadata.ibc} type="currency" className="font-medium block" />
                    </div>
                    <div>
                      <span className="flex items-center gap-1 text-muted-foreground">Tipo Salario<PayrollTooltip conceptKey="salary_type" color="bg-slate-600" /></span>
                      <p className="font-medium">{data.metadata.salary_type}</p>
                    </div>
                    <div>
                      <span className="flex items-center gap-1 text-muted-foreground">SMLV<PayrollTooltip conceptKey="smlv" color="bg-slate-600" /></span>
                      <FormattedNumber value={data.metadata.smlv} type="currency" className="font-medium block" />
                    </div>
                    <div>
                      <span className="flex items-center gap-1 text-muted-foreground">UVT<PayrollTooltip conceptKey="uvt" color="bg-slate-600" /></span>
                      <FormattedNumber value={data.metadata.uvt_value} type="currency" className="font-medium block" />
                    </div>
                    <div>
                      <span className="flex items-center gap-1 text-muted-foreground">Lim. Transporte<PayrollTooltip conceptKey="transportation_limit" color="bg-slate-600" /></span>
                      <FormattedNumber value={data.metadata.transportation_limit} type="currency" className="font-medium block" />
                    </div>
                    <div>
                      <span className="flex items-center gap-1 text-muted-foreground">Exoneracion<PayrollTooltip conceptKey="exoneration" color="bg-slate-600" /></span>
                      <p className="font-medium">{data.metadata.exoneration_applied ? 'Si' : 'No'}</p>
                    </div>
                  </div>

                  {/* Row 2: Worker type & subtype */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      Tipo de Trabajador
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      <div>
                        <span className="text-muted-foreground">Tipo Cotizante</span>
                        <p className="font-medium">
                          {WORKER_TYPE_LABELS[detail.employee_worker_type_code ?? ''] ?? detail.employee_worker_type_code ?? 'Dependiente'}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Subtipo</span>
                        <p className="font-medium">
                          {WORKER_SUBTYPE_LABELS[detail.employee_worker_subtype_code ?? ''] ?? detail.employee_worker_subtype_code ?? 'No Aplica'}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Cod. Tipo</span>
                        <p className="font-medium font-mono">{detail.employee_worker_type_code ?? '1'}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Cod. Subtipo</span>
                        <p className="font-medium font-mono">{detail.employee_worker_subtype_code ?? '1'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Row 3: Actual rates used */}
                  {(data.metadata.eps_rate !== undefined || data.metadata.arl_rate !== undefined) && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                        <Info className="h-3 w-3" />
                        Tasas Aplicadas
                      </p>
                      <div className="grid grid-cols-3 md:grid-cols-6 gap-3 text-xs">
                        <div>
                          <span className="text-muted-foreground">EPS Empleado</span>
                          {(data.metadata.eps_rate != null ? data.metadata.eps_rate : 4) === 0
                            ? <p className="font-medium">No aplica</p>
                            : <FormattedNumber value={(data.metadata.eps_rate ?? 4) / 100} type="percent" className="font-medium block" />
                          }
                        </div>
                        <div>
                          <span className="text-muted-foreground">Pension Empleado</span>
                          {(data.metadata.pension_rate != null ? data.metadata.pension_rate : 4) === 0
                            ? <p className="font-medium">No aplica</p>
                            : <FormattedNumber value={(data.metadata.pension_rate ?? 4) / 100} type="percent" className="font-medium block" />
                          }
                        </div>
                        <div>
                          <span className="text-muted-foreground">Salud Empleador</span>
                          <FormattedNumber value={(data.metadata.employer_health_rate ?? 8.5) / 100} type="percent" className="font-medium block" />
                        </div>
                        <div>
                          <span className="text-muted-foreground">Pension Empleador</span>
                          <FormattedNumber value={(data.metadata.employer_pension_rate ?? 12) / 100} type="percent" className="font-medium block" />
                        </div>
                        <div>
                          <span className="text-muted-foreground">ARL</span>
                          {(detail.employee_arl_rate ?? data.metadata.arl_rate) != null
                            ? <FormattedNumber value={(detail.employee_arl_rate ?? data.metadata.arl_rate ?? 0) / 100} type="percent" className="font-medium block" />
                            : <p className="font-medium">-</p>
                          }
                        </div>
                        <div>
                          <span className="text-muted-foreground">Administrativo</span>
                          <p className="font-medium">{detail.employee_is_administrative ? 'Si' : 'No'}</p>
                        </div>
                      </div>
                      {/* Special worker type alert */}
                      {['4', '6', '9'].includes(detail.employee_worker_type_code ?? '') && (
                        <div className="mt-2 p-2 rounded bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                          <p className="text-[11px] text-amber-700 dark:text-amber-400">
                            <strong>Trabajador especial</strong> — Las tasas de seguridad social pueden diferir del estándar segun el tipo de cotizante ({WORKER_TYPE_LABELS[detail.employee_worker_type_code!]}).
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>
        )}
      </TooltipProvider>
      </DialogContent>
    </Dialog>
  );
}
