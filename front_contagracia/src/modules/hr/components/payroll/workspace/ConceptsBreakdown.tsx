'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { FormattedNumber } from '@/shared/components/ui/formatted-number';
import { Badge } from '@/shared/components/ui/badge';
import { BarChart3, TrendingDown, Building2, PiggyBank } from 'lucide-react';
import { TooltipProvider } from '@/shared/components/ui/tooltip';
import { PayrollTooltip } from '../PayrollTooltip';
import type { PayrollSettlement, PayrollSettlementDetailSummary, PayrollData } from '../../../types';

interface ConceptsBreakdownProps {
  settlement: PayrollSettlement;
  details: PayrollSettlementDetailSummary[];
}

interface ConceptRow {
  name: string;
  code?: string;
  employeeCount: number;
  total: number;
}

const OVERTIME_LABELS: Record<string, string> = {
  HEDs: 'Hora Extra Diurna (25%)',
  HENs: 'Hora Extra Nocturna (75%)',
  HEDDFs: 'Hora Extra Diurna Dom/Fest (100%)',
  HENDFs: 'Hora Extra Nocturna Dom/Fest (150%)',
  HRNs: 'Recargo Nocturno (35%)',
  HRDDFs: 'Recargo Diurno Dom/Fest (75%)',
  HRNDFs: 'Recargo Nocturno Dom/Fest (110%)',
};

/** Maps concept row names to PayrollTooltip keys and colors */
const CONCEPT_TOOLTIP_MAP: Record<string, { key: string; color: string }> = {
  'Salario Base': { key: 'salary', color: 'bg-emerald-600' },
  'Auxilio de Transporte': { key: 'transportation_allowance', color: 'bg-emerald-600' },
  'Hora Extra Diurna (25%)': { key: 'HED', color: 'bg-emerald-600' },
  'Hora Extra Nocturna (75%)': { key: 'HEN', color: 'bg-emerald-600' },
  'Hora Extra Diurna Dom/Fest (100%)': { key: 'HEDDF', color: 'bg-emerald-600' },
  'Hora Extra Nocturna Dom/Fest (150%)': { key: 'HENDF', color: 'bg-emerald-600' },
  'Recargo Nocturno (35%)': { key: 'HRN', color: 'bg-emerald-600' },
  'Recargo Diurno Dom/Fest (75%)': { key: 'HRDDF', color: 'bg-emerald-600' },
  'Recargo Nocturno Dom/Fest (110%)': { key: 'HRNDF', color: 'bg-emerald-600' },
  'Salud (EPS)': { key: 'eps_deduction', color: 'bg-red-600' },
  'Pension': { key: 'pension_deduction', color: 'bg-red-600' },
  'Fondo Solidaridad Pensional': { key: 'fondosp_deduction_SP', color: 'bg-red-600' },
  'Retencion en la Fuente': { key: 'withholding_at_source', color: 'bg-red-600' },
  'Salud Patronal': { key: 'employer_health', color: 'bg-blue-600' },
  'Pension Patronal': { key: 'employer_pension', color: 'bg-blue-600' },
  'ARL': { key: 'arl', color: 'bg-blue-600' },
  'Caja Compensacion': { key: 'ccf', color: 'bg-blue-600' },
  'ICBF': { key: 'icbf', color: 'bg-blue-600' },
  'SENA': { key: 'sena', color: 'bg-blue-600' },
  'Provision Vacaciones': { key: 'vacation_provision', color: 'bg-purple-600' },
  'Provision Cesantias': { key: 'severance_provision', color: 'bg-purple-600' },
  'Provision Intereses Cesantias': { key: 'severance_interest_provision', color: 'bg-purple-600' },
  'Provision Prima': { key: 'service_bonus_provision', color: 'bg-purple-600' },
};

