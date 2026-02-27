'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { FormattedNumber } from '@/shared/components/ui/formatted-number';
import { Badge } from '@/shared/components/ui/badge';
import { DollarSign, Users, TrendingDown, Building2, PiggyBank, Briefcase } from 'lucide-react';
import { TooltipProvider } from '@/shared/components/ui/tooltip';
import { PayrollTooltip } from '../PayrollTooltip';
import { SETTLEMENT_TYPE_LABELS } from '../../../types';
import type {
  PayrollSettlement,
  PayrollSettlementDetailSummary,
  SettlementType,
} from '../../../types';

interface SettlementSummaryEnhancedProps {
  settlement: PayrollSettlement;
  details: PayrollSettlementDetailSummary[];
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  colorClass,
  highlighted,
  tooltip,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  colorClass: string;
  highlighted?: boolean;
  tooltip?: React.ReactNode;
}) {
  return (
    <Card className={highlighted ? 'bg-indigo-50 dark:bg-indigo-950 border-indigo-200 dark:border-indigo-800' : ''}>
      <CardContent className="py-4 px-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Icon className={`h-4 w-4 ${colorClass.replace('text-', 'text-')}`} />
          <span className="flex items-center gap-1">{label}{tooltip}</span>
        </div>
        <FormattedNumber
          value={value}
          type="currency"
          className={`text-xl font-bold ${highlighted ? 'text-indigo-700 dark:text-indigo-300' : colorClass}`}
        />
      </CardContent>
    </Card>
  );
}

