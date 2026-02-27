'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { FormattedNumber } from '@/shared/components/ui/formatted-number';
import {
  AsyncSearchableSelect,
  type LoadOptionsResult,
} from '@/shared/components/ui/async-searchable-select';
import { History, Loader2, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { employeesService } from '../../services/employees.service';
import { payrollSettlementsService } from '../../services/payroll-settlements.service';
import {
  SETTLEMENT_STATUS_COLORS,
  SETTLEMENT_STATUS_LABELS,
  SETTLEMENT_TYPE_LABELS,
} from '../../types';
import type {
  SettlementStatus,
  SettlementType,
  EmployeePayrollHistoryRecord,
} from '../../types';
import toast from 'react-hot-toast';

const MONTH_LABELS: Record<number, string> = {
  1: 'Ene', 2: 'Feb', 3: 'Mar', 4: 'Abr',
  5: 'May', 6: 'Jun', 7: 'Jul', 8: 'Ago',
  9: 'Sep', 10: 'Oct', 11: 'Nov', 12: 'Dic',
};

export function EmployeePayrollHistory() {
  const router = useRouter();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [selectedEmployeeLabel, setSelectedEmployeeLabel] = useState('');
  const [records, setRecords] = useState<EmployeePayrollHistoryRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);

  const loadOptions = useCallback(async (search: string, pageNum: number): Promise<LoadOptionsResult> => {
    const result = await employeesService.getAll({
      search: search || undefined,
      page: pageNum,
      limit: 20,
      status: 'ACTIVE' as any,
    });
    return {
      data: result.data.map((emp) => ({
        value: emp.id,
        label: emp.name || '',
        description: emp.identification_number ?? undefined,
      })),
      hasMore: pageNum < result.totalPages,
      total: result.total,
    };
  }, []);

  const loadHistory = useCallback(async (employeeId: string, pageNum: number) => {
    setLoading(true);
    try {
      const result = await payrollSettlementsService.getEmployeeHistory(employeeId, {
        page: pageNum,
        limit: 20,
      });
      setRecords(result.data);
      setTotal(result.total);
      setPage(result.page);
      setTotalPages(result.totalPages);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al cargar historial');
      setRecords([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedEmployeeId) {
      loadHistory(selectedEmployeeId, 1);
    } else {
      setRecords([]);
      setTotal(0);
      setPage(1);
      setTotalPages(0);
    }
  }, [selectedEmployeeId, loadHistory]);

  const handleEmployeeChange = useCallback((value: string, option?: { label: string }) => {
    setSelectedEmployeeId(value);
    setSelectedEmployeeLabel(option?.label ?? '');
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    if (selectedEmployeeId) {
      loadHistory(selectedEmployeeId, newPage);
    }
  }, [selectedEmployeeId, loadHistory]);

  const totals = useMemo(() => {
    return records.reduce(
      (acc, r) => ({
        accrued: acc.accrued + Number(r.total_accrued ?? 0),
        deductions: acc.deductions + Number(r.total_deductions ?? 0),
        net: acc.net + Number(r.net_salary ?? 0),
      }),
      { accrued: 0, deductions: 0, net: 0 },
    );
  }, [records]);

  return (
    <div className="space-y-4">
      {/* Employee Selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="h-5 w-5 text-indigo-500" />
            Seleccionar Empleado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AsyncSearchableSelect
            loadOptions={loadOptions}
            value={selectedEmployeeId}
            valueLabel={selectedEmployeeLabel}
            onChange={handleEmployeeChange}
            placeholder="Buscar por nombre o documento..."
            searchPlaceholder="Escriba nombre o documento..."
            emptyMessage="No se encontraron empleados"
            clearable
            className="max-w-md"
          />
        </CardContent>
      </Card>

      {/* History Table */}
      {selectedEmployeeId && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                Historial de Liquidaciones ({total})
              </CardTitle>
              {totalPages > 1 && (
                <div className="flex items-center gap-2 text-sm">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={page <= 1}
                    onClick={() => handlePageChange(page - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-muted-foreground">
                    {page} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={page >= totalPages}
                    onClick={() => handlePageChange(page + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
              </div>
            ) : records.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p>No se encontraron liquidaciones para este empleado.</p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Liquidacion</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Periodo</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Devengado</TableHead>
                      <TableHead className="text-right">Deducciones</TableHead>
                      <TableHead className="text-right">Neto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((record) => (
                      <TableRow
                        key={record.id}
                        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                        onClick={() => router.push(`/dashboard/payroll/settlements/${record.payroll_settlement.id}`)}
                      >
                        <TableCell className="font-medium">
                          {record.payroll_settlement.settlement_name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {SETTLEMENT_TYPE_LABELS[record.payroll_settlement.settlement_type as SettlementType] ?? record.payroll_settlement.settlement_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {MONTH_LABELS[record.payroll_settlement.month] ?? record.payroll_settlement.month}/{record.payroll_settlement.year} - Q{record.payroll_settlement.period_number}
                        </TableCell>
                        <TableCell>
                          <Badge className={SETTLEMENT_STATUS_COLORS[record.status as SettlementStatus]}>
                            {SETTLEMENT_STATUS_LABELS[record.status as SettlementStatus] ?? record.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-green-700 dark:text-green-400">
                          <FormattedNumber value={record.total_accrued ?? 0} type="currency" />
                        </TableCell>
                        <TableCell className="text-right text-red-700 dark:text-red-400">
                          <FormattedNumber value={record.total_deductions ?? 0} type="currency" />
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          <FormattedNumber value={record.net_salary ?? 0} type="currency" />
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Totals row */}
                    {records.length > 1 && (
                      <TableRow className="bg-gray-50 dark:bg-gray-800 font-semibold border-t-2">
                        <TableCell colSpan={4} className="text-right text-muted-foreground">
                          Total pagina
                        </TableCell>
                        <TableCell className="text-right text-green-700 dark:text-green-400">
                          <FormattedNumber value={totals.accrued} type="currency" />
                        </TableCell>
                        <TableCell className="text-right text-red-700 dark:text-red-400">
                          <FormattedNumber value={totals.deductions} type="currency" />
                        </TableCell>
                        <TableCell className="text-right">
                          <FormattedNumber value={totals.net} type="currency" />
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
