'use client';

import { useState, useMemo } from 'react';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Select } from '@/shared/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import {
  MoreHorizontal,
  Eye,
  Calculator,
  CheckCircle,
  XCircle,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Search,
  DollarSign,
  Users,
  ArrowRight,
} from 'lucide-react';
import { FormattedNumber } from '@/shared/components/ui/formatted-number';
import { usePayrollSettlements } from '../../hooks/usePayrollSettlements';
import {
  SETTLEMENT_STATUS_COLORS,
  SETTLEMENT_STATUS_LABELS,
  SETTLEMENT_TYPE_LABELS,
} from '../../types';
import type { PayrollSettlement, SettlementStatus, SettlementType } from '../../types';

const MONTH_LABELS: Record<number, string> = {
  1: 'Enero', 2: 'Febrero', 3: 'Marzo', 4: 'Abril',
  5: 'Mayo', 6: 'Junio', 7: 'Julio', 8: 'Agosto',
  9: 'Septiembre', 10: 'Octubre', 11: 'Noviembre', 12: 'Diciembre',
};

interface SettlementsListEnhancedProps {
  canEdit: boolean;
  canCalculate: boolean;
  canApprove: boolean;
  canVoid: boolean;
  canDelete: boolean;
  onNavigate: (id: string) => void;
  onCalculate: (settlement: PayrollSettlement) => void;
  onApprove: (settlement: PayrollSettlement) => void;
  onVoid: (settlement: PayrollSettlement) => void;
  onDelete: (settlement: PayrollSettlement) => void;
}

export function SettlementsListEnhanced({
  canEdit,
  canCalculate,
  canApprove,
  canVoid,
  canDelete,
  onNavigate,
  onCalculate,
  onApprove,
  onVoid,
  onDelete,
}: SettlementsListEnhancedProps) {
  const {
    settlements,
    total,
    page,
    totalPages,
    loading,
    error,
    setPage,
    setStatusFilter,
    setTypeFilter,
    setYearFilter,
    setMonthFilter,
  } = usePayrollSettlements();

  const [search, setSearch] = useState('');

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const filteredSettlements = useMemo(() => {
    if (!search.trim()) return settlements;
    const term = search.toLowerCase();
    return settlements.filter((s) =>
      s.settlement_name.toLowerCase().includes(term),
    );
  }, [settlements, search]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Liquidaciones ({total})</CardTitle>
          </div>

          {/* Search + Filters row */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px] max-w-[300px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>

            <Select
              className="w-[130px]"
              placeholder="Estado"
              onChange={(v) => setStatusFilter(v === 'ALL' ? undefined : v as SettlementStatus)}
              options={[
                { value: 'ALL', label: 'Todos' },
                ...Object.entries(SETTLEMENT_STATUS_LABELS).map(([key, label]) => ({ value: key, label })),
              ]}
            />
            <Select
              className="w-[130px]"
              placeholder="Tipo"
              onChange={(v) => setTypeFilter(v === 'ALL' ? undefined : v as SettlementType)}
              options={[
                { value: 'ALL', label: 'Todos' },
                ...Object.entries(SETTLEMENT_TYPE_LABELS).map(([key, label]) => ({ value: key, label })),
              ]}
            />
            <Select
              className="w-[100px]"
              placeholder="Ano"
              onChange={(v) => setYearFilter(v === 'ALL' ? undefined : Number(v))}
              options={[
                { value: 'ALL', label: 'Todos' },
                ...years.map((y) => ({ value: String(y), label: String(y) })),
              ]}
            />
            <Select
              className="w-[120px]"
              placeholder="Mes"
              onChange={(v) => setMonthFilter(v === 'ALL' ? undefined : Number(v))}
              options={[
                { value: 'ALL', label: 'Todos' },
                ...Object.entries(MONTH_LABELS).map(([num, label]) => ({ value: num, label })),
              ]}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        ) : error ? (
          <p className="text-center text-red-500 py-8">{error}</p>
        ) : filteredSettlements.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">No se encontraron liquidaciones.</p>
        ) : (
          <>
            <div className="space-y-2">
              {filteredSettlements.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-4 p-3 rounded-lg border border-border hover:border-indigo-400/60 hover:bg-accent/50 cursor-pointer transition-colors"
                  onClick={() => onNavigate(s.id)}
                >
                  {/* Icon */}
                  <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-indigo-500" />
                  </div>

                  {/* Name + Type + Period */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{s.settlement_name}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {SETTLEMENT_TYPE_LABELS[s.settlement_type as SettlementType] ?? s.settlement_type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {MONTH_LABELS[s.month] ?? s.month}/{s.year} - Q{s.period_number}
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                        <Users className="h-3 w-3" />
                        {s.total_employees}
                      </span>
                    </div>
                  </div>

                  {/* Financial Summary */}
                  <div className="hidden md:flex items-center gap-4 text-right flex-shrink-0">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase">Devengado</p>
                      <p className="text-sm font-medium text-green-700 dark:text-green-400">
                        <FormattedNumber value={s.total_accrued ?? 0} type="currency" />
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase">Deducciones</p>
                      <p className="text-sm font-medium text-red-700 dark:text-red-400">
                        <FormattedNumber value={s.total_deductions ?? 0} type="currency" />
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase">Neto</p>
                      <p className="text-sm font-bold">
                        <FormattedNumber value={s.total_net_salary ?? 0} type="currency" />
                      </p>
                    </div>
                  </div>

                  {/* Status + Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge className={`text-[10px] ${SETTLEMENT_STATUS_COLORS[s.status as SettlementStatus]}`}>
                      {SETTLEMENT_STATUS_LABELS[s.status as SettlementStatus] ?? s.status}
                    </Badge>
                    <div onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onNavigate(s.id)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Ver Detalle
                          </DropdownMenuItem>
                          {s.status === 'DRAFT' && canCalculate && (
                            <DropdownMenuItem onClick={() => onCalculate(s)}>
                              <Calculator className="h-4 w-4 mr-2" />
                              Calcular
                            </DropdownMenuItem>
                          )}
                          {s.status === 'CALCULATED' && canApprove && (
                            <DropdownMenuItem onClick={() => onApprove(s)}>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Aprobar
                            </DropdownMenuItem>
                          )}
                          {s.status !== 'CANCELLED' && s.status !== 'DRAFT' && canVoid && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-600" onClick={() => onVoid(s)}>
                                <XCircle className="h-4 w-4 mr-2" />
                                Anular
                              </DropdownMenuItem>
                            </>
                          )}
                          {s.status === 'DRAFT' && canDelete && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-600" onClick={() => onDelete(s)}>
                                <Trash2 className="h-4 w-4 mr-2" />
                                Eliminar
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground hidden sm:block" />
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4">
                <p className="text-sm text-muted-foreground">
                  Pagina {page} de {totalPages} ({total} liquidaciones)
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPage(page - 1)} disabled={page <= 1}>
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Anterior
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setPage(page + 1)} disabled={page >= totalPages}>
                    Siguiente
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
