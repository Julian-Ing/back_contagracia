'use client';

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import {
  DollarSign,
  TrendingDown,
  Building2,
  PiggyBank,
  Users,
  Calculator,
  CheckCircle,
  XCircle,
  UserPlus,
  MoreHorizontal,
  RefreshCw,
  Trash2,
  Loader2,
  ArrowLeft,
  Eye,
} from 'lucide-react';
import { FormattedNumber } from '@/shared/components/ui/formatted-number';
import { payrollSettlementsService } from '../../services/payroll-settlements.service';
import {
  SETTLEMENT_STATUS_COLORS,
  SETTLEMENT_STATUS_LABELS,
  SETTLEMENT_TYPE_LABELS,
} from '../../types';
import type {
  PayrollSettlement,
  PayrollSettlementDetail as DetailType,
  PayrollSettlementDetailSummary,
  SettlementStatus,
  SettlementType,
} from '../../types';
import { EmployeePayrollDetailEnhanced } from './EmployeePayrollDetailEnhanced';
import { AddEmployeesModal } from './AddEmployeesModal';
import toast from 'react-hot-toast';

interface SettlementDetailProps {
  settlement: PayrollSettlement;
  canEdit: boolean;
  canCalculate: boolean;
  canApprove: boolean;
  canVoid: boolean;
  canDelete: boolean;
  onBack: () => void;
  onRefresh: () => void;
  onCalculate: () => void;
  onApprove: () => void;
  onVoid: () => void;
  onDelete: () => void;
}

