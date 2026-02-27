'use client';

import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
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

interface SettlementsListProps {
  canEdit: boolean;
  canCalculate: boolean;
  canApprove: boolean;
  canVoid: boolean;
  canDelete: boolean;
  onView: (settlement: PayrollSettlement) => void;
  onCalculate: (settlement: PayrollSettlement) => void;
  onApprove: (settlement: PayrollSettlement) => void;
  onVoid: (settlement: PayrollSettlement) => void;
  onDelete: (settlement: PayrollSettlement) => void;
}

export function SettlementsList({
  canEdit,
  canCalculate,
  canApprove,
  canVoid,
  canDelete,
  onView,
  onCalculate,
  onApprove,
  onVoid,
  onDelete,
}: SettlementsListProps) {
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

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Liquidaciones ({total})</CardTitle>
          <div className="flex items-center gap-2">
            {/* Status filter */}
            <Select
              className="w-[140px]"
              placeholder="Estado"
              onChange={(v) => setStatusFilter(v === 'ALL' ? undefined : v as SettlementStatus)}
              options={[
                { value: 'ALL', label: 'Todos' },
                ...Object.entries(SETTLEMENT_STATUS_LABELS).map(([key, label]) => ({ value: key, label })),
              ]}
            />

            {/* Type filter */}
            <Select
              className="w-[140px]"
              placeholder="Tipo"
              onChange={(v) => setTypeFilter(v === 'ALL' ? undefined : v as SettlementType)}
              options={[
                { value: 'ALL', label: 'Todos' },
                ...Object.entries(SETTLEMENT_TYPE_LABELS).map(([key, label]) => ({ value: key, label })),
              ]}
            />

            {/* Year filter */}
            <Select
              className="w-[110px]"
              placeholder="Año"
              onChange={(v) => setYearFilter(v === 'ALL' ? undefined : Number(v))}
              options={[
                { value: 'ALL', label: 'Todos' },
                ...years.map((y) => ({ value: String(y), label: String(y) })),
              ]}
            />

            {/* Month filter */}
            <Select
              className="w-[130px]"
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
        ) : settlements.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">No se encontraron liquidaciones.</p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Periodo</TableHead>
                  <TableHead className="text-center">Empleados</TableHead>
                  <TableHead className="text-right">Devengado</TableHead>
                  <TableHead className="text-right">Deducciones</TableHead>
                  <TableHead className="text-right">Neto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {settlements.map((s) => (
                  <TableRow
                    key={s.id}
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                    onClick={() => onView(s)}
                  >
                    <TableCell className="font-medium">{s.settlement_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {SETTLEMENT_TYPE_LABELS[s.settlement_type as SettlementType] ?? s.settlement_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {MONTH_LABELS[s.month] ?? s.month}/{s.year} - Q{s.period_number}
                    </TableCell>
                    <TableCell className="text-center">{s.total_employees}</TableCell>
                    <TableCell className="text-right text-green-700 dark:text-green-400">
                      <FormattedNumber value={s.total_accrued ?? 0} type="currency" />
                    </TableCell>
                    <TableCell className="text-right text-red-700 dark:text-red-400">
                      <FormattedNumber value={s.total_deductions ?? 0} type="currency" />
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      <FormattedNumber value={s.total_net_salary ?? 0} type="currency" />
                    </TableCell>
                    <TableCell>
                      <Badge className={SETTLEMENT_STATUS_COLORS[s.status as SettlementStatus]}>
                        {SETTLEMENT_STATUS_LABELS[s.status as SettlementStatus] ?? s.status}
                      </Badge>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onView(s)}>
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4">
                <p className="text-sm text-muted-foreground">
                  Pagina {page} de {totalPages} ({total} liquidaciones)
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page - 1)}
                    disabled={page <= 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                    disabled={page >= totalPages}
                  >
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