function aggregatePayrollData(details: PayrollSettlementDetailSummary[]) {
  const accrued: ConceptRow[] = [];
  const deductions: ConceptRow[] = [];
  const employer: ConceptRow[] = [];
  const provisions: ConceptRow[] = [];

  const accSalary = { name: 'Salario Base', employeeCount: 0, total: 0 };
  const accTransport = { name: 'Auxilio de Transporte', employeeCount: 0, total: 0 };
  const overtimeAgg: Record<string, ConceptRow> = {};
  const otherAccruedAgg: Record<string, ConceptRow> = {};

  const dedEps = { name: 'Salud (EPS)', code: '4%', employeeCount: 0, total: 0 };
  const dedPension = { name: 'Pension', code: '4%', employeeCount: 0, total: 0 };
  const dedFsp = { name: 'Fondo Solidaridad Pensional', code: '1%', employeeCount: 0, total: 0 };
  const dedWithholding = { name: 'Retencion en la Fuente', employeeCount: 0, total: 0 };
  const otherDedAgg: Record<string, ConceptRow> = {};

  const empHealth = { name: 'Salud Patronal', code: '8.5%', employeeCount: 0, total: 0 };
  const empPension = { name: 'Pension Patronal', code: '12%', employeeCount: 0, total: 0 };
  const empArl = { name: 'ARL', employeeCount: 0, total: 0 };
  const empCcf = { name: 'Caja Compensacion', code: '4%', employeeCount: 0, total: 0 };
  const empIcbf = { name: 'ICBF', code: '3%', employeeCount: 0, total: 0 };
  const empSena = { name: 'SENA', code: '2%', employeeCount: 0, total: 0 };

  const provVacation = { name: 'Provision Vacaciones', code: '4.17%', employeeCount: 0, total: 0 };
  const provSeverance = { name: 'Provision Cesantias', code: '8.33%', employeeCount: 0, total: 0 };
  const provInterest = { name: 'Provision Intereses Cesantias', code: '1%', employeeCount: 0, total: 0 };
  const provBonus = { name: 'Provision Prima', code: '8.33%', employeeCount: 0, total: 0 };

  for (const d of details) {
    const pd = d.payroll_data as PayrollData | null;
    if (!pd) continue;

    const { accrued: acc, deductions: ded, employer_contributions: emp, provisions: prov } = pd;

    // Accrued
    if (acc.salary > 0) { accSalary.employeeCount++; accSalary.total += acc.salary; }
    if (acc.transportation_allowance > 0) { accTransport.employeeCount++; accTransport.total += acc.transportation_allowance; }

    for (const otKey of Object.keys(OVERTIME_LABELS) as (keyof typeof OVERTIME_LABELS)[]) {
      const entries = (acc as any)[otKey] as any[] | undefined;
      if (entries && entries.length > 0) {
        if (!overtimeAgg[otKey]) overtimeAgg[otKey] = { name: OVERTIME_LABELS[otKey], employeeCount: 0, total: 0 };
        overtimeAgg[otKey].employeeCount++;
        overtimeAgg[otKey].total += entries.reduce((s: number, e: any) => s + (e.payment || 0), 0);
      }
    }

    for (const oc of acc.other_concepts ?? []) {
      if (!otherAccruedAgg[oc.concept_code]) otherAccruedAgg[oc.concept_code] = { name: oc.concept_name, code: oc.concept_code, employeeCount: 0, total: 0 };
      otherAccruedAgg[oc.concept_code].employeeCount++;
      otherAccruedAgg[oc.concept_code].total += oc.amount;
    }

    // Deductions
    if (ded.eps_deduction > 0) { dedEps.employeeCount++; dedEps.total += ded.eps_deduction; }
    if (ded.pension_deduction > 0) { dedPension.employeeCount++; dedPension.total += ded.pension_deduction; }
    if (ded.fondosp_deduction_SP > 0) { dedFsp.employeeCount++; dedFsp.total += ded.fondosp_deduction_SP; }
    if (ded.withholding_at_source > 0) { dedWithholding.employeeCount++; dedWithholding.total += ded.withholding_at_source; }

    for (const od of ded.other_deductions ?? []) {
      if (!otherDedAgg[od.concept_code]) otherDedAgg[od.concept_code] = { name: od.concept_name, code: od.concept_code, employeeCount: 0, total: 0 };
      otherDedAgg[od.concept_code].employeeCount++;
      otherDedAgg[od.concept_code].total += od.amount;
    }

    // Employer
    if (emp.employer_health > 0) { empHealth.employeeCount++; empHealth.total += emp.employer_health; }
    if (emp.employer_pension > 0) { empPension.employeeCount++; empPension.total += emp.employer_pension; }
    if (emp.arl > 0) { empArl.employeeCount++; empArl.total += emp.arl; }
    if (emp.ccf > 0) { empCcf.employeeCount++; empCcf.total += emp.ccf; }
    if (emp.icbf > 0) { empIcbf.employeeCount++; empIcbf.total += emp.icbf; }
    if (emp.sena > 0) { empSena.employeeCount++; empSena.total += emp.sena; }

    // Provisions
    if (prov.vacation_provision > 0) { provVacation.employeeCount++; provVacation.total += prov.vacation_provision; }
    if (prov.severance_provision > 0) { provSeverance.employeeCount++; provSeverance.total += prov.severance_provision; }
    if (prov.severance_interest_provision > 0) { provInterest.employeeCount++; provInterest.total += prov.severance_interest_provision; }
    if (prov.service_bonus_provision > 0) { provBonus.employeeCount++; provBonus.total += prov.service_bonus_provision; }
  }

  // Build arrays filtering out zero items
  const push = (arr: ConceptRow[], item: ConceptRow) => { if (item.total > 0) arr.push(item); };

  push(accrued, accSalary);
  push(accrued, accTransport);
  Object.values(overtimeAgg).forEach((v) => push(accrued, v));
  Object.values(otherAccruedAgg).forEach((v) => push(accrued, v));

  push(deductions, dedEps);
  push(deductions, dedPension);
  push(deductions, dedFsp);
  push(deductions, dedWithholding);
  Object.values(otherDedAgg).forEach((v) => push(deductions, v));

  push(employer, empHealth);
  push(employer, empPension);
  push(employer, empArl);
  push(employer, empCcf);
  push(employer, empIcbf);
  push(employer, empSena);

  push(provisions, provVacation);
  push(provisions, provSeverance);
  push(provisions, provInterest);
  push(provisions, provBonus);

  return { accrued, deductions, employer, provisions };
}

