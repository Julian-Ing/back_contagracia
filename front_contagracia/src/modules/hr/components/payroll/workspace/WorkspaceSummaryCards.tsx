'use client';

import { useMemo } from 'react';
import { Card, CardContent } from '@/shared/components/ui/card';
import { FormattedNumber } from '@/shared/components/ui/formatted-number';
import { TrendingUp, TrendingDown, DollarSign, Building2, PiggyBank, Users } from 'lucide-react';
import { TooltipProvider } from '@/shared/components/ui/tooltip';
import { PayrollTooltip } from '../PayrollTooltip';
import type { PayrollSettlement, PayrollSettlementDetailSummary } from '../../../types';

interface WorkspaceSummaryCardsProps {
  settlement: PayrollSettlement;
  details?: PayrollSettlementDetailSummary[];
  variant?: 'compact' | 'full';
}

export function WorkspaceSummaryCards({ settlement, details, variant = 'compact' }: WorkspaceSummaryCardsProps) {
  const hasValues =
    (settlement.total_accrued ?? 0) > 0 ||
    (settlement.total_deductions ?? 0) > 0 ||
    (settlement.total_net_salary ?? 0) > 0 ||
    (settlement.total_payroll_cost ?? 0) > 0;

  // Count active concepts from payroll_data
  const conceptCounts = useMemo(() => {
    if (!details?.length) return { accrued: 0, deductions: 0 };
    let accruedSet = new Set<string>();
    let deductionSet = new Set<string>();

    for (const d of details) {
      const pd = (d as any).payroll_data;
      if (!pd) continue;
      const acc = pd.accrued;
      const ded = pd.deductions;

      if (acc?.salary > 0) accruedSet.add('salary');
      if (acc?.transportation_allowance > 0) accruedSet.add('transport');
      for (const k of ['HEDs', 'HENs', 'HRNs', 'HEDDFs', 'HENDFs', 'HRDDFs', 'HRNDFs']) {
        if ((acc?.[k] as any[])?.length > 0) accruedSet.add(k);
      }
      for (const oc of acc?.other_concepts ?? []) {
        accruedSet.add(oc.concept_code);
      }

      if (ded?.eps_deduction > 0) deductionSet.add('eps');
      if (ded?.pension_deduction > 0) deductionSet.add('pension');
      if (ded?.fondosp_deduction_SP > 0) deductionSet.add('fsp');
      if (ded?.withholding_at_source > 0) deductionSet.add('withholding');
      for (const od of ded?.other_deductions ?? []) {
        deductionSet.add(od.concept_code);
      }
    }

    return { accrued: accruedSet.size, deductions: deductionSet.size };
  }, [details]);

  if (!hasValues) return null;

  if (variant === 'compact') {
    // Step 2: Just 2 cards like horizont
    return (
      <TooltipProvider delayDuration={200}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                    Devengados
                    <PayrollTooltip conceptKey="total_accrued" color="bg-emerald-600" />
                  </p>
                  <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                    <FormattedNumber value={settlement.total_accrued ?? 0} type="currency" />
                  </p>
                  {conceptCounts.accrued > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {conceptCounts.accrued} conceptos activos
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-500">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                  <TrendingDown className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                    Deducciones
                    <PayrollTooltip conceptKey="total_deductions" color="bg-red-600" />
                  </p>
                  <p className="text-2xl font-bold text-red-700 dark:text-red-400">
                    <FormattedNumber value={settlement.total_deductions ?? 0} type="currency" />
                  </p>
                  {conceptCounts.deductions > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {conceptCounts.deductions} conceptos activos
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </TooltipProvider>
    );
  }

  // Step 3: Full version — single card with all KPIs organized
  return (
    <TooltipProvider delayDuration={200}>
      <Card>
        <CardContent className="p-5">
          {/* Primary KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-lg border border-green-200 dark:border-green-900 bg-green-50/50 dark:bg-green-950/30 p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-green-100 dark:bg-green-900/50 rounded-md">
                  <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  Devengados
                  <PayrollTooltip conceptKey="total_accrued" color="bg-emerald-600" />
                </span>
              </div>
              <FormattedNumber value={settlement.total_accrued ?? 0} type="currency" className="text-xl font-bold text-green-700 dark:text-green-400" />
            </div>

            <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/30 p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-red-100 dark:bg-red-900/50 rounded-md">
                  <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                </div>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  Deducciones
                  <PayrollTooltip conceptKey="total_deductions" color="bg-red-600" />
                </span>
              </div>
              <FormattedNumber value={settlement.total_deductions ?? 0} type="currency" className="text-xl font-bold text-red-700 dark:text-red-400" />
            </div>

            <div className="rounded-lg border border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/30 p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/50 rounded-md">
                  <DollarSign className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  Neto a Pagar
                  <PayrollTooltip conceptKey="net_salary" color="bg-indigo-600" />
                </span>
              </div>
              <FormattedNumber value={settlement.total_net_salary ?? 0} type="currency" className="text-xl font-bold text-indigo-700 dark:text-indigo-400" />
            </div>

            <div className="rounded-lg border border-orange-200 dark:border-orange-900 bg-orange-50/50 dark:bg-orange-950/30 p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-orange-100 dark:bg-orange-900/50 rounded-md">
                  <Building2 className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                </div>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  Costo Total
                  <PayrollTooltip conceptKey="total_cost" color="bg-indigo-600" />
                </span>
              </div>
              <FormattedNumber value={settlement.total_payroll_cost ?? 0} type="currency" className="text-xl font-bold text-orange-700 dark:text-orange-400" />
            </div>
          </div>

          {/* Secondary KPIs */}
          <div className="grid grid-cols-3 gap-3 mt-3">
            <div className="rounded-lg border border-border bg-muted/50 dark:bg-muted/20 px-4 py-3 flex items-center justify-between">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-purple-500" /> Aportes Patronales
                <PayrollTooltip conceptKey="employer_contributions" color="bg-blue-600" />
              </span>
              <FormattedNumber value={settlement.total_employer_contributions ?? 0} type="currency" className="text-sm font-semibold" />
            </div>
            <div className="rounded-lg border border-border bg-muted/50 dark:bg-muted/20 px-4 py-3 flex items-center justify-between">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <PiggyBank className="h-3.5 w-3.5 text-amber-500" /> Provisiones
                <PayrollTooltip conceptKey="total_provisions" color="bg-purple-600" />
              </span>
              <FormattedNumber value={settlement.total_provisions ?? 0} type="currency" className="text-sm font-semibold" />
            </div>
            <div className="rounded-lg border border-border bg-muted/50 dark:bg-muted/20 px-4 py-3 flex items-center justify-between">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-blue-500" /> Empleados
              </span>
              <span className="text-sm font-semibold">{settlement.total_employees}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