export function SettlementDetail({
  settlement,
  canEdit,
  canCalculate,
  canApprove,
  canVoid,
  canDelete,
  onBack,
  onRefresh,
  onCalculate,
  onApprove,
  onVoid,
  onDelete,
}: SettlementDetailProps) {
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<DetailType | null>(null);
  const [showAddEmployees, setShowAddEmployees] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const isDraft = settlement.status === 'DRAFT';
  const isCalculated = settlement.status === 'CALCULATED';
  const isCancelled = settlement.status === 'CANCELLED';

  const details = settlement.details ?? [];
  const existingEmployeeIds = details.map((d) => d.third_party_id);

  const handleViewDetail = useCallback(async (detail: PayrollSettlementDetailSummary) => {
    setLoadingDetail(true);
    try {
      const fullDetail = await payrollSettlementsService.getDetail(settlement.id, detail.id);
      setSelectedDetail(fullDetail);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al cargar detalle');
    } finally {
      setLoadingDetail(false);
    }
  }, [settlement.id]);

  const handleRecalculate = useCallback(async (detail: PayrollSettlementDetailSummary) => {
    setLoadingAction(detail.id);
    try {
      await payrollSettlementsService.recalculateEmployee(settlement.id, detail.id);
      toast.success(`Recalculado: ${detail.employee_name}`);
      onRefresh();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al recalcular');
    } finally {
      setLoadingAction(null);
    }
  }, [settlement.id, onRefresh]);

  const handleRemoveEmployee = useCallback(async (detail: PayrollSettlementDetailSummary) => {
    setLoadingAction(detail.id);
    try {
      await payrollSettlementsService.removeEmployee(settlement.id, detail.id);
      toast.success(`Empleado eliminado: ${detail.employee_name}`);
      onRefresh();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al eliminar empleado');
    } finally {
      setLoadingAction(null);
    }
  }, [settlement.id, onRefresh]);

  const handleAddAll = useCallback(async () => {
    setLoadingAction('add-all');
    try {
      const result = await payrollSettlementsService.addAllEmployees(settlement.id);
      toast.success(`${result.added} empleados agregados`);
      onRefresh();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al agregar empleados');
    } finally {
      setLoadingAction(null);
    }
  }, [settlement.id, onRefresh]);

  const handleAddEmployeesSuccess = useCallback(() => {
    setShowAddEmployees(false);
    onRefresh();
  }, [onRefresh]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold">{settlement.settlement_name}</h2>
              <Badge className={SETTLEMENT_STATUS_COLORS[settlement.status as SettlementStatus]}>
                {SETTLEMENT_STATUS_LABELS[settlement.status as SettlementStatus] ?? settlement.status}
              </Badge>
              <Badge variant="outline">
                {SETTLEMENT_TYPE_LABELS[settlement.settlement_type as SettlementType] ?? settlement.settlement_type}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {settlement.settlement_number ? `#${settlement.settlement_number} | ` : ''}
              Periodo {settlement.month}/{settlement.year} - Q{settlement.period_number}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isDraft && canEdit && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddAll}
                disabled={loadingAction === 'add-all'}
              >
                {loadingAction === 'add-all' ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Users className="h-4 w-4 mr-1" />
                )}
                Agregar Todos
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddEmployees(true)}
              >
                <UserPlus className="h-4 w-4 mr-1" />
                Agregar Empleados
              </Button>
            </>
          )}
          {isDraft && canCalculate && details.length > 0 && (
            <Button size="sm" onClick={onCalculate}>
              <Calculator className="h-4 w-4 mr-1" />
              Calcular
            </Button>
          )}
          {isCalculated && canApprove && (
            <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={onApprove}>
              <CheckCircle className="h-4 w-4 mr-1" />
              Aprobar
            </Button>
          )}
          {!isCancelled && canVoid && settlement.status !== 'DRAFT' && (
            <Button size="sm" variant="destructive" onClick={onVoid}>
              <XCircle className="h-4 w-4 mr-1" />
              Anular
            </Button>
          )}
          {isDraft && canDelete && (
            <Button size="sm" variant="destructive" onClick={onDelete}>
              <Trash2 className="h-4 w-4 mr-1" />
              Eliminar
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <DollarSign className="h-4 w-4 text-green-600" />
              Total Devengado
            </div>
            <p className="text-lg font-bold text-green-700 dark:text-green-400"><FormattedNumber value={settlement.total_accrued ?? 0} type="currency" /></p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingDown className="h-4 w-4 text-red-600" />
              Total Deducciones
            </div>
            <p className="text-lg font-bold text-red-700 dark:text-red-400"><FormattedNumber value={settlement.total_deductions ?? 0} type="currency" /></p>
          </CardContent>
        </Card>
        <Card className="bg-indigo-50 dark:bg-indigo-950 border-indigo-200 dark:border-indigo-800">
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <DollarSign className="h-4 w-4 text-indigo-600" />
              Salario Neto
            </div>
            <p className="text-lg font-bold text-indigo-700 dark:text-indigo-300"><FormattedNumber value={settlement.total_net_salary ?? 0} type="currency" /></p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="h-4 w-4 text-orange-600" />
              Costo Total
            </div>
            <p className="text-lg font-bold text-orange-700 dark:text-orange-400"><FormattedNumber value={settlement.total_payroll_cost ?? 0} type="currency" /></p>
          </CardContent>
        </Card>
      </div>

      {/* Additional totals row */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="py-2 px-4 flex items-center justify-between">
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Building2 className="h-3 w-3" /> Aportes Patronales
            </span>
            <span className="text-sm font-semibold"><FormattedNumber value={settlement.total_employer_contributions ?? 0} type="currency" /></span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-2 px-4 flex items-center justify-between">
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <PiggyBank className="h-3 w-3" /> Provisiones
            </span>
            <span className="text-sm font-semibold"><FormattedNumber value={settlement.total_provisions ?? 0} type="currency" /></span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-2 px-4 flex items-center justify-between">
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Users className="h-3 w-3" /> Empleados
            </span>
            <span className="text-sm font-semibold">{settlement.total_employees}</span>
          </CardContent>
        </Card>
      </div>

      {/* Employees Table */}
      {details.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p>No hay empleados en esta liquidacion.</p>
          {isDraft && canEdit && (
            <p className="text-sm mt-1">Agrega empleados para comenzar el calculo.</p>
          )}
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empleado</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead className="text-right">Salario Base</TableHead>
                <TableHead className="text-right">Devengado</TableHead>
                <TableHead className="text-right">Deducciones</TableHead>
                <TableHead className="text-right">Neto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {details.map((detail) => (
                <TableRow
                  key={detail.id}
                  className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                  onClick={() => handleViewDetail(detail)}
                >
                  <TableCell className="font-medium">{detail.employee_name}</TableCell>
                  <TableCell>{detail.employee_document ?? '-'}</TableCell>
                  <TableCell>{detail.employee_position ?? '-'}</TableCell>
                  <TableCell className="text-right"><FormattedNumber value={detail.employee_base_salary ?? 0} type="currency" /></TableCell>
                  <TableCell className="text-right text-green-700 dark:text-green-400">
                    <FormattedNumber value={detail.total_accrued ?? 0} type="currency" />
                  </TableCell>
                  <TableCell className="text-right text-red-700 dark:text-red-400">
                    <FormattedNumber value={detail.total_deductions ?? 0} type="currency" />
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    <FormattedNumber value={detail.net_salary ?? 0} type="currency" />
                  </TableCell>
                  <TableCell>
                    <Badge className={`text-xs ${SETTLEMENT_STATUS_COLORS[detail.status as SettlementStatus]}`}>
                      {SETTLEMENT_STATUS_LABELS[detail.status as SettlementStatus] ?? detail.status}
                    </Badge>
                    {detail.error_message && (
                      <p className="text-xs text-red-500 mt-1 truncate max-w-[120px]" title={detail.error_message}>
                        {detail.error_message}
                      </p>
                    )}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          {loadingAction === detail.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <MoreHorizontal className="h-4 w-4" />
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewDetail(detail)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Ver Detalle
                        </DropdownMenuItem>
                        {(isDraft || isCalculated) && canCalculate && (
                          <DropdownMenuItem onClick={() => handleRecalculate(detail)}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Recalcular
                          </DropdownMenuItem>
                        )}
                        {isDraft && canEdit && (
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => handleRemoveEmployee(detail)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Eliminar
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Loading overlay for detail */}
      {loadingDetail && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600" />
            <span>Cargando detalle...</span>
          </div>
        </div>
      )}

      {/* Employee Payroll Detail Modal */}
      {selectedDetail && (
        <EmployeePayrollDetailEnhanced
          detail={selectedDetail}
          open={!!selectedDetail}
          onClose={() => setSelectedDetail(null)}
        />
      )}

      {/* Add Employees Modal */}
      <AddEmployeesModal
        open={showAddEmployees}
        onClose={() => setShowAddEmployees(false)}
        settlementId={settlement.id}
        existingEmployeeIds={existingEmployeeIds}
        onSuccess={handleAddEmployeesSuccess}
      />
    </div>
  );
}
