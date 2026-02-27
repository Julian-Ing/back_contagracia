'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent } from '@/shared/components/ui/card';
import { FormattedNumber } from '@/shared/components/ui/formatted-number';
import { Badge } from '@/shared/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/shared/components/ui/collapsible';
import { ChevronDown, User, Loader2, TrendingUp, TrendingDown, Building2, PiggyBank } from 'lucide-react';
import { TooltipProvider } from '@/shared/components/ui/tooltip';
import { PayrollTooltip } from '../PayrollTooltip';
import { payrollSettlementsService } from '../../../services/payroll-settlements.service';
import { SETTLEMENT_STATUS_COLORS, SETTLEMENT_STATUS_LABELS } from '../../../types';
import type {
  PayrollSettlementDetailSummary,
  PayrollSettlementDetail,
  PayrollData,
  SettlementStatus,
} from '../../../types';

interface EmployeeConceptsDetailProps {
  settlementId: string;
  details: PayrollSettlementDetailSummary[];
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

// ── Row component ──────────────────────────────────────────────────────────────

function ConceptRow({ label, value, isTotal, totalColor }: {
  label: string;
  value: number;
  isTotal?: boolean;
  totalColor?: string;
}) {
  if (isTotal) {
    return (
      <div className={`flex items-center justify-between px-4 py-2.5 font-semibold border-t-2 border-border bg-muted/40 ${totalColor ?? ''}`}>
        <span className="text-sm">{label}</span>
        <FormattedNumber value={value} type="currency" className="text-sm" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 last:border-b-0 hover:bg-muted/20 transition-colors">
      <span className="text-sm text-foreground/80">{label}</span>
      <FormattedNumber value={value} type="currency" className="text-sm font-medium tabular-nums" />
    </div>
  );
}

// ── Section wrapper ────────────────────────────────────────────────────────────

function SectionBox({ title, icon, color, children, tooltip }: {
  title: string;
  icon: React.ReactNode;
  color: string;
  children: React.ReactNode;
  tooltip?: React.ReactNode;
}) {
  const borderColor = {
    green: 'border-green-500/30 dark:border-green-500/20',
    red: 'border-red-500/30 dark:border-red-500/20',
    purple: 'border-purple-500/30 dark:border-purple-500/20',
    amber: 'border-amber-500/30 dark:border-amber-500/20',
  }[color] ?? 'border-border';

  const headerBg = {
    green: 'bg-green-500/10 dark:bg-green-500/5',
    red: 'bg-red-500/10 dark:bg-red-500/5',
    purple: 'bg-purple-500/10 dark:bg-purple-500/5',
    amber: 'bg-amber-500/10 dark:bg-amber-500/5',
  }[color] ?? 'bg-muted/30';

  const textColor = {
    green: 'text-green-700 dark:text-green-400',
    red: 'text-red-700 dark:text-red-400',
    purple: 'text-purple-700 dark:text-purple-400',
    amber: 'text-amber-700 dark:text-amber-400',
  }[color] ?? 'text-foreground';

  return (
    <div className={`rounded-lg border ${borderColor} overflow-hidden bg-card`}>
      {/* Section header */}
      <div className={`flex items-center gap-2 px-4 py-2.5 ${headerBg} border-b ${borderColor}`}>
        <span className={textColor}>{icon}</span>
        <span className={`flex items-center gap-1 text-xs font-bold uppercase tracking-wider ${textColor}`}>{title}{tooltip}</span>
      </div>
      {/* Column headers */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-muted/20 border-b border-border/50 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
        <span>Concepto</span>
        <span>Valor</span>
      </div>
      {/* Rows */}
      {children}
    </div>
  );
}

// ── Section tables ─────────────────────────────────────────────────────────────

function AccruedSection({ data }: { data: PayrollData }) {
  const acc = data.accrued;
  const rows: { label: string; value: number }[] = [];

  // Salary
  rows.push({ label: `Salario (${acc.worked_days} dias)`, value: acc.salary });

  // Transport
  if (acc.transportation_allowance > 0) {
    rows.push({ label: 'Auxilio de Transporte', value: acc.transportation_allowance });
  }

  // Overtime
  for (const [key, label] of Object.entries(OVERTIME_LABELS)) {
    const entries = (acc as any)[key] as any[] | undefined;
    if (entries?.length) {
      for (const e of entries) {
        rows.push({ label: `${label} (${e.quantity}h)`, value: e.payment });
      }
    }
  }

  // Vacation entries
  if (acc.vacation_entries?.length) {
    for (const v of acc.vacation_entries) {
      const leaveLabel = v.leave_type === 'VACATION_MONETIZED' ? 'Vacaciones Compensadas' : 'Vacaciones';
      rows.push({ label: `${leaveLabel} (${v.days} dias)`, value: v.amount });
    }
  }

  // Additional income
  if (acc.bonuses > 0) rows.push({ label: 'Bonificaciones', value: acc.bonuses });
  if (acc.aids > 0) rows.push({ label: 'Auxilios', value: acc.aids });
  if (acc.commissions > 0) rows.push({ label: 'Comisiones', value: acc.commissions });
  if (acc.other_income > 0) rows.push({ label: 'Otros Ingresos', value: acc.other_income });

  // Other concepts
  if (acc.other_concepts?.length) {
    for (const c of acc.other_concepts) {
      rows.push({ label: c.concept_name, value: c.amount });
    }
  }

  return (
    <SectionBox title="Devengados" icon={<TrendingUp className="h-3.5 w-3.5" />} color="green" tooltip={<PayrollTooltip conceptKey="total_accrued" color="bg-emerald-600" />}>
      {rows.map((r, i) => (
        <ConceptRow key={i} label={r.label} value={r.value} />
      ))}
      <ConceptRow label="Total Devengados" value={acc.accrued_total} isTotal totalColor="text-green-700 dark:text-green-400" />
    </SectionBox>
  );
}

function DeductionsSection({ data }: { data: PayrollData }) {
  const ded = data.deductions;
  const rows: { label: string; value: number }[] = [
    { label: 'EPS (Salud)', value: ded.eps_deduction },
    { label: 'Pension', value: ded.pension_deduction },
  ];

  if (ded.fondosp_deduction_SP > 0) {
    rows.push({ label: 'Fondo Solidaridad Pensional', value: ded.fondosp_deduction_SP });
  }
  if (ded.withholding_at_source > 0) {
    rows.push({ label: 'Retencion en la Fuente', value: ded.withholding_at_source });
  }
  if (ded.other_deductions?.length) {
    for (const d of ded.other_deductions) {
      rows.push({ label: d.concept_name, value: d.amount });
    }
  }

  return (
    <SectionBox title="Deducciones" icon={<TrendingDown className="h-3.5 w-3.5" />} color="red" tooltip={<PayrollTooltip conceptKey="total_deductions" color="bg-red-600" />}>
      {rows.map((r, i) => (
        <ConceptRow key={i} label={r.label} value={r.value} />
      ))}
      <ConceptRow label="Total Deducciones" value={ded.deductions_total} isTotal totalColor="text-red-700 dark:text-red-400" />
    </SectionBox>
  );
}

function EmployerSection({ data }: { data: PayrollData }) {
  const emp = data.employer_contributions;
  const rows = [
    { label: 'Salud Patronal', value: emp.employer_health },
    { label: 'Pension Patronal', value: emp.employer_pension },
    { label: 'ARL', value: emp.arl },
    { label: 'Caja Compensacion', value: emp.ccf },
    { label: 'ICBF', value: emp.icbf },
    { label: 'SENA', value: emp.sena },
  ];

  return (
    <SectionBox title="Aportes Patronales" icon={<Building2 className="h-3.5 w-3.5" />} color="purple" tooltip={<PayrollTooltip conceptKey="employer_contributions" color="bg-blue-600" />}>
      {rows.map((r, i) => (
        <ConceptRow key={i} label={r.label} value={r.value} />
      ))}
      <ConceptRow label="Total Aportes" value={emp.total_employer_contributions} isTotal totalColor="text-purple-700 dark:text-purple-400" />
    </SectionBox>
  );
}

function ProvisionsSection({ data }: { data: PayrollData }) {
  const prov = data.provisions;
  const rows = [
    { label: 'Vacaciones', value: prov.vacation_provision },
    { label: 'Cesantias', value: prov.severance_provision },
    { label: 'Intereses Cesantias', value: prov.severance_interest_provision },
    { label: 'Prima de Servicios', value: prov.service_bonus_provision },
  ];

  return (
    <SectionBox title="Provisiones" icon={<PiggyBank className="h-3.5 w-3.5" />} color="amber" tooltip={<PayrollTooltip conceptKey="total_provisions" color="bg-purple-600" />}>
      {rows.map((r, i) => (
        <ConceptRow key={i} label={r.label} value={r.value} />
      ))}
      <ConceptRow label="Total Provisiones" value={prov.total_provisions} isTotal totalColor="text-amber-700 dark:text-amber-400" />
    </SectionBox>
  );
}

// ── Metadata bar ───────────────────────────────────────────────────────────────

function MetadataBar({ data }: { data: PayrollData }) {
  const meta = data.metadata;
  if (!meta) return null;

  const items = [
    { label: 'IBC', value: meta.ibc, isCurrency: true, tooltipKey: 'ibc' },
    { label: 'Tipo Salario', value: meta.salary_type, isCurrency: false, tooltipKey: 'salary_type' },
    { label: 'SMLV', value: meta.smlv, isCurrency: true, tooltipKey: 'smlv' },
    { label: 'UVT', value: meta.uvt_value, isCurrency: true, tooltipKey: 'uvt' },
    { label: 'Exonerado', value: meta.exoneration_applied ? 'Si' : 'No', isCurrency: false, tooltipKey: 'exoneration' },
  ];

  return (
    <div className="flex flex-wrap items-center gap-3 px-1 py-2">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1 font-medium">{item.label}<PayrollTooltip conceptKey={item.tooltipKey} color="bg-slate-600" />:</span>
          {item.isCurrency ? (
            <FormattedNumber value={item.value as number} type="currency" className="font-semibold text-foreground/70" />
          ) : (
            <span className="font-semibold text-foreground/70">{item.value}</span>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Net salary card ────────────────────────────────────────────────────────────

function NetSalaryBar({ detail }: { detail: PayrollSettlementDetail }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 rounded-lg border-2 border-indigo-500/30 dark:border-indigo-500/20 bg-indigo-500/5 dark:bg-indigo-500/5">
      <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-400">Neto a Pagar</span>
      <FormattedNumber value={detail.net_salary ?? 0} type="currency" className="text-lg font-bold text-indigo-700 dark:text-indigo-300" />
    </div>
  );
}

// ── Employee Row (collapsible) ────────────────────────────────────────────────

function EmployeeRow({ detail, settlementId }: { detail: PayrollSettlementDetailSummary; settlementId: string }) {
  const [open, setOpen] = useState(false);
  const [fullDetail, setFullDetail] = useState<PayrollSettlementDetail | null>(null);
  const [loading, setLoading] = useState(false);

  const initials = (detail.employee_name ?? '?')
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  const handleToggle = useCallback(async (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && !fullDetail) {
      setLoading(true);
      try {
        const data = await payrollSettlementsService.getDetail(settlementId, detail.id);
        setFullDetail(data);
      } catch {
        // silently fail, user can try again
      } finally {
        setLoading(false);
      }
    }
  }, [fullDetail, settlementId, detail.id]);

  const payrollData = fullDetail?.payroll_data ?? null;

  return (
    <Collapsible open={open} onOpenChange={handleToggle}>
      <CollapsibleTrigger asChild>
        <Card className="cursor-pointer hover:bg-muted/30 transition-colors">
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-xs shrink-0">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold truncate">{detail.employee_name}</span>
                  <Badge className={`text-[10px] ${SETTLEMENT_STATUS_COLORS[detail.status as SettlementStatus]}`}>
                    {SETTLEMENT_STATUS_LABELS[detail.status as SettlementStatus] ?? detail.status}
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground">
                  {detail.employee_document} · {detail.employee_position ?? '-'}
                </span>
              </div>
              <div className="flex items-center gap-4 text-right shrink-0">
                <div>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">Devengado<PayrollTooltip conceptKey="total_accrued" color="bg-emerald-600" /></span>
                  <FormattedNumber value={detail.total_accrued} type="currency" className="text-sm font-medium text-green-700 dark:text-green-400" />
                </div>
                <div>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">Deducciones<PayrollTooltip conceptKey="total_deductions" color="bg-red-600" /></span>
                  <FormattedNumber value={detail.total_deductions} type="currency" className="text-sm font-medium text-red-700 dark:text-red-400" />
                </div>
                <div>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">Neto<PayrollTooltip conceptKey="net_salary" color="bg-indigo-600" /></span>
                  <FormattedNumber value={detail.net_salary} type="currency" className="text-sm font-bold text-indigo-700 dark:text-indigo-300" />
                </div>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <Card className="border-t-0 rounded-t-none -mt-1">
          <CardContent className="py-4 px-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
              </div>
            ) : payrollData ? (
              <div className="space-y-4">
                {/* 2x2 grid: Devengados/Deducciones + Aportes/Provisiones */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <AccruedSection data={payrollData} />
                  <DeductionsSection data={payrollData} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <EmployerSection data={payrollData} />
                  <ProvisionsSection data={payrollData} />
                </div>

                {/* Net salary */}
                {fullDetail && <NetSalaryBar detail={fullDetail} />}

                {/* Metadata */}
                <MetadataBar data={payrollData} />
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-6">Sin datos de calculo disponibles</p>
            )}
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function EmployeeConceptsDetail({ settlementId, details }: EmployeeConceptsDetailProps) {
  if (details.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <User className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p>No hay empleados en esta liquidacion.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-2">
        {details.map((detail) => (
          <EmployeeRow key={detail.id} detail={detail} settlementId={settlementId} />
        ))}
      </div>
    </TooltipProvider>
  );
}