function RegularSummary({ settlement, details }: SettlementSummaryEnhancedProps) {
  const directPayment = (settlement.total_accrued ?? 0) - (settlement.total_deductions ?? 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard icon={DollarSign} label="Pago Directo" value={directPayment} colorClass="text-green-700 dark:text-green-400" highlighted tooltip={<PayrollTooltip conceptKey="total_accrued" color="bg-emerald-600" />} />
        <SummaryCard icon={TrendingDown} label="Deducciones" value={settlement.total_deductions ?? 0} colorClass="text-red-700 dark:text-red-400" tooltip={<PayrollTooltip conceptKey="total_deductions" color="bg-red-600" />} />
        <SummaryCard icon={Building2} label="Aportes Patronales" value={settlement.total_employer_contributions ?? 0} colorClass="text-purple-700 dark:text-purple-400" tooltip={<PayrollTooltip conceptKey="employer_contributions" color="bg-blue-600" />} />
        <SummaryCard icon={PiggyBank} label="Provisiones" value={settlement.total_provisions ?? 0} colorClass="text-amber-700 dark:text-amber-400" tooltip={<PayrollTooltip conceptKey="total_provisions" color="bg-purple-600" />} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="py-2 px-4 flex items-center justify-between">
            <span className="flex items-center gap-1 text-sm text-muted-foreground">Total Devengado<PayrollTooltip conceptKey="total_accrued" color="bg-emerald-600" /></span>
            <FormattedNumber value={settlement.total_accrued ?? 0} type="currency" className="text-sm font-semibold text-green-600 dark:text-green-400" />
          </CardContent>
        </Card>
        <Card className="bg-indigo-50 dark:bg-indigo-950 border-indigo-200 dark:border-indigo-800">
          <CardContent className="py-2 px-4 flex items-center justify-between">
            <span className="flex items-center gap-1 text-sm text-muted-foreground">Neto Total<PayrollTooltip conceptKey="net_salary" color="bg-indigo-600" /></span>
            <FormattedNumber value={settlement.total_net_salary ?? 0} type="currency" className="text-sm font-bold text-indigo-700 dark:text-indigo-300" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-2 px-4 flex items-center justify-between">
            <span className="flex items-center gap-1 text-sm text-muted-foreground">Costo Total<PayrollTooltip conceptKey="total_cost" color="bg-indigo-600" /></span>
            <FormattedNumber value={settlement.total_payroll_cost ?? 0} type="currency" className="text-sm font-semibold text-orange-600 dark:text-orange-400" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SpecialLiquidationSummary({ settlement, details }: SettlementSummaryEnhancedProps) {
  const typeLabel = SETTLEMENT_TYPE_LABELS[settlement.settlement_type as SettlementType] ?? settlement.settlement_type;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <SummaryCard icon={DollarSign} label={`Total ${typeLabel}`} value={settlement.total_net_salary ?? 0} colorClass="text-green-700 dark:text-green-400" highlighted tooltip={<PayrollTooltip conceptKey={settlement.settlement_type === 'PRIMA' ? 'prima' : settlement.settlement_type === 'CESANTIAS' ? 'cesantias' : settlement.settlement_type === 'VACACIONES' ? 'vacaciones_liquidation' : 'terminacion'} color="bg-amber-600" />} />
        <SummaryCard icon={Users} label="Empleados Incluidos" value={settlement.total_employees} colorClass="text-blue-700 dark:text-blue-400" />
        <SummaryCard icon={Building2} label="Costo Total Empresa" value={settlement.total_payroll_cost ?? 0} colorClass="text-orange-700 dark:text-orange-400" tooltip={<PayrollTooltip conceptKey="total_cost" color="bg-indigo-600" />} />
      </div>
      {details.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Resumen por Empleado
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empleado</TableHead>
                  <TableHead className="text-right w-32">Salario Base</TableHead>
                  <TableHead className="text-center w-20">Dias</TableHead>
                  <TableHead className="text-right w-32">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {details.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>
                      <div>
                        <span className="text-sm font-medium">{d.employee_name}</span>
                        <span className="text-xs text-muted-foreground ml-2">{d.employee_document}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <FormattedNumber value={d.employee_base_salary} type="currency" className="text-sm" />
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{d.days_worked}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <FormattedNumber value={d.net_salary} type="currency" className="text-sm font-semibold" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function TerminationSummary({ settlement, details }: SettlementSummaryEnhancedProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard icon={DollarSign} label="Nomina Ultimo Mes" value={settlement.total_accrued ?? 0} colorClass="text-green-700 dark:text-green-400" tooltip={<PayrollTooltip conceptKey="total_accrued" color="bg-emerald-600" />} />
        <SummaryCard icon={TrendingDown} label="Deducciones" value={settlement.total_deductions ?? 0} colorClass="text-red-700 dark:text-red-400" tooltip={<PayrollTooltip conceptKey="total_deductions" color="bg-red-600" />} />
        <SummaryCard icon={PiggyBank} label="Prestaciones Sociales" value={settlement.total_provisions ?? 0} colorClass="text-amber-700 dark:text-amber-400" tooltip={<PayrollTooltip conceptKey="total_provisions" color="bg-purple-600" />} />
        <SummaryCard icon={DollarSign} label="Total a Pagar" value={settlement.total_net_salary ?? 0} colorClass="text-indigo-700 dark:text-indigo-300" highlighted tooltip={<PayrollTooltip conceptKey="net_salary" color="bg-indigo-600" />} />
      </div>
      {details.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              Detalle Terminacion
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empleado</TableHead>
                  <TableHead className="text-right w-28">Devengado</TableHead>
                  <TableHead className="text-right w-28">Deducciones</TableHead>
                  <TableHead className="text-right w-28">Provisiones</TableHead>
                  <TableHead className="text-right w-28">Neto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {details.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>
                      <span className="text-sm font-medium">{d.employee_name}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <FormattedNumber value={d.total_accrued} type="currency" className="text-sm" />
                    </TableCell>
                    <TableCell className="text-right">
                      <FormattedNumber value={d.total_deductions} type="currency" className="text-sm text-red-600 dark:text-red-400" />
                    </TableCell>
                    <TableCell className="text-right">
                      <FormattedNumber value={d.total_provisions} type="currency" className="text-sm" />
                    </TableCell>
                    <TableCell className="text-right">
                      <FormattedNumber value={d.net_salary} type="currency" className="text-sm font-bold" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function SettlementSummaryEnhanced({ settlement, details }: SettlementSummaryEnhancedProps) {
  if (settlement.status === 'DRAFT') {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <DollarSign className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p>El resumen estara disponible despues de calcular la liquidacion.</p>
        </CardContent>
      </Card>
    );
  }

  const content = (() => {
    switch (settlement.settlement_type) {
      case 'TERMINACION':
        return <TerminationSummary settlement={settlement} details={details} />;
      case 'PRIMA':
      case 'CESANTIAS':
      case 'VACACIONES':
        return <SpecialLiquidationSummary settlement={settlement} details={details} />;
      default:
        return <RegularSummary settlement={settlement} details={details} />;
    }
  })();

  return (
    <TooltipProvider delayDuration={200}>
      {content}
    </TooltipProvider>
  );
}
