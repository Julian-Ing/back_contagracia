'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { FormattedNumber, useFormatNumber } from '@/shared/components/ui/formatted-number';
import { Select } from '@/shared/components/ui/select';
import {
  Search,
  Users,
  User,
  Calculator,
  RefreshCw,
  Loader2,
  UserPlus,
  Eye,
  Clock,
  AlertCircle,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/shared/components/ui/tooltip';
import {
  SETTLEMENT_STATUS_COLORS,
  SETTLEMENT_STATUS_LABELS,
} from '../../../types';
import type { PayrollSettlementDetailSummary, SettlementStatus, PayrollData } from '../../../types';

/** Mapping of TypeWorker IDs to short labels */
const WORKER_TYPE_SHORT: Record<string, string> = {
  '1': 'Dependiente',
  '2': 'Serv. doméstico',
  '3': 'Madre comunitaria',
  '4': 'Aprendiz SENA (Lect.)',
  '5': 'Func. público',
  '6': 'Aprendiz SENA (Prod.)',
  '7': 'Postgrado salud',
  '8': 'Profesor particular',
  '9': 'Estudiante (ARL)',
  '10': 'Rég. especial salud',
  '11': 'Cooperado',
  '12': 'Depend. SGP',
  '13': 'Tiempo parcial',
  '14': 'Pre-pensionado',
  '15': 'Pre-pensionado vol.',
  '16': 'Estudiante prácticas',
};

type StatusFilter = 'ALL' | 'DRAFT' | 'CALCULATED' | 'APPROVED';

interface WorkspaceEmployeeSectionProps {
  details: PayrollSettlementDetailSummary[];
  isDraft: boolean;
  isCalculated: boolean;
  canEdit: boolean;
  canCalculate: boolean;
  onViewDetail: (detail: PayrollSettlementDetailSummary) => void;
  onRecalculate: (detail: PayrollSettlementDetailSummary) => void;
  onAddEmployees: () => void;
  onOvertime?: (detail: PayrollSettlementDetailSummary) => void;
  onDaysWorkedChange?: (detailId: string, days: number) => void;
  loadingAction: string | null;
}

// Helper to sum array fields
function sumArr(arr: any[] | undefined, ...fields: string[]): number {
  if (!arr?.length) return 0;
  return arr.reduce((sum: number, item: any) => {
    let val = 0;
    for (const f of fields) val += Number(item[f]) || 0;
    return sum + val;
  }, 0);
}

function EmployeeCard({
  detail,
  isDraft: _isDraft,
  canEdit,
  canCalculate,
  onViewDetail,
  onRecalculate,
  onOvertime,
  onDaysWorkedChange,
  isLoading,
}: {
  detail: PayrollSettlementDetailSummary;
  isDraft: boolean;
  canEdit: boolean;
  canCalculate: boolean;
  onViewDetail: (d: PayrollSettlementDetailSummary) => void;
  onRecalculate: (d: PayrollSettlementDetailSummary) => void;
  onOvertime?: (d: PayrollSettlementDetailSummary) => void;
  onDaysWorkedChange?: (detailId: string, days: number) => void;
  isLoading: boolean;
}) {
  const { fmtCurrency, fmtPercent } = useFormatNumber();
  const detailIsDraft = detail.status === 'DRAFT';
  const detailIsCalculated = detail.status === 'CALCULATED';
  const detailIsApproved = detail.status === 'APPROVED';
  const canEditDays = (detailIsDraft || detailIsCalculated) && canEdit;
  const [localDays, setLocalDays] = useState<string>(String(detail.days_worked ?? 0));
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pd = detail.payroll_data as PayrollData | null;
  const hasCalculation = (detail.total_accrued ?? 0) > 0 || (detail.total_deductions ?? 0) > 0;

  // Count overtime hours
  const overtimeCount = useMemo(() => {
    if (!pd?.accrued) return 0;
    let count = 0;
    const acc = pd.accrued as any;
    for (const k of ['HEDs', 'HENs', 'HRNs', 'HEDDFs', 'HENDFs', 'HRDDFs', 'HRNDFs']) {
      count += (acc[k] as any[])?.length ?? 0;
    }
    return count;
  }, [pd]);

  // Sum overtime payment
  const overtimePayment = useMemo(() => {
    if (!pd?.accrued) return 0;
    let total = 0;
    const acc = pd.accrued as any;
    for (const k of ['HEDs', 'HENs', 'HRNs', 'HEDDFs', 'HENDFs', 'HRDDFs', 'HRNDFs']) {
      total += sumArr(acc[k], 'payment');
    }
    return total;
  }, [pd]);

  return (
    <Card className="overflow-hidden">
      {/* Card Header */}
      <CardHeader className="bg-muted/30 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Avatar */}
            <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center shrink-0">
              <User className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            {/* Info */}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-base font-bold text-foreground">
                  {detail.employee_name}
                </h4>
                <Badge
                  className={`text-xs ${SETTLEMENT_STATUS_COLORS[detail.status as SettlementStatus]}`}
                >
                  {SETTLEMENT_STATUS_LABELS[detail.status as SettlementStatus] ?? detail.status}
                </Badge>
                {pd?.metadata?.worker_type_code && pd.metadata.worker_type_code !== '1' && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700">
                    {WORKER_TYPE_SHORT[pd.metadata.worker_type_code] ?? `Tipo ${pd.metadata.worker_type_code}`}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {detail.employee_document ?? '-'}
                {detail.employee_position && ` · ${detail.employee_position}`}
                {pd?.metadata?.worker_type_code && (
                  <span className="text-xs text-muted-foreground/70"> · Tipo cotizante: {WORKER_TYPE_SHORT[pd.metadata.worker_type_code] ?? pd.metadata.worker_type_code}</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Salary badge */}
            <Badge variant="secondary" className="text-sm px-3 py-1 font-semibold">
              <FormattedNumber value={detail.employee_base_salary ?? 0} type="currency" />
            </Badge>
          </div>
        </div>

        {/* Error message */}
        {detail.error_message && (
          <div className="mt-2 flex items-center gap-1 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded p-2">
            <AlertCircle className="h-3 w-3 flex-shrink-0" />
            <span>{detail.error_message}</span>
          </div>
        )}
      </CardHeader>

      {/* Card Content */}
      <CardContent className="p-6">
        {/* Days worked + Hours + Salary fields */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Dias Trabajados</label>
            <Input
              type="number"
              min={1}
              max={30}
              value={canEditDays ? localDays : (detail.days_worked ?? 0)}
              readOnly={!canEditDays}
              className="mt-1"
              onChange={(e) => {
                const val = e.target.value;
                setLocalDays(val);
                const num = parseInt(val, 10);
                if (num >= 1 && num <= 30 && onDaysWorkedChange) {
                  if (debounceRef.current) clearTimeout(debounceRef.current);
                  debounceRef.current = setTimeout(() => {
                    onDaysWorkedChange(detail.id, num);
                  }, 600);
                }
              }}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Rango: 1-30 dias
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Horas Trabajadas</label>
            <Input value={pd?.accrued?.worked_days ? (detail.days_worked ?? 0) * 8 : '-'} readOnly className="mt-1" />
            <p className="text-xs text-muted-foreground mt-1">Horas ordinarias</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Salario Proporcional</label>
            <Input
              value={pd?.accrued?.salary ? fmtCurrency(pd.accrued.salary) : '-'}
              readOnly
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Base: <FormattedNumber value={detail.employee_base_salary ?? 0} type="currency" /> ÷ 30 × {detail.days_worked ?? 0}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              <>
                {(detailIsDraft || detailIsCalculated) && onOvertime && (
                  <Button variant="outline" size="sm" onClick={() => onOvertime(detail)}>
                    <Clock className="h-4 w-4 mr-1" />
                    Horas extras
                  </Button>
                )}
                {detailIsDraft && canCalculate && (
                  <Button size="sm" onClick={() => onRecalculate(detail)}>
                    <Calculator className="h-4 w-4 mr-1" />
                    Calcular
                  </Button>
                )}
                {detailIsCalculated && canCalculate && (
                  <Button variant="outline" size="sm" onClick={() => onRecalculate(detail)}>
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Recalcular
                  </Button>
                )}
                {(detailIsCalculated || detailIsApproved) && (
                  <Button variant="outline" size="sm" onClick={() => onViewDetail(detail)}>
                    <Eye className="h-4 w-4 mr-1" />
                    Ver Detalle
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Mini summary cards - like horizont with data-rich tooltips */}
        {hasCalculation && (
          <TooltipProvider delayDuration={200}>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mt-6">
              {/* Salario Base */}
              <div className="p-3 bg-muted/50 rounded-lg">
                <span className="text-xs text-muted-foreground">Salario Base</span>
                <FormattedNumber
                  value={detail.employee_base_salary ?? 0}
                  type="currency"
                  className="text-lg font-bold block"
                />
              </div>

              {/* Provisiones - tooltip con desglose real */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="p-3 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg cursor-help">
                    <span className="text-xs text-purple-600 dark:text-purple-400">Provisiones</span>
                    <FormattedNumber
                      value={detail.total_provisions ?? 0}
                      type="currency"
                      className="text-lg font-bold text-purple-700 dark:text-purple-300 block"
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs p-0 border-0 shadow-xl z-50">
                  <div className="bg-white dark:bg-gray-900 rounded-lg border border-purple-200 dark:border-purple-800 overflow-hidden">
                    <div className="bg-purple-600 dark:bg-purple-700 px-3 py-1.5">
                      <span className="text-xs font-semibold text-white block">Provisiones de Prestaciones Sociales</span>
                    </div>
                    <div className="px-3 py-2 space-y-1.5">
                      <div>
                        <span className="text-[10px] text-muted-foreground block mb-1">Base: Salario + Aux. transporte</span>
                        <span className="text-[10px] font-medium block">
                          {fmtCurrency((pd?.accrued?.salary ?? 0) + (pd?.accrued?.transportation_allowance ?? 0))}
                        </span>
                      </div>
                      <div className="border-t pt-1.5 space-y-1">
                        <div className="flex justify-between">
                          <span className="text-xs text-muted-foreground">Cesantias ({fmtPercent((pd?.metadata?.severance_provision_rate ?? 8.33) / 100)})</span>
                          <span className="text-xs font-medium">{fmtCurrency(pd?.provisions?.severance_provision ?? 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-xs text-muted-foreground">Int. Cesantias ({fmtPercent((pd?.metadata?.severance_interest_provision_rate ?? 1) / 100)})</span>
                          <span className="text-xs font-medium">{fmtCurrency(pd?.provisions?.severance_interest_provision ?? 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-xs text-muted-foreground">Prima ({fmtPercent((pd?.metadata?.service_bonus_provision_rate ?? 8.33) / 100)})</span>
                          <span className="text-xs font-medium">{fmtCurrency(pd?.provisions?.service_bonus_provision ?? 0)}</span>
                        </div>
                      </div>
                      <div className="border-t pt-1.5">
                        <span className="text-[10px] text-muted-foreground block mb-1">Base: Solo salario (sin aux. transporte)</span>
                        <div className="flex justify-between">
                          <span className="text-xs text-muted-foreground">Vacaciones ({fmtPercent((pd?.metadata?.vacation_provision_rate ?? 4.17) / 100)})</span>
                          <span className="text-xs font-medium">{fmtCurrency(pd?.provisions?.vacation_provision ?? 0)}</span>
                        </div>
                      </div>
                      <span className="text-[9px] text-muted-foreground/70 pt-1 border-t block">Art. 249, 306 y 186 CST · Ley 1429/2010</span>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>

              {/* Devengado */}
              <div className="p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
                <span className="text-xs text-green-600 dark:text-green-400">Devengado</span>
                <FormattedNumber
                  value={detail.total_accrued ?? 0}
                  type="currency"
                  className="text-lg font-bold text-green-700 dark:text-green-300 block"
                />
              </div>

              {/* Deducciones - tooltip con desglose real */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg cursor-help">
                    <span className="text-xs text-red-600 dark:text-red-400">Deducciones</span>
                    <FormattedNumber
                      value={detail.total_deductions ?? 0}
                      type="currency"
                      className="text-lg font-bold text-red-700 dark:text-red-300 block"
                    />
                    {(pd?.metadata?.ibc ?? 0) > 0 && (
                      <span className="text-[10px] text-red-400 dark:text-red-500 mt-0.5 block">
                        IBC: {fmtCurrency(pd?.metadata?.ibc ?? 0)}
                      </span>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs p-0 border-0 shadow-xl z-50">
                  <div className="bg-white dark:bg-gray-900 rounded-lg border border-red-200 dark:border-red-800 overflow-hidden">
                    <div className="bg-red-600 dark:bg-red-700 px-3 py-1.5">
                      <span className="text-xs font-semibold text-white block">Base de Cotizacion (IBC)</span>
                    </div>
                    <div className="px-3 py-2 space-y-1.5">
                      {pd?.metadata?.worker_type_code && ['4', '6', '9'].includes(pd.metadata.worker_type_code) && (
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 block font-medium">
                          Trabajador especial (tipo {pd.metadata.worker_type_code}) — tasas ajustadas
                        </span>
                      )}
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">IBC</span>
                        <span className="text-sm font-bold text-red-700 dark:text-red-400">{fmtCurrency(pd?.metadata?.ibc ?? 0)}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground block">Salario + Horas Extras + Comisiones (sin aux. transporte)</span>
                      <div className="border-t pt-1.5 space-y-1">
                        {(pd?.deductions?.eps_deduction ?? 0) > 0 && (
                          <div className="flex justify-between">
                            <span className="text-xs text-muted-foreground">EPS ({fmtPercent((pd?.metadata?.eps_rate ?? 4) / 100)})</span>
                            <span className="text-xs font-medium">{fmtCurrency(pd?.deductions?.eps_deduction ?? 0)}</span>
                          </div>
                        )}
                        {(pd?.metadata?.eps_rate === 0) && (
                          <div className="flex justify-between">
                            <span className="text-xs text-muted-foreground/50">EPS — No aplica</span>
                          </div>
                        )}
                        {(pd?.deductions?.pension_deduction ?? 0) > 0 && (
                          <div className="flex justify-between">
                            <span className="text-xs text-muted-foreground">Pension ({fmtPercent((pd?.metadata?.pension_rate ?? 4) / 100)})</span>
                            <span className="text-xs font-medium">{fmtCurrency(pd?.deductions?.pension_deduction ?? 0)}</span>
                          </div>
                        )}
                        {(pd?.metadata?.pension_rate === 0) && (
                          <div className="flex justify-between">
                            <span className="text-xs text-muted-foreground/50">Pension — No aplica</span>
                          </div>
                        )}
                        {(pd?.deductions?.fondosp_deduction_SP ?? 0) > 0 && (
                          <div className="flex justify-between">
                            <span className="text-xs text-muted-foreground">FSP ({fmtPercent((pd?.metadata?.fsp_rate ?? 1) / 100)})</span>
                            <span className="text-xs font-medium">{fmtCurrency(pd?.deductions?.fondosp_deduction_SP ?? 0)}</span>
                          </div>
                        )}
                        {(pd?.deductions?.withholding_at_source ?? 0) > 0 && (
                          <div className="flex justify-between">
                            <span className="text-xs text-muted-foreground">Ret. Fuente</span>
                            <span className="text-xs font-medium">{fmtCurrency(pd?.deductions?.withholding_at_source ?? 0)}</span>
                          </div>
                        )}
                      </div>
                      <span className="text-[9px] text-muted-foreground/70 pt-1 border-t block">Art. 18 y 204 Ley 100/1993 · Decreto 780/2016</span>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>

              {/* Neto a Pagar */}
              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                <span className="text-xs text-blue-600 dark:text-blue-400">Neto a Pagar</span>
                <FormattedNumber
                  value={detail.net_salary ?? 0}
                  type="currency"
                  className="text-lg font-bold text-blue-700 dark:text-blue-300 block"
                />
              </div>

              {/* Horas Extras */}
              <div className="p-3 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg">
                <span className="text-xs text-orange-600 dark:text-orange-400">Horas Extras</span>
                <span className="text-lg font-bold text-orange-700 dark:text-orange-300 block">
                  {overtimeCount}h
                </span>
                {overtimePayment > 0 && (
                  <FormattedNumber
                    value={overtimePayment}
                    type="currency"
                    className="text-xs text-orange-600 dark:text-orange-400 block"
                  />
                )}
              </div>
            </div>
          </TooltipProvider>
        )}

        {/* Net salary card */}
        {hasCalculation && (
          <div className="mt-4 rounded-lg p-4 border-2 border-emerald-300 dark:border-emerald-700 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 text-center">
            <span className="text-sm text-muted-foreground">Neto a Pagar al Empleado</span>
            <FormattedNumber
              value={detail.net_salary ?? 0}
              type="currency"
              className="text-3xl font-bold text-emerald-700 dark:text-emerald-300 block"
            />
            <span className="text-xs text-muted-foreground mt-1 block">Devengado - Deducciones</span>
          </div>
        )}

      </CardContent>
    </Card>
  );
}

export function WorkspaceEmployeeSection({
  details,
  isDraft,
  isCalculated,
  canEdit,
  canCalculate,
  onViewDetail,
  onRecalculate,
  onAddEmployees,
  onOvertime,
  onDaysWorkedChange,
  loadingAction,
}: WorkspaceEmployeeSectionProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const { fmtCurrency } = useFormatNumber();

  const filteredDetails = useMemo(() => {
    let filtered = details;
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter((d) => d.status === statusFilter);
    }
    if (search.trim()) {
      const term = search.toLowerCase();
      filtered = filtered.filter(
        (d) =>
          (d.employee_name ?? '').toLowerCase().includes(term) ||
          (d.employee_document ?? '').toLowerCase().includes(term),
      );
    }
    return filtered;
  }, [details, search, statusFilter]);

  if (details.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>No hay empleados en esta liquidacion.</p>
            {isDraft && canEdit && (
              <>
                <p className="text-sm mt-1">Agrega empleados para comenzar el calculo.</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={onAddEmployees}>
                  <UserPlus className="h-4 w-4 mr-1" />
                  Agregar Empleados
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Gestion de Empleados</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Configure dias y horas trabajadas para cada empleado
            </p>
          </div>
          {(isDraft || isCalculated) && onOvertime && (
            <Button variant="outline" size="sm" onClick={() => onOvertime(details[0])}>
              <Clock className="h-4 w-4 mr-1" />
              Agregar Horas Extras
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search and filter */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o numero de identificacion..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">Estado</span>
            <Select
              value={statusFilter}
              onChange={(v) => setStatusFilter(v as StatusFilter)}
              options={[
                { value: 'ALL', label: 'Todos' },
                { value: 'DRAFT', label: 'Borrador' },
                { value: 'CALCULATED', label: 'Calculadas' },
                { value: 'APPROVED', label: 'Aprobadas' },
              ]}
              className="w-36"
            />
          </div>
        </div>

        {/* Employee count */}
        <p className="text-sm text-muted-foreground">
          Mostrando {filteredDetails.length} de {details.length} empleados
        </p>

        {/* Employee cards */}
        <div className="space-y-4">
          {filteredDetails.map((detail) => (
            <EmployeeCard
              key={detail.id}
              detail={detail}
              isDraft={isDraft}
              canEdit={canEdit}
              canCalculate={canCalculate}
              onViewDetail={onViewDetail}
              onRecalculate={onRecalculate}
              onOvertime={onOvertime}
              onDaysWorkedChange={onDaysWorkedChange}
              isLoading={loadingAction === detail.id}
            />
          ))}
        </div>

        {search && filteredDetails.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-4">
            No se encontraron empleados con &quot;{search}&quot;
          </p>
        )}
      </CardContent>
    </Card>
  );
}