function ConceptTable({ rows, colorClass }: { rows: ConceptRow[]; colorClass: string }) {
  const total = rows.reduce((s, r) => s + r.total, 0);

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">No hay conceptos en esta categoria.</p>;
  }

  return (
    <div className="space-y-1.5">
      {rows.map((row, i) => {
        const tooltip = CONCEPT_TOOLTIP_MAP[row.name];
        return (
          <div key={`${row.name}-${i}`} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-accent/40 transition-colors">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-medium flex items-center gap-1">
                {row.name}
                {tooltip && <PayrollTooltip conceptKey={tooltip.key} color={tooltip.color} />}
              </span>
              {row.code && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{row.code}</Badge>}
            </div>
            <div className="flex items-center gap-4 flex-shrink-0">
              <Badge variant="secondary" className="text-[10px]">{row.employeeCount} emp.</Badge>
              <FormattedNumber value={row.total} type="currency" className="text-sm font-semibold w-36 text-right" />
            </div>
          </div>
        );
      })}
      {/* Total row */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-muted dark:bg-muted/40 border border-border">
        <span className="text-sm font-bold uppercase">Total</span>
        <FormattedNumber value={total} type="currency" className={`text-sm font-bold w-36 text-right ${colorClass}`} />
      </div>
    </div>
  );
}

export function ConceptsBreakdown({ settlement, details }: ConceptsBreakdownProps) {
  const data = useMemo(() => aggregatePayrollData(details), [details]);

  if (settlement.status === 'DRAFT') {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p>El desglose de conceptos estara disponible despues de calcular la liquidacion.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5 text-indigo-500" />
            Desglose de Conceptos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="accrued">
            <TabsList className="mb-4">
              <TabsTrigger value="accrued" className="gap-1.5">
                <TrendingDown className="h-3.5 w-3.5 rotate-180" />
                Devengados ({data.accrued.length})
                <PayrollTooltip conceptKey="total_accrued" color="bg-emerald-600" />
              </TabsTrigger>
              <TabsTrigger value="deductions" className="gap-1.5">
                <TrendingDown className="h-3.5 w-3.5" />
                Deducciones ({data.deductions.length})
                <PayrollTooltip conceptKey="total_deductions" color="bg-red-600" />
              </TabsTrigger>
              <TabsTrigger value="employer" className="gap-1.5">
                <Building2 className="h-3.5 w-3.5" />
                Aportes ({data.employer.length})
                <PayrollTooltip conceptKey="employer_contributions" color="bg-blue-600" />
              </TabsTrigger>
              <TabsTrigger value="provisions" className="gap-1.5">
                <PiggyBank className="h-3.5 w-3.5" />
                Provisiones ({data.provisions.length})
                <PayrollTooltip conceptKey="total_provisions" color="bg-purple-600" />
              </TabsTrigger>
            </TabsList>

            <TabsContent value="accrued">
              <ConceptTable rows={data.accrued} colorClass="text-green-600 dark:text-green-400" />
            </TabsContent>
            <TabsContent value="deductions">
              <ConceptTable rows={data.deductions} colorClass="text-red-600 dark:text-red-400" />
            </TabsContent>
            <TabsContent value="employer">
              <ConceptTable rows={data.employer} colorClass="text-purple-600 dark:text-purple-400" />
            </TabsContent>
            <TabsContent value="provisions">
              <ConceptTable rows={data.provisions} colorClass="text-amber-600 dark:text-amber-400" />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
